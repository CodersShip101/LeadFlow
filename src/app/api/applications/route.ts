import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const { data } = await admin
    .from('applications')
    .select('id, lead_id, status, outcome, outcome_at, created_at, follow_up_at, follow_up_note, note')
    .eq('freelancer_id', user.id)

  return NextResponse.json(data || [])
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, status } = await req.json()
  if (!lead_id || !status) {
    return NextResponse.json({ error: 'lead_id and status required' }, { status: 400 })
  }

  const validStatuses = ['saved', 'interested', 'applied', 'hired']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const admin = createAdminSupabase()

  // Enforce application limit for free users (saved leads don't count)
  if (status !== 'saved') {
    const { data: prof } = await admin
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    const plan = (prof?.subscription_status ?? 'free') as Tier
    const limit = ENTITLEMENTS[plan].applicationsPerMonth

    if (limit !== 'unlimited') {
      // Count non-saved applications this calendar month
      const monthStart = new Date()
      monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
      const { count } = await admin
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('freelancer_id', user.id)
        .neq('status', 'saved')
        .gte('created_at', monthStart.toISOString())

      // Only block if this is a NEW application (not updating an existing one)
      const { data: existing } = await admin
        .from('applications')
        .select('id')
        .eq('freelancer_id', user.id)
        .eq('lead_id', lead_id)
        .maybeSingle()

      if (!existing && (count ?? 0) >= limit) {
        return NextResponse.json({
          error: `Free plan limit reached — ${limit} applications per month. Upgrade to continue.`,
          limitReached: true,
          limit,
          used: count,
        }, { status: 403 })
      }
    }
  }

  const { data: existing } = await admin
    .from('applications')
    .select('id, outcome')
    .eq('freelancer_id', user.id)
    .eq('lead_id', lead_id)
    .maybeSingle()

  // Pipeline "Won" sets status 'hired' — also record the win outcome so Analytics
  // (which counts outcome) reflects it. Moving a won lead back clears the win.
  const nowISO = new Date().toISOString()
  const statusUpdate: Record<string, unknown> = { status }
  if (status === 'hired') { statusUpdate.outcome = 'won'; statusUpdate.outcome_at = nowISO }
  else if ((status === 'interested' || status === 'applied') && existing?.outcome === 'won') { statusUpdate.outcome = null; statusUpdate.outcome_at = null }

  if (existing) {
    const { data, error } = await admin
      .from('applications')
      .update(statusUpdate)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // If the user is on a team, tag the lead into the shared pool.
  const { data: membership } = await admin
    .from('org_members').select('org_id').eq('user_id', user.id).maybeSingle()
  const orgId = membership?.org_id ?? null

  const insertRow: Record<string, unknown> = { freelancer_id: user.id, lead_id, status, org_id: orgId }
  if (status === 'hired') { insertRow.outcome = 'won'; insertRow.outcome_at = nowISO }
  const { data, error } = await admin
    .from('applications')
    .insert(insertRow)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, outcome, note } = await req.json()
  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (outcome !== undefined) {
    if (!['won', 'lost', 'pending'].includes(outcome)) {
      return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
    }
    update.outcome = outcome
    update.outcome_at = new Date().toISOString()
  }
  if (note !== undefined) {
    update.note = typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('applications')
    .update(update)
    .eq('freelancer_id', user.id)
    .eq('lead_id', lead_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id } = await req.json()
  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { error } = await admin
    .from('applications')
    .delete()
    .eq('freelancer_id', user.id)
    .eq('lead_id', lead_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
