import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { scoreLead, type ScoringLead } from '@/lib/scoring'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('skills, hourly_rate')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('saved_leads')
    .select('lead:leads(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const leads = (data ?? []).map((r: any) => {
    const s = scoreLead(r.lead as ScoringLead, {
      skills: profile?.skills ?? [],
      hourly_rate: profile?.hourly_rate ?? null,
    })
    return {
      id: r.lead.id,
      source: r.lead.source,
      title: r.lead.title,
      budget: r.lead.budget_text,
      postedAt: r.lead.posted_date,
      score: s.score,
    }
  })

  return NextResponse.json({ leads })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await req.json().catch(() => ({}))
  if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

  const { error } = await supabase
    .from('saved_leads')
    .upsert({ user_id: user.id, lead_id: leadId }, { onConflict: 'user_id,lead_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leadId } = await req.json().catch(() => ({}))
  await supabase.from('saved_leads').delete().eq('user_id', user.id).eq('lead_id', leadId)
  return NextResponse.json({ ok: true })
}
