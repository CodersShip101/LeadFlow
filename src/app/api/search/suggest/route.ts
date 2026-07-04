import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function GET() {
  try {
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
  } catch (e) {
    console.error('Search suggest GET error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { query } = await req.json().catch(() => ({}))
    if (query !== undefined && typeof query !== 'string') {
      return NextResponse.json({ error: 'Invalid query format' }, { status: 400 })
    }
    const trimmed = (query ?? '').trim()
    if (trimmed.length < 2) return NextResponse.json({ ok: true })
    if (trimmed.length > 100) {
      return NextResponse.json({ error: 'Query too long' }, { status: 400 })
    }

    await supabase.from('search_log').insert({ user_id: user.id, query: trimmed })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Search suggest POST error:', e)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
