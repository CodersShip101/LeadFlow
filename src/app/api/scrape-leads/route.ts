import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { processLeadWithAI } from '@/lib/zen'
import { scoreLead, type ScoringLead, type ScoringWeights } from '@/lib/scoring'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'
import { isDirectApply } from '@/lib/lead-filters'

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
    return items.slice(0, 15).map((item: string) => {
      const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
      return {
        rawText: `Title: ${decode(item.match(/<title>(.*?)<\/title>/)?.[1] || '').replace(/<[^>]*>/g, '')}\n\n${decode(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
        source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
      }
    })
  } catch { return [] }
}

async function fetchReedPosts() {
  try {
    const res = await fetch('https://www.reed.co.uk/jobs/rss/freelance?keywords=developer+designer+writer+marketing', {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (!res.ok) return []
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
    return items.slice(0, 15).map((item: string) => {
      const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
      return {
        rawText: `Title: ${decode(item.match(/<title>(.*?)<\/title>/)?.[1] || '').replace(/<[^>]*>/g, '')}\nCompany: ${decode(item.match(/<company>(.*?)<\/company>/)?.[1] || '')}\nLocation: ${decode(item.match(/<location>(.*?)<\/location>/)?.[1] || '')}\n\n${decode(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
        source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
      }
    })
  } catch { return [] }
}

async function fetchCWJobsPosts() {
  try {
    const res = await fetch('https://www.cwjobs.co.uk/jobs/rss?keywords=contract+freelance', {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (!res.ok) return []
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
    return items.slice(0, 15).map((item: string) => {
      const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
      return {
        rawText: `Title: ${decode(item.match(/<title>(.*?)<\/title>/)?.[1] || '').replace(/<[^>]*>/g, '')}\n\n${decode(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
        source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
      }
    })
  } catch { return [] }
}

async function fetchIndeedPosts() {
  try {
    const res = await fetch('https://uk.indeed.com/rss?q=freelance+contract&l=United+Kingdom', {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (!res.ok) return []
    const text = await res.text()
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || []
    return items.slice(0, 15).map((item: string) => {
      const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
      return {
        rawText: `Title: ${decode(item.match(/<title>(.*?)<\/title>/)?.[1] || '').replace(/<[^>]*>/g, '')}\n\n${decode(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
        source_url: item.match(/<link>(.*?)<\/link>/)?.[1] || '',
      }
    })
  } catch { return [] }
}

async function fetchRemoteOKPosts() {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (!res.ok) return []
    const data = await res.json()
    // First element is metadata/legal notice — skip it
    return (Array.isArray(data) ? data.slice(1) : []).slice(0, 20).map((job: any) => ({
      rawText: `Title: ${job.position || job.title || ''}\nCompany: ${job.company || ''}\nTags: ${(job.tags || []).join(', ')}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      source_url: job.url || (job.id ? `https://remoteok.com/remote-jobs/${job.id}` : ''),
    }))
  } catch { return [] }
}

async function fetchHimalayasPosts() {
  try {
    const res = await fetch('https://himalayas.app/jobs/api', {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.jobs || []).slice(0, 20).map((job: any) => ({
      rawText: `Title: ${job.title || ''}\nCompany: ${job.companyName || ''}\nCategories: ${(job.categories || []).join(', ')}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      source_url: job.applicationLink || job.guid || '',
    }))
  } catch { return [] }
}

async function fetchArbeitnowPosts() {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: { 'User-Agent': 'LeadFlow/1.0' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.data || []).slice(0, 20).map((job: any) => ({
      rawText: `Title: ${job.title || ''}\nCompany: ${job.company_name || ''}\nTags: ${(job.tags || []).join(', ')}\nRemote: ${job.remote ? 'Yes' : 'No'}\n\n${(job.description || '').replace(/<[^>]*>/g, '').substring(0, 3000)}`,
      source_url: job.url || '',
    }))
  } catch { return [] }
}

export async function POST() {
  const startTime = Date.now()
  const result = { found: 0, passed_filter: 0, inserted: 0, skipped_duplicates: 0, skipped_bidding: 0, errors: [] as string[] }

  try {
    const supabase = await createAdminSupabase()

    const [reddit, remotive, wwr, reed, cwjobs, indeed, remoteok, himalayas, arbeitnow] = await Promise.all([
      fetchRedditPosts(),
      fetchRemotivePosts(),
      fetchWWRPosts(),
      fetchReedPosts(),
      fetchCWJobsPosts(),
      fetchIndeedPosts(),
      fetchRemoteOKPosts(),
      fetchHimalayasPosts(),
      fetchArbeitnowPosts(),
    ])

    const allPosts = [...reddit, ...remotive, ...wwr, ...reed, ...cwjobs, ...indeed, ...remoteok, ...himalayas, ...arbeitnow]
    result.found = allPosts.length

    const { data: existing } = await supabase
      .from('leads')
      .select('source_url')
      .not('source_url', 'is', null)

    const existingUrls = new Set(existing?.map((l: any) => l.source_url) || [])
    const deduped = allPosts.filter((p: any) => !existingUrls.has(p.source_url))
    result.skipped_duplicates = allPosts.length - deduped.length

    // ── Direct Apply Only: drop posts that funnel to bidding marketplaces ──
    const newPosts = deduped.filter((p: any) => isDirectApply(p.source_url, p.rawText))
    result.skipped_bidding = deduped.length - newPosts.length

    const insertedLeads: any[] = []

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
        expiryDate.setDate(expiryDate.getDate() + 14)

        const leadRow = {
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
        }

        const { error } = await supabase.from('leads').insert(leadRow)

        if (error) {
          result.errors.push(error.message)
        } else {
          result.inserted++
          insertedLeads.push(leadRow)
        }
      }
    }

    // ── Alert dispatch: notify users whose score threshold is met ──
    if (insertedLeads.length > 0 && process.env.RESEND_API_KEY) {
      try {
        const eligiblePlans = (Object.keys(ENTITLEMENTS) as Tier[])
          .filter(p => ENTITLEMENTS[p].customAlerts)

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, skills, hourly_rate, subscription_status, scoring_weights, alert_preferences')
          .not('email', 'is', null)
          .in('subscription_status', eligiblePlans)

        for (const profile of (profiles ?? [])) {
          const prefs = profile.alert_preferences as {
            enabled: boolean; minScore: number; sources: string[]; keywords: string[]
          } | null
          if (!prefs?.enabled) continue

          const userProfile = {
            skills: profile.skills ?? [],
            hourly_rate: profile.hourly_rate ?? null,
            weights: (profile.scoring_weights as ScoringWeights | null) ?? undefined,
          }

          const matches = insertedLeads.filter(lead => {
            if (prefs.sources.length > 0 && !prefs.sources.includes(lead.source)) return false
            if (prefs.keywords.length > 0) {
              const text = `${lead.title} ${lead.description}`.toLowerCase()
              if (!prefs.keywords.some((kw: string) => text.includes(kw.toLowerCase()))) return false
            }
            return scoreLead(lead as unknown as ScoringLead, userProfile).score >= prefs.minScore
          })

          if (!matches.length) continue

          const topMatch = matches
            .map(l => ({ lead: l, score: scoreLead(l as unknown as ScoringLead, userProfile).score }))
            .sort((a, b) => b.score - a.score)[0]

          const rows = matches.slice(0, 3).map((l, i) => {
            const sc = scoreLead(l as unknown as ScoringLead, userProfile).score
            const budget = l.budget_max ? `£${l.budget_min ?? 0}–${l.budget_max}` : l.budget_min ? `From £${l.budget_min}` : ''
            return `<tr><td style="padding:${i === 0 ? '8' : '4'}px 28px">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;padding:12px">
                <tr><td>
                  <span style="font-size:13px;font-weight:600;color:#111827">${l.title}</span>
                  <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;background:${sc >= 8 ? '#EBF5F0' : '#FEF3E2'};color:${sc >= 8 ? '#1B6B4A' : '#D97706'}">${sc}/10</span>
                  <div style="font-size:11px;color:#6B7280;margin-top:3px">${budget}${budget ? ' · ' : ''}${l.client_location ?? 'Remote'}</div>
                </td></tr>
              </table>
            </td></tr>`
          }).join('')

          const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,sans-serif">
            <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px">
              <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB">
                <tr><td style="padding:28px 28px 12px">
                  <h1 style="font-size:18px;font-weight:700;margin:0;color:#111827">⚡ ${matches.length} new lead${matches.length > 1 ? 's' : ''} scored ${prefs.minScore}+</h1>
                  <p style="font-size:13px;color:#6B7280;margin:5px 0 0">Just scraped — apply early for the best response rate.</p>
                </td></tr>
                ${rows}
                <tr><td style="padding:20px 28px 28px;text-align:center">
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lead-flow-gpyj.vercel.app'}/dashboard"
                     style="background:#111827;color:#C4F000;padding:11px 24px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;display:inline-block">
                    View all leads
                  </a>
                </td></tr>
                <tr><td style="padding:0 28px 20px;text-align:center;font-size:11px;color:#9CA3AF">
                  You're receiving this because you set a score alert on LeadFlow.<br>
                  <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lead-flow-gpyj.vercel.app'}/dashboard/profile" style="color:#9CA3AF">Manage alerts</a>
                </td></tr>
              </table>
            </td></tr></table>
          </body></html>`

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'LeadFlow Alerts <alerts@leadflow.dev>',
              to: [profile.email],
              subject: `${matches.length} new lead${matches.length > 1 ? 's' : ''} hit your ${prefs.minScore}+ alert — ${topMatch.lead.title}`,
              html,
            }),
          }).catch(() => {})
        }
      } catch { /* non-blocking — don't fail scrape if alerts error */ }
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
