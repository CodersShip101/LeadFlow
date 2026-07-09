import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'

// Look up an invite by token so the join page can tell the signed-in user
// whether it's actually for them — before they try to accept. Requires being
// logged in; the token comes from the emailed link.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token || token.length > 200) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminSupabase()
  const { data: inv } = await admin
    .from('org_invites')
    .select('email, role, accepted_at, org_id')
    .eq('token', token)
    .maybeSingle()
  if (!inv) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const { data: org } = await admin
    .from('organizations').select('name').eq('id', inv.org_id).maybeSingle()

  const yourEmail = (user.email ?? '').toLowerCase()
  const forEmail = String(inv.email).toLowerCase()
  return NextResponse.json({
    email: inv.email,
    role: inv.role,
    accepted: !!inv.accepted_at,
    orgName: (org as { name?: string } | null)?.name ?? null,
    forYou: yourEmail === forEmail,
    yourEmail: user.email ?? null,
  })
}
