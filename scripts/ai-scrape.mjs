/**
 * LeadFlow AI Scraper
 *
 * Scrapes Reddit r/forhire, We Work Remotely, Remotive
 * Filters and scores leads via DeepSeek (OpenRouter)
 * Inserts quality leads (score >= 6) into Supabase
 *
 * Usage:
 *   node scripts/ai-scrape.mjs              # CLI
 *   call scrapeAll()                        # Programmatic
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET

const AI_MODEL = process.env.AI_MODEL || 'deepseek/deepseek-v4-flash'

const QUALITY_PROMPT = `You are a lead quality analyst for a freelance platform. Analyze the given job post and return JSON:

{
  "title": "cleaned title",
  "description": "cleaned description (max 500 chars)",
  "budget_min": number or null,
  "budget_max": number or null,
  "project_type": "one-off" | "ongoing" | null,
  "skills_required": ["skill1", "skill2"],
  "client_location": "Remote" | "City, Country" | null,
  "quality_score": number 1-10,
  "rejection_reason": "string or null if accepted"
}

Rules:
- quality_score 1-10 based on: clear budget, defined scope, legitimate client, remote-friendly
- Reject (score < 6) if: no budget, "exposure" payment, vague scope, MLM, no company info
- Extract UK currency as GBP, US as USD. Convert to numeric.
- Extract skills as a clean list. Infer skills from description if needed.
- If location is "remote" or not specified, use "Remote"
- Return ONLY valid JSON, no other text.`

let _redditToken = null

async function getRedditToken() {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    console.log('Reddit API credentials not configured, skipping Reddit')
    return null
  }
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

async function scrapeReddit() {
  const token = await getRedditToken()
  if (!token) return []

  const res = await fetch('https://oauth.reddit.com/r/forhire/search?q=freelance+OR+contractor+OR+remote+OR+help+OR+need&restrict_sr=1&sort=new&limit=25&t=week', {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'LeadFlow/1.0' },
  })
  const data = await res.json()
  const posts = data.data?.children || []

  return posts
    .filter(({ data: p }) => !p.stickied && p.post_hint !== 'link')
    .map(({ data: p }) => ({
      title: p.title,
      description: (p.selftext || '').substring(0, 3000),
      source_url: `https://reddit.com${p.permalink}`,
      posted_date: new Date(p.created_utc * 1000).toISOString(),
    }))
}

async function scrapeWWR() {
  try {
    const res = await fetch('https://we-work-remotely.com/remote-jobs.rss')
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
    return items.slice(0, 15).map((item) => ({
      title: (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || '').replace(/<[^>]*>/g, ''),
      description: (item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').substring(0, 3000),
      source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
      posted_date: new Date(item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '').toISOString(),
    }))
  } catch (e) {
    console.error('WWR scrape error:', e.message)
    return []
  }
}

async function scrapeRemotive() {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=5')
    const data = await res.json()
    return (data.jobs || []).map((job) => ({
      title: job.title,
      description: `${job.description || ''}\nCompany: ${job.company_name || ''}\nCategory: ${job.category || ''}`.substring(0, 3000),
      source_url: job.url || '',
      posted_date: job.publication_date || new Date().toISOString(),
    }))
  } catch (e) {
    console.error('Remotive scrape error:', e.message)
    return []
  }
}

async function aiFilter(post) {
  if (!OPENROUTER_API_KEY) {
    console.log('OpenRouter key not configured, returning raw post without filter')
    return [{
      ...post,
      budget_min: null,
      budget_max: null,
      project_type: null,
      skills_required: [],
      client_location: 'Remote',
      quality_score: 5,
    }]
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://leadflow.app',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: QUALITY_PROMPT },
          { role: 'user', content: `Title: ${post.title}\n\nDescription: ${post.description}\n\nSource: ${post.source_url}` },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      const msg = `AI ${res.status} for "${post.title.substring(0, 50)}": ${err.substring(0, 150)}`
      console.error(msg)
      return [{ error: msg }]
    }

    const data = await res.json()
    const parsed = JSON.parse(data.choices[0].message.content)
    return [{
      title: parsed.title || post.title,
      description: parsed.description || post.description.substring(0, 500),
      source_url: post.source_url,
      posted_date: post.posted_date,
      budget_min: parsed.budget_min || null,
      budget_max: parsed.budget_max || null,
      project_type: parsed.project_type || null,
      skills_required: parsed.skills_required || [],
      client_location: parsed.client_location || 'Remote',
      quality_score: parsed.quality_score || 5,
      status: 'active',
    }]
  } catch (e) {
    console.error(`AI filter exception for "${post.title.substring(0, 50)}":`, e.message)
    return []
  }
}

async function insertLeads(leads) {
  if (leads.length === 0) return 0
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify(leads.map(({ quality_score, ...lead }) => lead)),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('Supabase insert error:', err.substring(0, 300))
    return 0
  }
  return leads.length
}

export async function scrapeAll() {
  const startTime = Date.now()
  const results = { reddit: 0, wwr: 0, remotive: 0, accepted: 0, rejected: 0, inserted: 0, avgScore: '0', duration: 0, errors: [] }

  console.log(`\n[${new Date().toISOString()}] LeadFlow Scraper started`)

  const [redditPosts, wwrPosts, remotivePosts] = await Promise.all([
    scrapeReddit(),
    scrapeWWR(),
    scrapeRemotive(),
  ])

  console.log(`Found: ${redditPosts.length} Reddit, ${wwrPosts.length} WWR, ${remotivePosts.length} Remotive`)

  const allPosts = [...redditPosts, ...wwrPosts, ...remotivePosts]
  if (allPosts.length === 0) {
    console.log('No posts found from any source')
    return { ...results, duration: Date.now() - startTime }
  }

  results.reddit = redditPosts.length
  results.wwr = wwrPosts.length
  results.remotive = remotivePosts.length

  // Process in batches — sequential for free models to avoid rate limits
  const batchSize = 1
  const allFiltered = []

  for (let i = 0; i < allPosts.length; i += batchSize) {
    const batch = allPosts.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(aiFilter))
    for (const r of batchResults) {
      const errors = r.filter((x) => x.error)
      if (errors.length > 0) {
        results.errors.push(...errors.map((e) => e.error))
      }
      allFiltered.push(...r.filter((x) => !x.error))
    }
    if (i + batchSize < allPosts.length) {
      await new Promise((r) => setTimeout(r, 3000))
    }
  }

  const accepted = allFiltered.filter((l) => (l.quality_score || 0) >= 6)
  const rejected = allFiltered.filter((l) => (l.quality_score || 0) < 6)

  results.accepted = accepted.length
  results.rejected = rejected.length
  results.avgScore = allFiltered.length > 0
    ? (allFiltered.reduce((s, l) => s + (l.quality_score || 0), 0) / allFiltered.length).toFixed(1)
    : 0

  if (accepted.length > 0) {
    const inserted = await insertLeads(accepted)
    results.inserted = inserted
    console.log(`Inserted ${inserted}/${accepted.length} accepted leads`)
  }

  if (rejected.length > 0) {
    console.log(`Rejected ${rejected.length} low-quality leads`)
    rejected.slice(0, 3).forEach((l) =>
      console.log(`  - "${l.title.substring(0, 60)}" (score: ${l.quality_score})`)
    )
  }

  results.duration = Date.now() - startTime
  console.log(`Done in ${(results.duration / 1000).toFixed(1)}s — ${results.inserted} leads added`)
  return results
}

// CLI runner
if (process.argv[1]?.endsWith('ai-scrape.mjs')) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing SUPABASE env vars')
    process.exit(1)
  }

  scrapeAll().then((r) => {
    console.log('\nSummary:', JSON.stringify(r, null, 2))
    process.exit(0)
  }).catch((e) => {
    console.error('Fatal:', e)
    process.exit(1)
  })
}
