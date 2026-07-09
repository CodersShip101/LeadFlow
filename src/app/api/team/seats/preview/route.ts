import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const MAX_SEATS = 200

// Preview what changing to `seats` costs, before committing. Admin only.
// Returns an estimate computed from the subscription's REAL unit price and the
// time left in the current period — the same daily proration Stripe applies
// with `create_prorations`. Stripe remains the source of truth at commit; this
// is an honest "about £X" so the admin isn't surprised by the charge (#27).
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
    const org = orgRows?.[0]
    if (!org || org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

    const target = Math.floor(Number((await req.json().catch(() => ({}))).seats))
    if (!Number.isFinite(target) || target < 1 || target > MAX_SEATS) {
      return NextResponse.json({ error: 'invalid seats' }, { status: 400 })
    }

    const admin = createAdminSupabase()

    // Floor: can't preview below seats in use.
    const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
      admin.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id),
      admin.from('org_invites').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id).is('accepted_at', null),
    ])
    const inUse = (memberCount ?? 0) + (inviteCount ?? 0)

    const { data: orgRow } = await admin
      .from('organizations').select('stripe_subscription_id').eq('id', org.org_id).single()
    const subId = orgRow?.stripe_subscription_id as string | undefined
    if (!subId) return NextResponse.json({ error: 'no_subscription' }, { status: 400 })

    const sub = await stripe.subscriptions.retrieve(subId)
    const item = sub.items.data[0]
    if (!item) return NextResponse.json({ error: 'no_item' }, { status: 400 })

    const unitMinor = item.price.unit_amount ?? 0
    const currentSeats = item.quantity ?? sub.items.data.reduce((n, i) => n + (i.quantity ?? 0), 0) ?? 1
    // Period bounds live on the item in current API versions; fall back to sub.
    const s = item as unknown as { current_period_start?: number; current_period_end?: number }
    const sb = sub as unknown as { current_period_start?: number; current_period_end?: number }
    const periodStart = s.current_period_start ?? sb.current_period_start ?? null
    const periodEnd = s.current_period_end ?? sb.current_period_end ?? null
    const now = Math.floor(Date.now() / 1000)
    const fraction = periodStart && periodEnd && periodEnd > periodStart
      ? Math.max(0, Math.min(1, (periodEnd - now) / (periodEnd - periodStart)))
      : 0

    const deltaSeats = target - currentSeats
    const estimateMinor = Math.round(deltaSeats * unitMinor * fraction) // + = charged now, − = credit

    return NextResponse.json({
      seats: target,
      currentSeats,
      inUse,
      currency: sub.currency,
      unitMinor,                    // per-seat monthly price (real Stripe amount)
      estimateMinor,                // prorated charge (or credit) for this change now
      isCredit: estimateMinor < 0,
      recurringDeltaMinor: deltaSeats * unitMinor, // change to the monthly bill
      nextRenewal: periodEnd,       // unix seconds
      isTrialing: sub.status === 'trialing',
    })
  } catch (e) {
    console.error('seat preview error', e)
    return NextResponse.json({ error: 'preview_failed' }, { status: 500 })
  }
}
