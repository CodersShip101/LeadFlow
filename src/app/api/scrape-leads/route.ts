import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { processLeadWithAI } from '@/lib/zen'

async function fetchRedditPosts() {
  const res = await fetch('https://www.reddit.com/r/forhire/new.json?limit=50', {
    headers: { 'User-Agent': 'LeadFlow/1.0' },
  })
  const data = await res.json()
  return (data.data?.children || [])
    .filter(({ data: p }: any) => !p.stickied && p.post_hint !== 'link')
    .map(({ data: p }: any) => ({
      rawText: `Title: ${p.title}\n\n${(p.selftext || '').substring(0, 3000)}`,
      source_url: `https://reddit.com${p.permalink}`,
    }))
}

async function fetchRemotivePosts() {
  const res = await fetch('https://remotive.com/api/remote-jobs')
  const data = await res.json()
  return (data.jobs || []).map((job: any) => ({
    rawText: `Title: ${job.title}\nCompany: ${job.company_name || ''}\nCategory: ${job.category || ''}\n\n${(job.description || '').substring(0, 3000)}`,
    source_url: job.url || '',
  }))
}

async function fetchWWRPosts() {
  const res = await fetch('https://weworkremotely.com/remote-jobs.rss')
  const text = await res.text()
  const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
  return items.map((item: string) => ({
    rawText: `Title: ${(item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '').replace(/<[^>]*>/g, '')}\n\n${(item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
    source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
  }))
}

export async function POST() {
  const startTime = Date.now()
  const result = { found: 0, passed_filter: 0, inserted: 0, skipped_duplicates: 0, errors: [] as string[] }

  try {
    const supabase = await createAdminSupabase()

    // Fetch from all sources
    const [reddit, remotive, wwr] = await Promise.all([
      fetchRedditPosts(),
      fetchRemotivePosts(),
      fetchWWRPosts(),
    ])

    const allPosts = [...reddit, ...remotive, ...wwr]
    result.found = allPosts.length

    // Get existing source URLs to skip duplicates
    const { data: existing } = await supabase
      .from('leads')
      .select('source_url')
      .not('source_url', 'is', null)

    const existingUrls = new Set(existing?.map((l: any) => l.source_url) || [])

    const newPosts = allPosts.filter((p: any) => !existingUrls.has(p.source_url))
    result.skipped_duplicates = allPosts.length - newPosts.length

    // Process each post through AI
    for (const post of newPosts) {
      try {
        const parsed = await processLeadWithAI(post.rawText)
        const score = parsed.quality_score || 0

        if (score < 6) continue
        result.passed_filter++

        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 7)

        const { error } = await supabase.from('leads').insert({
          title: parsed.title || 'Untitled',
          description: parsed.description || post.rawText.substring(0, 500),
          budget_min: parsed.budget_min || null,
          budget_max: parsed.budget_max || null,
          skills_required: parsed.skills_required || [],
          project_type: parsed.project_type || null,
          client_location: parsed.client_location || 'Remote',
          source_url: post.source_url,
          status: 'active',
          expiry_date: expiryDate.toISOString(),
        })

        if (error) {
          result.errors.push(error.message)
        } else {
          result.inserted++
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        result.errors.push(msg.substring(0, 100))
      }
    }

    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createAdminSupabase()
    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, title, posted_date')
      .order('posted_date', { ascending: false })
      .limit(5)

    return NextResponse.json({
      recentLeads: recentLeads || [],
      zenConfigured: !!process.env.ZEN_API_KEY,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
