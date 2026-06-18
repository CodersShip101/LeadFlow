import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

// Team analytics + win-rate leaderboard for the caller's org.
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const { data: m } = await admin
    .from('org_members').select('org_id').eq('user_id', user.id).maybeSingle()
  if (!m) return NextResponse.json({ error: 'Not on a team', notTeam: true }, { status: 403 })
  const orgId = m.org_id as string

  const [{ data: members }, { data: apps }] = await Promise.all([
    admin.from('org_members').select('user_id, role, profile:profiles(full_name)').eq('org_id', orgId),
    admin.from('applications').select('freelancer_id, status, outcome').eq('org_id', orgId),
  ])

  const byUser = new Map<string, { total: number; applied: number; won: number; lost: number }>()
  for (const a of (apps ?? [])) {
    const u = a.freelancer_id as string
    const s = byUser.get(u) ?? { total: 0, applied: 0, won: 0, lost: 0 }
    s.total++
    if (a.status !== 'saved') s.applied++
    if (a.outcome === 'won') s.won++
    if (a.outcome === 'lost') s.lost++
    byUser.set(u, s)
  }

  const leaderboard = (members ?? []).map(mem => {
    const s = byUser.get(mem.user_id as string) ?? { total: 0, applied: 0, won: 0, lost: 0 }
    const decided = s.won + s.lost
    return {
      user_id: mem.user_id,
      name: (mem.profile as { full_name?: string } | null)?.full_name ?? 'Teammate',
      role: mem.role,
      applied: s.applied,
      won: s.won,
      winRate: decided > 0 ? Math.round((s.won / decided) * 100) : null,
    }
  }).sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.won - a.won)

  const totalApplied = leaderboard.reduce((n, x) => n + x.applied, 0)
  const totalWon = leaderboard.reduce((n, x) => n + x.won, 0)
  const decidedAll = leaderboard.reduce((n, x) => n + x.won, 0) + (apps ?? []).filter(a => a.outcome === 'lost').length
  const teamWinRate = decidedAll > 0 ? Math.round((totalWon / decidedAll) * 100) : null

  return NextResponse.json({
    summary: { members: leaderboard.length, totalApplied, totalWon, teamWinRate },
    leaderboard,
  })
}
