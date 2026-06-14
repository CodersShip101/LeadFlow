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

  return NextResponse.json({ ok: true, orgId: data.org_id })
}
