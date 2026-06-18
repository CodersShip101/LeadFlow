import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { entitlementsFor, type Tier } from '@/lib/tiers'

async function gate() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: prof } = await supabase
    .from('profiles').select('subscription_status, calendar_token').eq('id', user.id).single()
  const plan = (prof?.subscription_status ?? 'free') as Tier
  if (!entitlementsFor(plan).calendarSync) {
    return { error: NextResponse.json({ error: 'Reminders require the Pro plan', upgrade: true }, { status: 403 }) }
  }
  return { supabase, user, calendarToken: prof?.calendar_token as string | undefined }
}

// Set / clear a follow-up reminder on the application for a given lead.
export async function POST(req: NextRequest) {
  const g = await gate()
  if (g.error) return g.error
  const { lead_id, follow_up_at, follow_up_note } = await req.json().catch(() => ({}))
  if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

  // Ensure an application row exists for this lead (create as 'interested' if not).
  const { data: existing } = await g.supabase
    .from('applications').select('id').eq('freelancer_id', g.user.id).eq('lead_id', lead_id).maybeSingle()

  if (existing) {
    const { error } = await g.supabase
      .from('applications')
      .update({ follow_up_at: follow_up_at ?? null, follow_up_note: follow_up_note ?? null })
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await g.supabase
      .from('applications')
      .insert({ freelancer_id: g.user.id, lead_id, status: 'interested', follow_up_at: follow_up_at ?? null, follow_up_note: follow_up_note ?? null })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, calendarToken: g.calendarToken })
}
