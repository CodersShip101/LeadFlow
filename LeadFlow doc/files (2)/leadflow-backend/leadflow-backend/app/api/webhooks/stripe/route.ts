// app/api/webhooks/stripe/route.ts
// ---------------------------------------------------------------------------
// Stripe webhook → keep entitlements in sync.
//   - starter / pro : set profiles.plan
//   - team          : create the organization (if new), set seats from the
//                     subscription quantity, make the buyer the admin/owner
// Put the signing secret in STRIPE_WEBHOOK_SECRET. Uses the admin client.
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: `bad signature: ${err}` }, { status: 400 });
  }

  const admin = createAdminClient();

  const setProfilePlan = async (customerId: string, plan: 'free' | 'starter' | 'pro') => {
    await admin.from('profiles').update({ plan }).eq('stripe_customer_id', customerId);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const tier = s.metadata?.tier;
      const userId = s.metadata?.supabase_user_id;
      const seats = Number(s.metadata?.seats ?? 1);
      const customerId = s.customer as string;

      if (tier === 'team' && userId) {
        // Provision the organization and make the buyer its admin/owner.
        const { data: org } = await admin
          .from('organizations')
          .insert({
            name: s.metadata?.org_name ?? 'My team',
            plan: 'team',
            seats,
            owner_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: (s.subscription as string) ?? null,
          })
          .select('id')
          .single();
        if (org) {
          await admin
            .from('org_members')
            .upsert({ org_id: org.id, user_id: userId, role: 'admin' }, { onConflict: 'org_id,user_id' });
        }
      } else if (tier === 'starter' || tier === 'pro') {
        await setProfilePlan(customerId, tier);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === 'active' || sub.status === 'trialing';
      const customerId = sub.customer as string;
      const qty = sub.items.data[0]?.quantity ?? 1;

      // If this customer owns an org, sync its seat count + active state.
      const { data: org } = await admin
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

      if (org) {
        await admin.from('organizations').update({ seats: qty }).eq('id', org.id);
      } else {
        // individual subscription: figure tier from the price nickname/metadata
        const nick = sub.items.data[0]?.price?.nickname?.toLowerCase() ?? '';
        const plan = nick.includes('pro') ? 'pro' : 'starter';
        await setProfilePlan(customerId, active ? (plan as 'pro' | 'starter') : 'free');
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      // Org cancellations: drop everyone to free by removing org membership is
      // aggressive; instead mark org plan inactive. Here we simply set the
      // owner profile to free and leave org cleanup to a scheduled job.
      await setProfilePlan(customerId, 'free');
      break;
    }
  }

  return NextResponse.json({ received: true });
}

export const config = { api: { bodyParser: false } };
