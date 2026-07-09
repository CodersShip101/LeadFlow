import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase, fullNamesByUserId } from '@/lib/supabase-server'

// Recent seat changes for the caller's org (admin only). Returns [] if the
// seat_events table hasn't been created yet — so the UI degrades gracefully.
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
  const org = orgRows?.[0]
  if (!org || org.role !== 'admin') return NextResponse.json({ events: [] })

  const admin = createAdminSupabase()
  const { data, error } = await admin
    .from('seat_events')
    .select('id, actor_id, from_seats, to_seats, created_at')
    .eq('org_id', org.org_id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error || !data) return NextResponse.json({ events: [] })

  const names = await fullNamesByUserId(admin, data.map(e => e.actor_id as string).filter(Boolean))
  return NextResponse.json({
    events: data.map(e => ({
      id: e.id,
      actor: names.get(e.actor_id as string) ?? 'An admin',
      from: e.from_seats,
      to: e.to_seats,
      created_at: e.created_at,
    })),
  })
}
