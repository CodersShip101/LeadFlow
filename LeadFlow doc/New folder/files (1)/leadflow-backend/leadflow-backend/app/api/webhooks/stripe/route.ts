// app/api/webhooks/stripe/route.ts
// ---------------------------------------------------------------------------
// Stripe webhook → keep profiles.plan in sync with the subscription.
// Set the endpoint in the Stripe dashboard and put the signing secret in
// STRIPE_WEBHOOK_SECRET. Uses the admin client because it writes across users
// and runs without a user session.
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
    return NextResponse.json({ error: `Webhook signature failed: ${err}` }, { status: 400 });
  }

  const admin = createAdminClient();

  const setPlanByCustomer = async (customerId: string, plan: 'free' | 'pro') => {
    await admin.from('profiles').update({ plan }).eq('stripe_customer_id', customerId);
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.customer) await setPlanByCustomer(s.customer as string, 'pro');
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === 'active' || sub.status === 'trialing';
      await setPlanByCustomer(sub.customer as string, active ? 'pro' : 'free');
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await setPlanByCustomer(sub.customer as string, 'free');
      break;
    }
  }

  return NextResponse.json({ received: true });
}

// Stripe needs the raw body — disable Next's body parsing for this route.
export const config = { api: { bodyParser: false } };
