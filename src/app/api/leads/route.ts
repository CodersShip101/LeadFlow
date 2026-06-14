import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { rankLeads, type ScoringLead } from '@/lib/scoring'
import { segmentOf, SEGMENT_CONFIG } from '@/lib/segment'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, skills, hourly_rate, plan, applications_total, days_active')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

  const sp = req.nextUrl.searchParams
  const sourceFilter = sp.get('source')
  const scoreFilter = sp.get('score')
  const q = sp.get('q')?.toLowerCase()

  let query = supabase
    .from('leads')
    .select('id, source, title, description, budget_text, budget_min, budget_max, client_location, project_type, skills_required, ir35, posted_date, applicants, detail_score, source_url')
    .or('expiry_date.is.null,expiry_date.gt.now()')
    .order('posted_date', { ascending: false })
    .limit(200)

  if (sourceFilter) query = query.eq('source', sourceFilter)

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ranked = rankLeads(rows as unknown as ScoringLead[], {
    skills: profile.skills ?? [],
    hourly_rate: profile.hourly_rate,
  })

  const noFilters = !sourceFilter && !scoreFilter && !q
  const topMatchId = noFilters && ranked.length ? ranked[0].lead.id : null

  let visible = ranked
  if (scoreFilter === '8') visible = visible.filter((r) => r.score >= 8)
  else if (scoreFilter === '7') visible = visible.filter((r) => r.score >= 7)
  if (q) {
    visible = visible.filter(
      (r) =>
        (rows as any[]).find((x) => x.id === r.lead.id)?.title?.toLowerCase().includes(q) ||
        (rows as any[]).find((x) => x.id === r.lead.id)?.description?.toLowerCase().includes(q),
    )
  }

  const isPro = profile.plan === 'pro'
  const byId = new Map((rows as any[]).map((x) => [x.id, x]))

  const leads = visible.map((r) => {
    const row = byId.get(r.lead.id)
    return {
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
      score: r.score,
      sub: r.sub,
      why: r.why,
      skillDetail: r.skillDetail,
      sourceUrl: isPro ? row.source_url : null,
      isTopMatch: row.id === topMatchId,
    }
  })

  const seg = segmentOf({
    applications_total: profile.applications_total ?? 0,
    days_active: profile.days_active ?? 0,
  })
  const cfg = SEGMENT_CONFIG[seg]

  return NextResponse.json({
    leads,
    meta: {
      plan: profile.plan,
      segment: seg,
      greeting: cfg.greeting(profile.full_name?.split(' ')[0] || 'there'),
      banner: cfg.banner ?? null,
      emphasis: cfg.emphasis,
      topMatchId,
    },
  })
}
