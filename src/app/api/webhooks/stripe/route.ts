import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createAdminSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: `bad signature: ${err}` }, { status: 400 })
  }

  const admin = createAdminSupabase()

  const setProfilePlan = async (customerId: string, plan: 'free' | 'pro' | 'max') => {
    await admin.from('profiles').update({ subscription_status: plan }).eq('stripe_customer_id', customerId)
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session
      const tier = s.metadata?.tier
      const userId = s.metadata?.supabase_user_id
      const seats = Number(s.metadata?.seats ?? 1)
      const customerId = s.customer as string

      if (tier === 'team' && userId) {
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
          .single()
        if (org) {
          await admin
            .from('org_members')
            .upsert({ org_id: org.id, user_id: userId, role: 'admin' }, { onConflict: 'org_id,user_id' })
        }
        // Put the owner's profile on the team plan so the UI unlocks Team.
        await admin.from('profiles').update({ subscription_status: 'team' }).eq('id', userId)
      } else if (tier === 'pro' || tier === 'max') {
        await setProfilePlan(customerId, tier)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const active = sub.status === 'active' || sub.status === 'trialing'
      const customerId = sub.customer as string
      const qty = sub.items.data[0]?.quantity ?? 1

      const { data: org } = await admin
        .from('organizations')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle()

      if (org) {
        await admin.from('organizations').update({ seats: qty }).eq('id', org.id)
      } else {
        // Prefer the tier we stamped on the subscription at checkout; fall back
        // to the price nickname only if it's missing.
        const metaTier = sub.metadata?.tier
        const nick = sub.items.data[0]?.price?.nickname?.toLowerCase() ?? ''
        const plan = metaTier === 'max' || (!metaTier && nick.includes('max')) ? 'max' : 'pro'
        await setProfilePlan(customerId, active ? (plan as 'max' | 'pro') : 'free')
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      await setProfilePlan(customerId, 'free')
      break
    }
  }

  return NextResponse.json({ received: true })
}
