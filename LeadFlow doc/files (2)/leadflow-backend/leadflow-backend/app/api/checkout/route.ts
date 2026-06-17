// app/api/checkout/route.ts
// ---------------------------------------------------------------------------
// POST /api/checkout
//   body: { tier: 'starter'|'pro'|'team', cycle: 'monthly'|'annual', seats?: number }
// Creates a Stripe Checkout Session for the chosen paid tier.
//   - starter / pro : single subscription (quantity 1)
//   - team          : per-seat subscription (quantity = seats), creates an org
//                     on success via the webhook
//   - enterprise    : not self-serve — the UI routes to "contact sales"
// A 7-day trial is attached so "first 7 days free" is real (and, per the
// playbook, a credit card is still collected to qualify the lead).
// Requires: stripe
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Map (tier, cycle) -> Stripe price id. Set these in your env.
const PRICES: Record<string, string | undefined> = {
  'starter:monthly': process.env.STRIPE_PRICE_STARTER_MONTHLY,
  'starter:annual': process.env.STRIPE_PRICE_STARTER_ANNUAL,
  'pro:monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
  'pro:annual': process.env.STRIPE_PRICE_PRO_ANNUAL,
  'team:monthly': process.env.STRIPE_PRICE_TEAM_MONTHLY, // per-seat price
  'team:annual': process.env.STRIPE_PRICE_TEAM_ANNUAL, // per-seat price
};

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tier = body.tier as 'starter' | 'pro' | 'team';
  const cycle = (body.cycle as 'monthly' | 'annual') ?? 'monthly';
  const seats = Math.max(1, Math.min(200, Number(body.seats) || 1));

  if (!['starter', 'pro', 'team'].includes(tier)) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
  }
  const price = PRICES[`${tier}:${cycle}`];
  if (!price) return NextResponse.json({ error: 'price not configured' }, { status: 500 });

  // Reuse / create a Stripe customer.
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, full_name')
    .eq('id', user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id);
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!;
  const quantity = tier === 'team' ? seats : 1;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity }],
    subscription_data: { trial_period_days: 7 },
    allow_promotion_codes: true,
    // For team, allow the buyer to change seat quantity at checkout.
    ...(tier === 'team'
      ? { adjustable_quantity: undefined } // (set on the line_item below instead)
      : {}),
    success_url: `${origin}/dashboard/billing?upgraded=${tier}`,
    cancel_url: `${origin}/dashboard/billing`,
    metadata: {
      supabase_user_id: user.id,
      tier,
      seats: String(quantity),
      org_name: body.orgName ?? (profile?.full_name ? `${profile.full_name}'s team` : 'My team'),
    },
  });

  return NextResponse.json({ url: session.url });
}
