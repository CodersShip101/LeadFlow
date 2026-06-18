import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

const PRICES: Record<string, string | undefined> = {
  'pro:monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
  'pro:annual': process.env.STRIPE_PRICE_PRO_ANNUAL,
  'max:monthly': process.env.STRIPE_PRICE_MAX_MONTHLY,
  'max:annual': process.env.STRIPE_PRICE_MAX_ANNUAL,
  'team:monthly': process.env.STRIPE_PRICE_TEAM_MONTHLY,
  'team:annual': process.env.STRIPE_PRICE_TEAM_ANNUAL,
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tier = body.tier as 'pro' | 'max' | 'team'
  const cycle = (body.cycle as 'monthly' | 'annual') ?? 'monthly'
  const seats = Math.max(1, Math.min(200, Number(body.seats) || 1))
  const currency = ['GBP', 'USD', 'EUR'].includes(body.currency)
    ? (body.currency as string).toLowerCase()
    : undefined

  if (!['pro', 'max', 'team'].includes(tier)) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 400 })
  }
  const price = PRICES[`${tier}:${cycle}`]
  if (!price) return NextResponse.json({ error: 'price not configured' }, { status: 500 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, full_name')
    .eq('id', user.id)
    .single()

  let customerId = profile?.stripe_customer_id ?? undefined
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!
  const quantity = tier === 'team' ? seats : 1

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    // Requires the Price to have currency_options for this currency in Stripe.
    // If it doesn't, Stripe falls back to the price's base currency.
    ...(currency ? { currency } : {}),
    line_items: [{ price, quantity }],
    subscription_data: { trial_period_days: 7 },
    allow_promotion_codes: true,
    success_url: `${origin}/dashboard/billing?upgraded=${tier}`,
    cancel_url: `${origin}/dashboard/billing`,
    metadata: {
      supabase_user_id: user.id,
      tier,
      seats: String(quantity),
      org_name: body.orgName ?? (profile?.full_name ? `${profile.full_name}'s team` : 'My team'),
    },
  })

  return NextResponse.json({ url: session.url })
}
