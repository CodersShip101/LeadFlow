import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json().catch(() => ({}))
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 })

  // Joining a team unlocks team features for the member.
  await supabase.from('profiles').update({ subscription_status: 'team' }).eq('id', user.id)

  return NextResponse.json({ ok: true, orgId: data.org_id })
}

// Invite emails link here (GET). Handle the token, then redirect into the app.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const base = req.nextUrl.origin
  if (!token) return NextResponse.redirect(new URL('/dashboard', base))

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  // Not logged in → send to login, preserving the invite to accept after auth.
  if (!user) {
    return NextResponse.redirect(new URL(`/auth/login?next=/dashboard/team/join?token=${token}`, base))
  }

  const { data, error } = await supabase.rpc('accept_invite', { p_token: token })
  if (error || data?.error) {
    return NextResponse.redirect(new URL('/dashboard/team?invite=error', base))
  }
  await supabase.from('profiles').update({ subscription_status: 'team' }).eq('id', user.id)
  return NextResponse.redirect(new URL('/dashboard/team?invite=accepted', base))
}
