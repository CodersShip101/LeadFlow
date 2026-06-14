import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const twoWeeksAgo = new Date(Date.now() - 14 * 864e5).toISOString()

  const [{ count: scannedWeek }, { count: scannedPrevWeek }, { count: saved }] =
    await Promise.all([
      supabase.from('leads').select('*', { count: 'exact', head: true }).gte('posted_date', weekAgo),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('posted_date', twoWeeksAgo)
        .lt('posted_date', weekAgo),
      supabase
        .from('saved_leads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

  const delta =
    scannedPrevWeek && scannedPrevWeek > 0
      ? Math.round(((scannedWeek! - scannedPrevWeek) / scannedPrevWeek) * 100)
      : null

  const admin = createAdminSupabase()
  const { count: proUsers } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_status', 'pro')

  return NextResponse.json({
    scannedThisWeek: scannedWeek ?? 0,
    scannedDeltaPct: delta,
    saved: saved ?? 0,
    proUsers: proUsers ?? 0,
  })
}
