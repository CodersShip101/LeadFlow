import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: recentRows } = await supabase
    .from('search_log')
    .select('query, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(15)

  const seen = new Set<string>()
  const recent: string[] = []
  for (const r of recentRows ?? []) {
    const key = r.query.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      recent.push(r.query)
    }
    if (recent.length >= 3) break
  }

  const { data: popular } = await supabase.rpc('popular_searches', { days: 7, lim: 3 })

  return NextResponse.json({ recent, popular: popular ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query } = await req.json().catch(() => ({}))
  const trimmed = (query ?? '').trim()
  if (trimmed.length < 2) return NextResponse.json({ ok: true })

  await supabase.from('search_log').insert({ user_id: user.id, query: trimmed })
  return NextResponse.json({ ok: true })
}
