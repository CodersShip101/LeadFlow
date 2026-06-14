import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
  const org = orgRows?.[0]
  if (!org || org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const { email, role = 'member' } = await req.json().catch(() => ({}))
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email))
    return NextResponse.json({ error: 'valid email required' }, { status: 400 })

  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    supabase.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id),
    supabase.from('org_invites').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id).is('accepted_at', null),
  ])
  if ((memberCount ?? 0) + (inviteCount ?? 0) >= org.seats) {
    return NextResponse.json(
      { error: 'no_seats', message: 'All seats are in use. Add seats to invite more teammates.' },
      { status: 402 },
    )
  }

  const { data: invite, error } = await supabase
    .from('org_invites')
    .upsert(
      { org_id: org.org_id, email: email.toLowerCase(), role, invited_by: user.id },
      { onConflict: 'org_id,email' },
    )
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!
  const acceptUrl = `${origin}/api/team/accept?token=${invite!.token}`

  return NextResponse.json({ ok: true, acceptUrl })
}
