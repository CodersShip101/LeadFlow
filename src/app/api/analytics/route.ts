import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'

// CRM-style analytics: every rate/volume metric is computed inside the selected
// window (30/90/365 days) and again for the previous equal window so the UI can
// show deltas. Pipeline value and stage counts are current-state, not windowed.
export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, skills')
    .eq('id', user.id)
    .single()

  const plan = (profile?.subscription_status ?? 'free') as Tier
  const ent = ENTITLEMENTS[plan]

  if (!ent.basicAnalytics) {
    return NextResponse.json({
      error: 'Analytics requires Starter plan or above',
      upgrade: true,
    }, { status: 403 })
  }

  const url = new URL(req.url)
  const rangeParam = Number(url.searchParams.get('range'))
  const rangeDays = [30, 90, 365].includes(rangeParam) ? rangeParam : 90
  const now = new Date()
  const rangeStart = new Date(now.getTime() - rangeDays * 86400000)
  const prevStart = new Date(now.getTime() - 2 * rangeDays * 86400000)

  const admin = createAdminSupabase()

  const { data: apps } = await admin
    .from('applications')
    .select('lead_id, status, outcome, outcome_at, created_at, lost_reason, won_amount')
    .eq('freelancer_id', user.id)
    .neq('status', 'saved')

  const all = apps ?? []
  const lifetimeTotal = all.length

  const leadIds = all.map(a => a.lead_id)
  let leadRows: any[] = []
  if (leadIds.length > 0) {
    const { data } = await admin
      .from('leads')
      .select('id, source, skills_required, budget_min, budget_max, posted_date')
      .in('id', leadIds)
    leadRows = data ?? []
  }

  const leadBudget = (id: string) => {
    const lead = leadRows.find(l => l.id === id)
    return lead?.budget_max ?? lead?.budget_min ?? 0
  }
  const dealValue = (a: { lead_id: string; won_amount: number | null }) =>
    a.won_amount != null ? Number(a.won_amount) : leadBudget(a.lead_id)
  const inWindow = (iso: string | null, from: Date, to: Date) =>
    !!iso && new Date(iso) >= from && new Date(iso) < to

  // ── Windowed metrics (current vs previous period) ──
  const windowMetrics = (from: Date, to: Date) => {
    const created = all.filter(a => inWindow(a.created_at, from, to))
    const won = all.filter(a => a.outcome === 'won' && inWindow(a.outcome_at, from, to))
    const lost = all.filter(a => a.outcome === 'lost' && inWindow(a.outcome_at, from, to))
    const decided = won.length + lost.length
    return {
      applications: created.length,
      won: won.length,
      lost: lost.length,
      winRate: decided > 0 ? Math.round((won.length / decided) * 100) : null,
      revenueWon: won.reduce((s, a) => s + dealValue(a), 0),
      wonApps: won,
    }
  }
  const cur = windowMetrics(rangeStart, now)
  const prev = windowMetrics(prevStart, rangeStart)

  // ── Current pipeline state ──
  const openApps = all.filter(a => a.status === 'interested' || a.status === 'applied' || a.status === 'in_talks')
  const pipelineValue = openApps.reduce((s, a) => s + leadBudget(a.lead_id), 0)

  const cycles = cur.wonApps
    .filter(a => a.outcome_at)
    .map(a => (new Date(a.outcome_at).getTime() - new Date(a.created_at).getTime()) / 86400000)
    .filter(d => d >= 0)
  const avgDealCycleDays = cycles.length > 0
    ? Math.round(cycles.reduce((s, v) => s + v, 0) / cycles.length)
    : null

  // ── Activity: weekly buckets (monthly for 12m) across the window ──
  const activity: { label: string; count: number }[] = []
  if (rangeDays === 365) {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      activity.push({
        label: start.toLocaleDateString('en-GB', { month: 'short' }),
        count: all.filter(a => inWindow(a.created_at, start, end)).length,
      })
    }
  } else {
    const weeks = Math.round(rangeDays / 7)
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 86400000)
      const end = new Date(now.getTime() - i * 7 * 86400000)
      activity.push({
        label: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        count: all.filter(a => inWindow(a.created_at, start, end)).length,
      })
    }
  }

  // ── Revenue by calendar month, last 6 months (fixed scale, labelled) ──
  const wonAll = all.filter(a => a.outcome === 'won')
  const revenueByMonth: { month: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const amount = wonAll
      .filter(a => inWindow(a.outcome_at, start, end))
      .reduce((s, a) => s + dealValue(a), 0)
    revenueByMonth.push({ month: start.toLocaleDateString('en-GB', { month: 'short' }), amount })
  }

  // ── Sources table (window-scoped) ──
  const srcMap: Record<string, { count: number; won: number; revenue: number }> = {}
  for (const a of all.filter(x => inWindow(x.created_at, rangeStart, new Date()))) {
    const lead = leadRows.find(l => l.id === a.lead_id)
    const src = lead?.source ?? 'unknown'
    if (!srcMap[src]) srcMap[src] = { count: 0, won: 0, revenue: 0 }
    srcMap[src].count++
    if (a.outcome === 'won') { srcMap[src].won++; srcMap[src].revenue += dealValue(a) }
  }
  const sources = Object.entries(srcMap)
    .map(([source, v]) => ({ source, ...v }))
    .sort((a, b) => b.count - a.count)

  // ── Advanced (higher tiers): stage distribution, lost reasons, skill coverage ──
  let advanced = null
  if (ent.advancedAnalytics) {
    const stageCounts = {
      interested: all.filter(a => a.status === 'interested').length,
      applied: all.filter(a => a.status === 'applied').length,
      in_talks: all.filter(a => a.status === 'in_talks').length,
      hired: all.filter(a => a.status === 'hired').length,
      lost: all.filter(a => a.status === 'lost').length,
    }

    const reasonCounts: Record<string, number> = {}
    for (const a of all) {
      if (a.outcome === 'lost' && a.lost_reason) {
        reasonCounts[a.lost_reason] = (reasonCounts[a.lost_reason] ?? 0) + 1
      }
    }
    const lostReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)

    const userSkills = (profile?.skills ?? []).map((s: string) => s.toLowerCase())
    let skillHits = 0, skillChecks = 0
    for (const l of leadRows) {
      for (const sk of (l.skills_required ?? [])) {
        skillChecks++
        if (userSkills.includes(sk.toLowerCase())) skillHits++
      }
    }
    const skillCoverageRate = skillChecks > 0 ? Math.round((skillHits / skillChecks) * 100) : null

    advanced = { stageCounts, lostReasons, skillCoverageRate }
  }

  return NextResponse.json({
    plan,
    range: rangeDays,
    lifetimeTotal,
    summary: {
      applications: cur.applications,
      won: cur.won,
      lost: cur.lost,
      winRate: cur.winRate,
      revenueWon: cur.revenueWon,
      pipelineValue,
      openCount: openApps.length,
      avgDealCycleDays,
    },
    prev: { applications: prev.applications, winRate: prev.winRate, revenueWon: prev.revenueWon },
    activity,
    revenueByMonth,
    sources,
    advanced,
  })
}
