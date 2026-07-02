import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'

export async function GET() {
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

  const admin = createAdminSupabase()

  // ── Applications this user has made ──
  const { data: apps } = await admin
    .from('applications')
    .select('lead_id, status, outcome, created_at, lost_reason, won_amount')
    .eq('freelancer_id', user.id)
    .neq('status', 'saved')

  const total = apps?.length ?? 0
  const withOutcome = apps?.filter(a => a.outcome) ?? []
  const won = withOutcome.filter(a => a.outcome === 'won').length
  const lost = withOutcome.filter(a => a.outcome === 'lost').length
  const winRate = withOutcome.length > 0 ? Math.round((won / withOutcome.length) * 100) : null

  // ── Applications by week (last 8 weeks) ──
  const weeks: { week: string; count: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const start = new Date()
    start.setDate(start.getDate() - i * 7)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 7)
    const count = apps?.filter(a => {
      const d = new Date(a.created_at)
      return d >= start && d < end
    }).length ?? 0
    weeks.push({
      week: start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      count,
    })
  }

  // ── Lead IDs the user applied to ──
  const leadIds = apps?.map(a => a.lead_id) ?? []
  let leadRows: any[] = []
  if (leadIds.length > 0) {
    const { data } = await admin
      .from('leads')
      .select('id, source, skills_required, budget_min, budget_max, posted_date')
      .in('id', leadIds)
    leadRows = data ?? []
  }

  // ── Source breakdown ──
  const sourceCounts: Record<string, number> = {}
  for (const l of leadRows) {
    const src = l.source ?? 'unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
  }
  const sources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // ── Avg budget of applied leads ──
  const budgets = leadRows
    .map(l => l.budget_max ?? l.budget_min)
    .filter(Boolean) as number[]
  const avgBudget = budgets.length > 0
    ? Math.round(budgets.reduce((s, v) => s + v, 0) / budgets.length)
    : null

  // ── Revenue won: confirmed deal values, falling back to the listed budget ──
  const revenueWon = (apps ?? [])
    .filter(a => a.outcome === 'won')
    .reduce((s, a) => {
      if (a.won_amount != null) return s + Number(a.won_amount)
      const lead = leadRows.find(l => l.id === a.lead_id)
      return s + (lead?.budget_max ?? lead?.budget_min ?? 0)
    }, 0)

  // ── Advanced analytics (Max plan only) ──
  let advanced = null
  if (ent.advancedAnalytics) {
    // Pipeline stage funnel
    const stageCounts = {
      interested: apps?.filter(a => a.status === 'interested').length ?? 0,
      applied: apps?.filter(a => a.status === 'applied').length ?? 0,
      in_talks: apps?.filter(a => a.status === 'in_talks').length ?? 0,
      hired: apps?.filter(a => a.status === 'hired').length ?? 0,
      lost: apps?.filter(a => a.status === 'lost').length ?? 0,
    }

    // Skill coverage — how often user's skills appeared in applied leads
    const userSkills = (profile?.skills ?? []).map((s: string) => s.toLowerCase())
    let skillHits = 0, skillChecks = 0
    for (const l of leadRows) {
      for (const sk of (l.skills_required ?? [])) {
        skillChecks++
        if (userSkills.includes(sk.toLowerCase())) skillHits++
      }
    }
    const skillCoverageRate = skillChecks > 0
      ? Math.round((skillHits / skillChecks) * 100)
      : null

    // Best performing source (highest win rate)
    const sourceWins: Record<string, { won: number; total: number }> = {}
    for (const app of (apps ?? [])) {
      const lead = leadRows.find(l => l.id === app.lead_id)
      const src = lead?.source ?? 'unknown'
      if (!sourceWins[src]) sourceWins[src] = { won: 0, total: 0 }
      sourceWins[src].total++
      if (app.outcome === 'won') sourceWins[src].won++
    }
    const sourceWinRates = Object.entries(sourceWins)
      .map(([source, { won, total }]) => ({
        source,
        winRate: total > 0 ? Math.round((won / total) * 100) : 0,
        total,
      }))
      .sort((a, b) => b.winRate - a.winRate)

    // Avg days from application to outcome
    const durations = (apps ?? [])
      .filter(a => a.outcome)
      .map(a => {
        const lead = leadRows.find(l => l.id === a.lead_id)
        if (!lead) return null
        return Math.round((new Date(a.created_at).getTime() - new Date(lead.posted_date).getTime()) / 86400000)
      })
      .filter((d): d is number => d !== null && d >= 0)
    const avgDaysToApply = durations.length > 0
      ? Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
      : null

    // Why deals were lost — one-tap reasons captured on the pipeline
    const reasonCounts: Record<string, number> = {}
    for (const a of (apps ?? [])) {
      if (a.outcome === 'lost' && a.lost_reason) {
        reasonCounts[a.lost_reason] = (reasonCounts[a.lost_reason] ?? 0) + 1
      }
    }
    const lostReasons = Object.entries(reasonCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)

    advanced = { stageCounts, skillCoverageRate, sourceWinRates, avgDaysToApply, lostReasons }
  }

  return NextResponse.json({
    summary: { total, won, lost, winRate, avgBudget, revenueWon },
    weeklyActivity: weeks,
    sources,
    advanced,
    plan,
  })
}
