import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const MAX_SEATS = 200

// Change the number of seats on a team subscription. Admin only.
// Body: { seats: number }  (absolute target seat count)
//
// Stripe is the source of truth: we update the subscription item quantity with
// proration, then reflect it on the org immediately (the
// customer.subscription.updated webhook also syncs it). Can never drop below
// the seats currently in use (members + pending invites) — that's the #24 floor.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
    const org = orgRows?.[0]
    if (!org || org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const target = Math.floor(Number(body.seats))
    if (!Number.isFinite(target) || target < 1 || target > MAX_SEATS) {
      return NextResponse.json({ error: `seats must be 1–${MAX_SEATS}` }, { status: 400 })
    }

    const admin = createAdminSupabase()

    // Seats can't go below what's in use right now.
    const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
      admin.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id),
      admin.from('org_invites').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id).is('accepted_at', null),
    ])
    const inUse = (memberCount ?? 0) + (inviteCount ?? 0)
    if (target < inUse) {
      return NextResponse.json(
        { error: 'below_usage', message: `You have ${inUse} seats in use. Remove members or cancel invites first.` },
        { status: 409 },
      )
    }

    const { data: orgRow } = await admin
      .from('organizations').select('stripe_subscription_id').eq('id', org.org_id).single()
    const subId = orgRow?.stripe_subscription_id as string | undefined
    if (!subId) {
      return NextResponse.json({ error: 'no_subscription', message: 'No active subscription to update.' }, { status: 400 })
    }

    // Update the (single) subscription item's quantity.
    const sub = await stripe.subscriptions.retrieve(subId)
    const itemId = sub.items.data[0]?.id
    if (!itemId) return NextResponse.json({ error: 'no_subscription_item' }, { status: 400 })

    await stripe.subscriptions.update(subId, {
      items: [{ id: itemId, quantity: target }],
      proration_behavior: 'create_prorations',
    })

    // Reflect immediately (the webhook will also sync).
    await admin.from('organizations').update({ seats: target }).eq('id', org.org_id)

    return NextResponse.json({ ok: true, seats: target })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
