import { createAdminSupabase } from '@/lib/supabase-server'
import { sourcesForSchedule, harvestAll } from '../harvester/registry'
import { runProcessor } from '../processor'
import { processLeadWithAI } from '@/lib/zen'
import { isDirectApply } from '@/lib/lead-filters'
import { sendEmail } from '@/lib/email'
import { scoreLead, type ScoringLead, type ScoringWeights } from '@/lib/scoring'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'
import { recordRun, getFailingSources, fireAlert } from './monitor'
import type { ScheduleName } from '../harvester/types'

const MAX_PER_RUN = 24
const BATCH_SIZE = 3
// Stop starting new AI batches after this point. A batch's AI calls can each
// run up to 18s (see zen.ts), so leave room for the final batch + email/log to
// finish before Vercel's 60s function ceiling.
const DEADLINE_OFFSET = 30_000

function toInt(v: any): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

export async function runSchedule(schedule: ScheduleName): Promise<Record<string, any>> {
  const startTime = Date.now()
  const result = { found: 0, passed_filter: 0, inserted: 0, skipped_duplicates: 0, skipped_bidding: 0, errors: [] as string[] }

  const sources = sourcesForSchedule(schedule)
  const { posts, results: harvestResults } = await harvestAll(sources)

  result.found = posts.length
  recordRun(harvestResults)

  const failing = getFailingSources()
  for (const f of failing) {
    await fireAlert(f.source)
  }

  if (posts.length === 0) {
    try {
      const supabase = await createAdminSupabase()
      await supabase.from('leads_scrape_log').insert({
        duration_ms: Date.now() - startTime,
        inserted: 0, found: 0, passed_filter: 0, skipped_duplicates: 0, skipped_bidding: 0,
        source_metrics: harvestResults,
      })
    } catch {}
    return { ...result, timestamp: new Date().toISOString(), duration_ms: Date.now() - startTime }
  }

  const supabase = await createAdminSupabase()

  // Each post already carries its own `source` (tagged in harvestAll), so the
  // processor derives the correct source + fingerprint per post.
  const candidateFps = runProcessor(posts)
  const fpSet = new Set(candidateFps.map(p => p.fingerprint))
  const { data: existing } = fpSet.size > 0
    ? await supabase.from('leads').select('fingerprint').in('fingerprint', Array.from(fpSet))
    : { data: [] }
  const existingFps = new Set(existing?.map((l: any) => l.fingerprint) || [])

  const newPosts = candidateFps.filter(p => !existingFps.has(p.fingerprint))
  result.skipped_duplicates = posts.length - newPosts.length

  const directPosts = newPosts.filter(p => isDirectApply(p.sourceUrl, p.rawText))
  result.skipped_bidding = newPosts.length - directPosts.length

  const toProcess = directPosts.slice(0, MAX_PER_RUN)

  const insertedLeads: any[] = []
  const deadline = startTime + DEADLINE_OFFSET

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    if (Date.now() > deadline) break
    const batch = toProcess.slice(i, i + BATCH_SIZE)
    const aiResults = await Promise.all(batch.map(p =>
      processLeadWithAI(p.rawText).then(parsed => ({ parsed, post: p })).catch(e => ({ error: e instanceof Error ? e.message.substring(0, 100) : 'Unknown error', post: p }))
    ))

    for (const r of aiResults) {
      if ('error' in r) { result.errors.push(r.error); continue }
      const qs = r.parsed.quality_score || 0
      if (qs < 2) continue
      result.passed_filter++

      const expiryDate = new Date(); expiryDate.setDate(expiryDate.getDate() + 14)
      const ir35 = r.parsed.ir35 === 'inside' || r.parsed.ir35 === 'outside' ? r.parsed.ir35 : null

      const leadRow = {
        fingerprint: r.post.fingerprint,
        title: r.parsed.title || 'Untitled',
        description: r.parsed.description || r.post.rawText.substring(0, 500),
        responsibilities: Array.isArray(r.parsed.responsibilities) ? r.parsed.responsibilities.slice(0, 8) : [],
        benefits: Array.isArray(r.parsed.benefits) ? r.parsed.benefits.slice(0, 8) : [],
        budget_min: toInt(r.parsed.budget_min),
        budget_max: toInt(r.parsed.budget_max),
        skills_required: r.parsed.skills_required || [],
        project_type: r.parsed.project_type || null,
        client_location: r.parsed.client_location || 'Remote',
        client_name: r.parsed.client_name || null,
        source: r.post.source || 'direct',
        ir35,
        source_url: r.post.sourceUrl,
        status: 'active',
        ...(r.post.postedDate ? { posted_date: r.post.postedDate } : {}),
        expiry_date: expiryDate.toISOString(),
      }

      const { error } = await supabase
        .from('leads')
        .upsert(leadRow, { onConflict: 'source_url', ignoreDuplicates: true })

      if (error) { result.errors.push(error.message) }
      else { result.inserted++; insertedLeads.push(leadRow) }
    }
  }

  // Alert dispatch
  if (insertedLeads.length > 0 && process.env.SENDGRID_API_KEY) {
    try {
      const eligiblePlans = (Object.keys(ENTITLEMENTS) as Tier[]).filter(p => ENTITLEMENTS[p].customAlerts)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, skills, hourly_rate, subscription_status, scoring_weights, alert_preferences')
        .not('email', 'is', null)
        .in('subscription_status', eligiblePlans)

      for (const profile of (profiles ?? [])) {
        const prefs = profile.alert_preferences as { enabled: boolean; minScore: number; sources: string[]; keywords: string[] } | null
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

        const topMatch = matches.map(l => ({ lead: l, score: scoreLead(l as unknown as ScoringLead, userProfile).score })).sort((a, b) => b.score - a.score)[0]

        const rows = matches.slice(0, 3).map((l, i) => {
          const sc = scoreLead(l as unknown as ScoringLead, userProfile).score
          const budget = l.budget_max ? `£${l.budget_min ?? 0}–${l.budget_max}` : l.budget_min ? `From £${l.budget_min}` : ''
          return `<tr><td style="padding:${i === 0 ? '8' : '4'}px 28px">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;padding:12px">
              <tr><td>
                <span style="font-size:13px;font-weight:600;color:#111827">${escHtml(l.title)}</span>
                <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;background:${sc >= 8 ? '#EBF5F0' : '#FEF3E2'};color:${sc >= 8 ? '#1B6B4A' : '#D97706'}">${sc}/10</span>
                <div style="font-size:11px;color:#6B7280;margin-top:3px">${escHtml(budget)}${budget ? ' · ' : ''}${escHtml(l.client_location ?? 'Remote')}</div>
              </td></tr>
            </table>
          </td></tr>`
        }).join('')

        const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,sans-serif">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB">
              <tr><td style="padding:28px 28px 12px">
                <h1 style="font-size:18px;font-weight:700;margin:0;color:#111827">??? ${matches.length} new lead${matches.length > 1 ? 's' : ''} scored ${prefs.minScore}+</h1>
                <p style="font-size:13px;color:#6B7280;margin:5px 0 0">Just scraped — apply early for the best response rate.</p>
              </td></tr>
              ${rows}
              <tr><td style="padding:20px 28px 28px;text-align:center">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flaiir.co'}/dashboard" style="background:#111827;color:#C4F000;padding:11px 24px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none;display:inline-block">View all leads</a>
              </td></tr>
              <tr><td style="padding:0 28px 20px;text-align:center;font-size:11px;color:#9CA3AF">You're receiving this because you set a score alert on Flaiir.<br>
                <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flaiir.co'}/dashboard/profile" style="color:#9CA3AF">Manage alerts</a>
              </td></tr>
            </table>
          </td></tr></table>
        </body></html>`

        await sendEmail({ to: profile.email, subject: `${matches.length} new lead${matches.length > 1 ? 's' : ''} hit your ${prefs.minScore}+ alert — ${topMatch.lead.title}`, html })
      }
    } catch { /* non-blocking */ }
  }

  try {
    await supabase.from('leads_scrape_log').insert({
      duration_ms: Date.now() - startTime,
      inserted: result.inserted, found: result.found,
      passed_filter: result.passed_filter,
      skipped_duplicates: result.skipped_duplicates,
      skipped_bidding: result.skipped_bidding,
      source_metrics: harvestResults,
    })
  } catch {}

  return { ...result, timestamp: new Date().toISOString(), duration_ms: Date.now() - startTime }
}

function escHtml(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
