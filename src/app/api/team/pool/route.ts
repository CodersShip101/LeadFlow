import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

// Shared team lead pool — every application tagged to the caller's org, with
// the lead details and who it's assigned to. Membership is verified server-side
// and reads use the admin client (so RLS owner-scoping doesn't hide teammates).
async function membership() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const admin = createAdminSupabase()
  const { data: m } = await admin
    .from('org_members').select('org_id, role').eq('user_id', user.id).maybeSingle()
  if (!m) return { error: NextResponse.json({ error: 'Not on a team', notTeam: true }, { status: 403 }) }
  return { admin, user, orgId: m.org_id as string, role: m.role as string }
}

export async function GET() {
  const c = await membership()
  if (c.error) return c.error

  const { data: apps } = await c.admin
    .from('applications')
    .select('id, status, outcome, assigned_to, created_at, freelancer_id, lead:leads(id, title, client_location, budget_min, budget_max, source_url)')
    .eq('org_id', c.orgId)
    .order('created_at', { ascending: false })

  // Names for assignee + owner
  const { data: members } = await c.admin
    .from('org_members')
    .select('user_id, role, profile:profiles(full_name)')
    .eq('org_id', c.orgId)

  return NextResponse.json({
    myRole: c.role,
    members: (members ?? []).map(m => ({
      user_id: m.user_id,
      role: m.role,
      name: (m.profile as { full_name?: string } | null)?.full_name ?? 'Teammate',
    })),
    leads: apps ?? [],
  })
}

export async function PATCH(req: NextRequest) {
  const c = await membership()
  if (c.error) return c.error
  const { applicationId, assignTo } = await req.json().catch(() => ({}))
  if (!applicationId) return NextResponse.json({ error: 'applicationId required' }, { status: 400 })

  // assignTo must be a member of the same org (or null to unassign).
  if (assignTo) {
    const { data: ok } = await c.admin
      .from('org_members').select('user_id').eq('org_id', c.orgId).eq('user_id', assignTo).maybeSingle()
    if (!ok) return NextResponse.json({ error: 'Not a team member' }, { status: 400 })
  }

  const { error } = await c.admin
    .from('applications')
    .update({ assigned_to: assignTo ?? null })
    .eq('id', applicationId)
    .eq('org_id', c.orgId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
