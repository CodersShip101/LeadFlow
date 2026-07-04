import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { entitlementsFor, type Tier } from '@/lib/tiers'

async function gate() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: prof } = await supabase
    .from('profiles').select('subscription_status').eq('id', user.id).single()
  const plan = (prof?.subscription_status ?? 'free') as Tier
  if (!entitlementsFor(plan).calendarSync) {
    return { error: NextResponse.json({ error: 'Reminders require the Pro plan', upgrade: true }, { status: 403 }) }
  }
  return { supabase, user }
}

// Set / clear a follow-up reminder on the application for a given lead.
export async function POST(req: NextRequest) {
  const g = await gate()
  if (g.error) return g.error
  const { lead_id, follow_up_at, follow_up_note } = await req.json().catch(() => ({}))
  if (!lead_id || typeof lead_id !== 'string' || lead_id.length > 200) {
    return NextResponse.json({ error: 'lead_id required' }, { status: 400 })
  }
  if (follow_up_at !== undefined && follow_up_at !== null && typeof follow_up_at !== 'string') {
    return NextResponse.json({ error: 'follow_up_at must be a date string or null' }, { status: 400 })
  }
  if (follow_up_note !== undefined && follow_up_note !== null && typeof follow_up_note !== 'string') {
    return NextResponse.json({ error: 'follow_up_note must be a string' }, { status: 400 })
  }
  if (typeof follow_up_note === 'string' && follow_up_note.length > 500) {
    return NextResponse.json({ error: 'follow_up_note too long (max 500)' }, { status: 400 })
  }

  // Write with the admin client (scoped to this user) — same as /api/applications.
  // RLS blocks the user-token write on applications, which silently matched 0 rows.
  const admin = createAdminSupabase()
  const { data: existing } = await admin
    .from('applications').select('id').eq('freelancer_id', g.user.id).eq('lead_id', lead_id).maybeSingle()

  // Reset the notified flag so a freshly set reminder will email again.
  if (existing) {
    const { error } = await admin
      .from('applications')
      .update({ follow_up_at: follow_up_at ?? null, follow_up_note: follow_up_note ?? null, follow_up_notified_at: null })
      .eq('id', existing.id)
    if (error) {
      console.error('POST /api/reminders update error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
  } else {
    const { error } = await admin
      .from('applications')
      .insert({ freelancer_id: g.user.id, lead_id, status: 'interested', follow_up_at: follow_up_at ?? null, follow_up_note: follow_up_note ?? null, follow_up_notified_at: null })
    if (error) {
      console.error('POST /api/reminders insert error:', error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}
