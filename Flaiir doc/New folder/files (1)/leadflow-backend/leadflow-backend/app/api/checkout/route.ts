// app/api/checkout/route.ts
// ---------------------------------------------------------------------------
// POST /api/checkout  body: { cycle: 'monthly' | 'annual' }
// Creates a Stripe Checkout Session for the Pro plan and returns its URL.
// The annual option maps to a discounted price (the billing toggle in the UI).
// A 7-day trial is attached so the "first 7 days free" reassurance is real.
// Requires: stripe
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createServerClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE = {
  monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!, // £49/mo
  annual: process.env.STRIPE_PRICE_PRO_ANNUAL!, // £39/mo billed yearly
};

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { cycle = 'monthly' } = await req.json().catch(() => ({}));
  const price = PRICE[cycle as 'monthly' | 'annual'] ?? PRICE.monthly;

  // Reuse an existing Stripe customer if we have one.
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
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

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { trial_period_days: 7 }, // "first 7 days free"
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard/billing?upgraded=1`,
    cancel_url: `${origin}/dashboard/billing`,
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
