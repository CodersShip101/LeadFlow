/**
 * POST /api/alerts/dispatch
 * Called after each scrape run (internally, with CRON_SECRET).
 * Finds users with active alert preferences and emails them about
 * any new leads that exceed their minScore threshold.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { scoreLead, type ScoringLead, type ScoringWeights } from '@/lib/scoring'
import { ENTITLEMENTS, type Tier } from '@/lib/tiers'

export async function POST(req: NextRequest) {
  // Protect with cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminSupabase()

  // Fetch leads posted in the last scan window (past 2 hours)
  const since = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  const { data: newLeads } = await admin
    .from('leads')
    .select('*')
    .gte('posted_date', since)
    .eq('status', 'active')

  if (!newLeads?.length) return NextResponse.json({ dispatched: 0, reason: 'no new leads' })

  // Fetch users with alerts enabled and plans that support it
  const eligiblePlans = (Object.keys(ENTITLEMENTS) as Tier[])
    .filter(p => ENTITLEMENTS[p].customAlerts)

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, email, skills, hourly_rate, subscription_status, scoring_weights, alert_preferences')
    .in('subscription_status', eligiblePlans)
    .not('email', 'is', null)

  if (!profiles?.length) return NextResponse.json({ dispatched: 0, reason: 'no eligible users' })

  let dispatched = 0

  for (const profile of profiles) {
    const prefs = profile.alert_preferences as {
      enabled: boolean
      minScore: number
      sources: string[]
      keywords: string[]
    } | null

    if (!prefs?.enabled) continue

    const userProfile = {
      skills: profile.skills ?? [],
      hourly_rate: profile.hourly_rate ?? null,
      weights: (profile.scoring_weights as ScoringWeights | null) ?? undefined,
    }

    const matches = newLeads.filter(lead => {
      // Source filter
      if (prefs.sources.length > 0 && !prefs.sources.includes(lead.source)) return false
      // Keyword filter
      if (prefs.keywords.length > 0) {
        const text = `${lead.title} ${lead.description}`.toLowerCase()
        if (!prefs.keywords.some((kw: string) => text.includes(kw.toLowerCase()))) return false
      }
      // Score threshold
      const scored = scoreLead(lead as unknown as ScoringLead, userProfile)
      return scored.score >= prefs.minScore
    })

    if (!matches.length) continue

    const leadList = matches.slice(0, 5).map(l => {
      const scored = scoreLead(l as unknown as ScoringLead, userProfile)
      return `
        <tr>
          <td style="padding:10px 16px;border-bottom:1px solid #E5E7EB">
            <strong style="font-size:13px;color:#111827">${l.title}</strong>
            <span style="font-size:11px;font-weight:600;padding:1px 6px;border-radius:4px;background:${scored.score >= 8 ? '#EBF5F0' : '#FEF3E2'};color:${scored.score >= 8 ? '#1B6B4A' : '#D97706'};margin-left:6px">${scored.score}/10</span>
            <div style="font-size:11px;color:#6B7280;margin-top:3px">${l.source} · ${l.client_location ?? 'Remote'}</div>
          </td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F9FAFB;margin:0;padding:24px">
      <table width="520" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;margin:0 auto">
        <tr><td style="padding:24px 24px 16px">
          <h2 style="font-size:17px;font-weight:700;margin:0;color:#111827">
            <span style="color:#5E8F00">⚡</span> ${matches.length} new lead${matches.length > 1 ? 's' : ''} scored above ${prefs.minScore}
          </h2>
          <p style="font-size:13px;color:#6B7280;margin:6px 0 0">Just posted — apply early for the best response rate.</p>
        </td></tr>
        <tr><td><table width="100%">${leadList}</table></td></tr>
        <tr><td style="padding:20px 24px;text-align:center">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="background:#111827;color:#C4F000;padding:10px 22px;border-radius:8px;font-weight:600;font-size:13px;text-decoration:none">View all leads</a>
        </td></tr>
        <tr><td style="padding:0 24px 20px;text-align:center;font-size:11px;color:#9CA3AF">
          You're receiving this because you set a score alert on LeadFlow.<br>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/profile" style="color:#9CA3AF">Manage alerts</a>
        </td></tr>
      </table>
    </body></html>`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LeadFlow Alerts <alerts@leadflow.dev>',
          to: [profile.email],
          subject: `${matches.length} new lead${matches.length > 1 ? 's' : ''} matched your alert (score ${prefs.minScore}+)`,
          html,
        }),
      })
      if (res.ok) dispatched++
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ dispatched, leadsChecked: newLeads.length, usersChecked: profiles.length })
}
