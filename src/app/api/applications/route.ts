import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

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

  const { data, error } = await admin
    .from('applications')
    .insert({ freelancer_id: user.id, lead_id, status })
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
