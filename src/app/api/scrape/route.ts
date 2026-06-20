import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

export const maxDuration = 300

export async function POST() {
  try {
    const { scrapeAll } = await import('@/lib/ai-scrape')
    const result = await scrapeAll()

    // Try to store scrape log (table may not exist yet — non-blocking)
    try {
      const supabase = await createAdminSupabase()
      await supabase.from('leads_scrape_log').insert({
        duration_ms: result.duration,
        reddit: result.reddit,
        wwr: result.wwr,
        remotive: result.remotive,
        accepted: result.accepted,
        rejected: result.rejected,
        inserted: result.inserted,
        avg_score: parseFloat(result.avgScore || '0'),
      })
    } catch {}

    return NextResponse.json(result)
  } catch (error) {
    console.error('Scrape error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Scrape failed', message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createAdminSupabase()
    const { data: lastScrape } = await supabase
      .from('leads_scrape_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, title, posted_date')
      .order('posted_date', { ascending: false })
      .limit(5)

    return NextResponse.json({
      lastScrape: lastScrape || null,
      recentLeads: recentLeads || [],
      openRouterConfigured: !!process.env.OPENROUTER_API_KEY,
      redditConfigured: !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
