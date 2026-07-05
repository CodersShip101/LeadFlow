import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase, fullNamesByUserId } from '@/lib/supabase-server'
import { restorePriorPlan } from '@/lib/team-plan'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
  const org = orgRows?.[0] ?? null
  if (!org) return NextResponse.json({ org: null, members: [] })

  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, role, created_at')
    .eq('org_id', org.org_id)

  const { data: invites } = await supabase
    .from('org_invites')
    .select('email, role, accepted_at, created_at')
    .eq('org_id', org.org_id)
    .is('accepted_at', null)

  // Resolve names via the admin client (co-members' names aren't sensitive
  // within a verified org, and the user client's RLS can hide other profiles).
  const names = await fullNamesByUserId(createAdminSupabase(), (members ?? []).map(m => m.user_id as string))

  return NextResponse.json({
    org: { id: org.org_id, plan: org.plan, seats: org.seats, myRole: org.role },
    seatsUsed: members?.length ?? 0,
    members: (members ?? []).map(m => ({
      ...m,
      profile: { full_name: names.get(m.user_id as string) ?? null },
    })),
    pendingInvites: invites ?? [],
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
  const org = orgRows?.[0]
  if (!org || org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const { userId, role } = await req.json().catch(() => ({}))
  if (!['admin', 'member'].includes(role)) return NextResponse.json({ error: 'invalid role' }, { status: 400 })

  const { error } = await supabase.from('org_members').update({ role }).eq('org_id', org.org_id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
  const org = orgRows?.[0]
  if (!org) return NextResponse.json({ error: 'Not on a team' }, { status: 403 })

  const { userId } = await req.json().catch(() => ({}))
  const isSelf = userId === user.id
  // Admins can remove anyone; a member may only remove (leave) themselves.
  if (!isSelf && org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  // The last admin can't leave/be-removed — the org would be left ownerless.
  if (isSelf && org.role === 'admin') {
    const { count } = await supabase
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('role', 'admin')
    if ((count ?? 0) <= 1) return NextResponse.json({ error: 'cannot remove the only admin' }, { status: 400 })
  }

  const { error } = await supabase.from('org_members').delete().eq('org_id', org.org_id).eq('user_id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Cancel the removed/departed user's team access. Joining set their profile
  // to 'team' (see /api/team/accept); leaving must revert it or they'd keep
  // team features with no org. Restores the plan they had before joining
  // (falls back to 'free'). Uses the admin client because RLS blocks writing
  // another user's row.
  await restorePriorPlan(createAdminSupabase(), userId)

  return NextResponse.json({ ok: true, left: isSelf })
}
