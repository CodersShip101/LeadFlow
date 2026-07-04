import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

const STAGES = ['interested', 'applied', 'in_talks', 'hired', 'lost'] as const

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('applications')
    .select('id, status, outcome, outcome_at, stage_changed_at, lead:leads(id, source, title, budget_text, posted_date)')
    .eq('freelancer_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const grouped: Record<string, any[]> = { interested: [], applied: [], in_talks: [], hired: [], lost: [] }
  for (const row of data ?? []) {
    grouped[row.status]?.push({
      applicationId: row.id,
      stage: row.status,
      outcome: row.outcome,
      note: null,
      lead: row.lead,
    })
  }
  return NextResponse.json(grouped)
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { applicationId, stage } = await req.json().catch(() => ({}))
    if (!applicationId || typeof applicationId !== 'string' || applicationId.length > 200)
      return NextResponse.json({ error: 'Invalid applicationId' }, { status: 400 })
    if (typeof stage !== 'string' || stage.length > 200)
      return NextResponse.json({ error: 'invalid stage' }, { status: 400 })
    if (!STAGES.includes(stage as (typeof STAGES)[number]))
      return NextResponse.json({ error: 'invalid stage' }, { status: 400 })

    const nowISO = new Date().toISOString()
    const patch: Record<string, unknown> = { status: stage, stage_changed_at: nowISO }
    if (stage === 'hired') { patch.outcome = 'won'; patch.outcome_at = nowISO }
    else if (stage === 'lost') { patch.outcome = 'lost'; patch.outcome_at = nowISO }
    else { patch.outcome = null; patch.outcome_at = null }

    const { error } = await supabase
      .from('applications')
      .update(patch)
      .eq('id', applicationId)
      .eq('freelancer_id', user.id)

    if (error) {
      console.error(error)
      return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
