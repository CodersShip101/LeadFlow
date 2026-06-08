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

export async function POST() {
  const startTime = Date.now()
  const result = { found: 0, passed_filter: 0, inserted: 0, skipped_duplicates: 0, errors: [] as string[] }

  try {
    const supabase = await createAdminSupabase()

    const [reddit, remotive, wwr, reed, cwjobs, indeed] = await Promise.all([
      fetchRedditPosts(),
      fetchRemotivePosts(),
      fetchWWRPosts(),
      fetchReedPosts(),
      fetchCWJobsPosts(),
      fetchIndeedPosts(),
    ])

    const allPosts = [...reddit, ...remotive, ...wwr, ...reed, ...cwjobs, ...indeed]
    result.found = allPosts.length

    const { data: existing } = await supabase
      .from('leads')
      .select('source_url')
      .not('source_url', 'is', null)

    const existingUrls = new Set(existing?.map((l: any) => l.source_url) || [])
    const newPosts = allPosts.filter((p: any) => !existingUrls.has(p.source_url))
    result.skipped_duplicates = allPosts.length - newPosts.length

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

    // #1: Email alerts — notify users about high-match leads
    if (insertedLeads.length > 0) {
      try {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, skills, hourly_rate')
          .not('email', 'is', null)

        if (profiles) {
          for (const profile of profiles) {
            if (!profile.email) continue
            const ps = (profile.skills || []).map((s: string) => s.toLowerCase())

            const matches: { title: string; score: number; matched: number; url: string; budget: string }[] = []

            for (const lead of insertedLeads) {
              let matched = 0
              for (const s of (lead.skills_required || [])) {
                if (ps.includes((s as string).toLowerCase())) matched++
              }

              let score = 5
              if (lead.budget_min || lead.budget_max) score += 2
              if (lead.skills_required && lead.skills_required.length > 0) score += 2
              if (lead.client_location) score += 1
              score = Math.max(1, Math.min(10, score))

              if (score >= 7 && matched > 0) {
                const budget = lead.budget_min && lead.budget_max
                  ? `£${lead.budget_min}—${lead.budget_max}`
                  : lead.budget_min ? `From £${lead.budget_min}` : ''
                matches.push({ title: lead.title, score, matched, url: lead.source_url, budget })
              }
            }

            if (matches.length > 0) {
              const topMatch = matches.sort((a, b) => b.score - a.score || b.matched - a.matched)[0]
              const matchHtml = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB">
        <tr><td style="padding:32px 32px 16px">
          <h1 style="font-size:20px;font-weight:700;margin:0;color:#1A1D23">New lead matches your skills</h1>
          <p style="font-size:13px;color:#6B7280;margin:6px 0 0">${matches.length} new lead${matches.length > 1 ? 's' : ''} matched your profile on LeadFlow</p>
        </td></tr>
        ${matches.slice(0, 3).map((m, i) => `
        <tr><td style="padding:${i === 0 ? '8' : '4'}px 32px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;padding:12px">
            <tr><td>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:13px;font-weight:600;color:#1A1D23">${m.title}</span>
                <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:${m.score >= 8 ? '#EBF5F0' : '#FEF3E2'};color:${m.score >= 8 ? '#1B6B4A' : '#D97706'}">${m.score}/10</span>
              </div>
              <div style="font-size:11px;color:#9CA3AF">${m.budget} · ${m.matched} skill${m.matched > 1 ? 's' : ''} match</div>
            </td></tr>
          </table>
        </td></tr>
        `).join('')}
        <tr><td style="padding:24px 32px 32px;text-align:center">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://lead-flow-gpyj.vercel.app'}/dashboard"
             style="display:inline-block;padding:12px 24px;background:#1B6B4A;color:white;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px">
            View on LeadFlow
          </a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'LeadFlow <onboarding@resend.dev>',
                  to: [profile.email],
                  subject: `New lead: ${topMatch.title} (${topMatch.score}/10 match)`,
                  html: matchHtml,
                }),
              }).catch(() => {})
            }
          }
        }
      } catch {}
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
