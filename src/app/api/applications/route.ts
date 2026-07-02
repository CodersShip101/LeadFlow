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
    .select('id, lead_id, status, outcome, outcome_at, created_at, stage_changed_at, lost_reason, won_amount, follow_up_at, follow_up_note, note')
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

  const validStatuses = ['saved', 'interested', 'applied', 'in_talks', 'hired', 'lost']
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
    .select('id, status, outcome')
    .eq('freelancer_id', user.id)
    .eq('lead_id', lead_id)
    .maybeSingle()

  // Closed stages record the outcome so Analytics (which counts outcome)
  // reflects them: 'hired' → won, 'lost' → lost. Reopening a closed lead into
  // an active stage clears the outcome again.
  const activeStages = ['interested', 'applied', 'in_talks']
  const nowISO = new Date().toISOString()
  const statusUpdate: Record<string, unknown> = { status }
  if (existing && existing.status !== status) statusUpdate.stage_changed_at = nowISO
  if (status === 'hired') { statusUpdate.outcome = 'won'; statusUpdate.outcome_at = nowISO; statusUpdate.lost_reason = null }
  else if (status === 'lost') { statusUpdate.outcome = 'lost'; statusUpdate.outcome_at = nowISO; statusUpdate.won_amount = null }
  else if (activeStages.includes(status) && (existing?.outcome === 'won' || existing?.outcome === 'lost')) {
    statusUpdate.outcome = null; statusUpdate.outcome_at = null
    statusUpdate.lost_reason = null; statusUpdate.won_amount = null
  }

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

  const insertRow: Record<string, unknown> = { freelancer_id: user.id, lead_id, status, org_id: orgId, stage_changed_at: nowISO }
  if (status === 'hired') { insertRow.outcome = 'won'; insertRow.outcome_at = nowISO }
  else if (status === 'lost') { insertRow.outcome = 'lost'; insertRow.outcome_at = nowISO }
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

  const { lead_id, outcome, note, lost_reason, won_amount } = await req.json()
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
  if (lost_reason !== undefined) {
    update.lost_reason = typeof lost_reason === 'string' && lost_reason.trim() ? lost_reason.trim().slice(0, 120) : null
  }
  if (won_amount !== undefined) {
    const n = won_amount === null ? null : Number(won_amount)
    if (n !== null && (!Number.isFinite(n) || n < 0)) {
      return NextResponse.json({ error: 'Invalid won_amount' }, { status: 400 })
    }
    update.won_amount = n
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
