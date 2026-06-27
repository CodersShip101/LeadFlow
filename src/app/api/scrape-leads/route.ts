import { NextResponse } from 'next/server'
import { runSchedule } from '@/lib/scheduler'

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runSchedule('medium')
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  // Vercel Cron drives the hourly run via an authorized GET. A normal GET (e.g.
  // the admin dashboard) just returns scrape status.
  if (process.env.CRON_SECRET && req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) {
    try {
      return NextResponse.json(await runSchedule('medium'))
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
  }

  try {
    const { createAdminSupabase } = await import('@/lib/supabase-server')
    const supabase = await createAdminSupabase()
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, title, posted_date')
      .order('posted_date', { ascending: false })
      .limit(5)
    const { data: lastScrape } = await supabase
      .from('leads_scrape_log')
      .select('created_at, inserted')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return NextResponse.json({
      recentLeads: recentLeads || [],
      lastScrapedAt: lastScrape?.created_at || null,
      zenConfigured: !!process.env.ZEN_API_KEY,
      jsearchConfigured: !!process.env.RAPIDAPI_KEY,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
