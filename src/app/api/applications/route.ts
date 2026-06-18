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
    .select('id, lead_id, status, outcome, outcome_at, created_at')
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
    .select('id')
    .eq('freelancer_id', user.id)
    .eq('lead_id', lead_id)
    .maybeSingle()

  if (existing) {
    const { data, error } = await admin
      .from('applications')
      .update({ status })
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

  const { data, error } = await admin
    .from('applications')
    .insert({ freelancer_id: user.id, lead_id, status, org_id: orgId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lead_id, outcome } = await req.json()
  if (!lead_id || !outcome) {
    return NextResponse.json({ error: 'lead_id and outcome required' }, { status: 400 })
  }

  const validOutcomes = ['won', 'lost', 'pending']
  if (!validOutcomes.includes(outcome)) {
    return NextResponse.json({ error: 'Invalid outcome' }, { status: 400 })
  }

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('applications')
    .update({ outcome, outcome_at: new Date().toISOString() })
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
