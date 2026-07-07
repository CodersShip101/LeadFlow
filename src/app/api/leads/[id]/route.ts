import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { scoreLead, type ScoringLead } from '@/lib/scoring'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (typeof id !== 'string' || !id || id.length > 200) {
      return NextResponse.json({ error: 'Invalid lead ID' }, { status: 400 })
    }
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('skills, hourly_rate, subscription_status, scoring_weights')
      .eq('id', user.id)
      .single()

    const { data: row, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const scored = scoreLead(row as unknown as ScoringLead, {
      skills: profile?.skills ?? [],
      hourly_rate: profile?.hourly_rate ?? null,
    })

    return NextResponse.json({
      id: row.id,
      source: row.source,
      title: row.title,
      description: row.description,
      budget: row.budget_text,
      location: row.client_location,
      type: row.project_type,
      ir35: row.ir35,
      postedAt: row.posted_date,
      applicants: row.applicants,
      skills: row.skills_required,
      score: scored.score,
      sub: scored.sub,
      why: scored.why,
      skillDetail: scored.skillDetail,
      sourceUrl: row.source_url ?? null,
      sourceLocked: false,
    })
  } catch (e) {
    console.error('Lead fetch error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
