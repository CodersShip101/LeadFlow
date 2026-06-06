/**
 * Lead Scraping Script
 *
 * Scrapes job posts from Reddit r/forhire and We Work Remotely RSS
 * Filters and inserts matching leads into Supabase.
 *
 * Run: node scripts/scrape-leads.mjs
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

async function scrapeReddit() {
  try {
    const res = await fetch('https://www.reddit.com/r/forhire/search.json?q=freelance+OR+contractor+OR+remote&restrict_sr=1&sort=new&limit=25')
    const data = await res.json()
    const posts = data.data?.children || []

    return posts
      .map(({ data: post }) => ({
        title: post.title,
        description: post.selftext?.substring(0, 2000) || post.title,
        source_url: `https://reddit.com${post.permalink}`,
        posted_date: new Date(post.created_utc * 1000).toISOString(),
        budget_min: null,
        budget_max: null,
        project_type: null,
        skills_required: [],
        client_location: null,
        status: 'active',
      }))
      .filter((post) => {
        const text = `${post.title} ${post.description}`.toLowerCase()
        const hasBudget = /\£|\$|\d{3,}/.test(text)
        const hasRedFlags = /exposure|unpaid|equity only/.test(text)
        return hasBudget && !hasRedFlags
      })
  } catch (error) {
    console.error('Reddit scrape error:', error)
    return []
  }
}

async function scrapeWeWorkRemotely() {
  try {
    const res = await fetch('https://we-work-remotely.com/remote-jobs.rss')
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []

    return items.slice(0, 15).map((item) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || ''
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] || ''
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

      return {
        title: title.replace(/<[^>]*>/g, ''),
        description: description.replace(/<[^>]*>/g, '').substring(0, 2000),
        source_url: link,
        posted_date: new Date(pubDate).toISOString(),
        budget_min: null,
        budget_max: null,
        project_type: null,
        skills_required: [],
        client_location: 'Remote',
        status: 'active',
      }
    }).filter((job) => {
      const text = `${job.title} ${job.description}`.toLowerCase()
      const relevant = /freelance|contract|remote|independent/.test(text)
      return relevant
    })
  } catch (error) {
    console.error('Weworkremotely scrape error:', error)
    return []
  }
}

async function insertLeads(leads) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(leads),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('Supabase insert error:', errorText)
    return 0
  }

  return leads.length
}

async function main() {
  console.log('Starting lead scrape...')

  const [redditLeads, wwrLeads] = await Promise.all([
    scrapeReddit(),
    scrapeWeWorkRemotely(),
  ])

  const allLeads = [...redditLeads, ...wwrLeads]
  console.log(`Found ${redditLeads.length} leads from Reddit`)
  console.log(`Found ${wwrLeads.length} leads from We Work Remotely`)

  if (allLeads.length === 0) {
    console.log('No leads found')
    return
  }

  const inserted = await insertLeads(allLeads)
  console.log(`Inserted ${inserted} leads into database`)
}

main().catch(console.error)
