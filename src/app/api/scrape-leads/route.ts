import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { processLeadWithAI } from '@/lib/zen'

async function fetchRedditPosts() {
  try {
    const res = await fetch('https://www.reddit.com/r/forhire/new.json?limit=10', {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data?.children || [])
      .filter(({ data: p }: any) => !p.stickied && p.post_hint !== 'link')
      .map(({ data: p }: any) => ({
        rawText: `Title: ${p.title}\n\n${(p.selftext || '').substring(0, 3000)}`,
        source_url: `https://reddit.com${p.permalink}`,
      }))
  } catch { return [] }
}

async function fetchRemotivePosts() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs')
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).slice(0, 15).map((job: any) => ({
      rawText: `Title: ${job.title}\nCompany: ${job.company_name || ''}\nCategory: ${job.category || ''}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      source_url: job.url || '',
    }))
  } catch { return [] }
}

async function fetchWWRPosts() {
  try {
    const res = await fetch('https://weworkremotely.com/remote-jobs.rss')
    if (!res.ok) return []
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
    return items.slice(0, 15).map((item: string) => ({
      rawText: `Title: ${(item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '').replace(/<[^>]*>/g, '')}\n\n${(item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
    }))
  } catch { return [] }
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

    // Process posts through AI in parallel batches of 3
    const batchSize = 3
    for (let i = 0; i < newPosts.length; i += batchSize) {
      const batch = newPosts.slice(i, i + batchSize)
      const results = await Promise.all(batch.map((post: any) =>
        processLeadWithAI(post.rawText).then(parsed => ({ parsed, post })).catch(e => ({ error: e instanceof Error ? e.message.substring(0, 100) : 'Unknown error', post }))
      ))

      for (const r of results) {
        if ('error' in r) {
          result.errors.push(r.error)
          continue
        }
        const score = r.parsed.quality_score || 0
        if (score < 2) continue
        result.passed_filter++

        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + 7)

        const { error } = await supabase.from('leads').insert({
          title: r.parsed.title || 'Untitled',
          description: r.parsed.description || r.post.rawText.substring(0, 500),
          budget_min: r.parsed.budget_min || null,
          budget_max: r.parsed.budget_max || null,
          skills_required: r.parsed.skills_required || [],
          project_type: r.parsed.project_type || null,
          client_location: r.parsed.client_location || 'Remote',
          source_url: r.post.source_url,
          status: 'active',
          expiry_date: expiryDate.toISOString(),
        })

        if (error) {
          result.errors.push(error.message)
        } else {
          result.inserted++
        }
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
