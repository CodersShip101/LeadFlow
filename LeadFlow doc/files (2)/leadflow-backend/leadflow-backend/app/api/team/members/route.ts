// app/api/team/members/route.ts
// ---------------------------------------------------------------------------
// Team membership management (admin-gated by RLS + explicit checks).
//   GET    /api/team/members                         -> org + members + seat usage
//   PATCH  /api/team/members {userId, role}          -> change a member's role
//   DELETE /api/team/members {userId}                -> remove a member (frees a seat)
// ---------------------------------------------------------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

async function currentOrg(supabase: any, userId: string) {
  const { data } = await supabase.rpc('user_org', { p_user: userId });
  return data?.[0] ?? null; // { org_id, role, plan, seats }
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await currentOrg(supabase, user.id);
  if (!org) return NextResponse.json({ org: null, members: [] });

  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, role, created_at, profile:profiles(full_name)')
    .eq('org_id', org.org_id);

  const { data: invites } = await supabase
    .from('org_invites')
    .select('email, role, accepted_at, created_at')
    .eq('org_id', org.org_id)
    .is('accepted_at', null);

  return NextResponse.json({
    org: { id: org.org_id, plan: org.plan, seats: org.seats, myRole: org.role },
    seatsUsed: members?.length ?? 0,
    members: members ?? [],
    pendingInvites: invites ?? [],
  });
}

export async function PATCH(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await currentOrg(supabase, user.id);
  if (!org || org.role !== 'admin')
    return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const { userId, role } = await req.json().catch(() => ({}));
  if (!['admin', 'member'].includes(role))
    return NextResponse.json({ error: 'invalid role' }, { status: 400 });

  const { error } = await supabase
    .from('org_members')
    .update({ role })
    .eq('org_id', org.org_id)
    .eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const org = await currentOrg(supabase, user.id);
  if (!org || org.role !== 'admin')
    return NextResponse.json({ error: 'admin only' }, { status: 403 });

  const { userId } = await req.json().catch(() => ({}));
  // Don't let an admin remove themselves if they're the only admin (avoid lockout).
  if (userId === user.id) {
    const { count } = await supabase
      .from('org_members')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', org.org_id)
      .eq('role', 'admin');
    if ((count ?? 0) <= 1)
      return NextResponse.json({ error: 'cannot remove the only admin' }, { status: 400 });
  }

  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', org.org_id)
    .eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
