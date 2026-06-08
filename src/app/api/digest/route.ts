import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'

export async function POST() {
  const results: { email: string; success: boolean; error?: string }[] = []
  const supabase = createAdminSupabase()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, skills')
    .not('email', 'is', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No users found' })
  }

  for (const profile of profiles) {
    try {
      if (!profile.email) continue

      const { data: applications } = await supabase
        .from('applications')
        .select('status, outcome')
        .eq('freelancer_id', profile.id)

      const interested = applications?.filter(a => a.status === 'interested' || a.status === 'applied' || a.status === 'hired') || []
      const withOutcome = applications?.filter(a => a.outcome !== null) || []
      const won = withOutcome.filter(a => a.outcome === 'won').length
      const conversionRate = withOutcome.length > 0 ? Math.round((won / withOutcome.length) * 100) : 0

      const { data: leads } = await supabase
        .from('leads')
        .select('id, title, description, budget_min, budget_max, skills_required, client_location, posted_date')
        .eq('status', 'active')
        .order('posted_date', { ascending: false })
        .limit(50)

      const scoredLeads = (leads || []).map(l => {
        let score = 5
        if (l.budget_min || l.budget_max) score += 2
        if (l.skills_required && l.skills_required.length > 0) score += 2
        if (l.client_location) score += 1
        if (l.description && l.description.length > 100) score += 1
        if (l.description && l.description.length < 50) score -= 1
        score = Math.max(1, Math.min(10, score))

        let matchedSkills = 0
        if (profile.skills && l.skills_required) {
          const ps = profile.skills.map((s: string) => s.toLowerCase())
          for (const s of l.skills_required) {
            if (ps.includes(s.toLowerCase())) matchedSkills++
          }
        }

        return { ...l, score, matchedSkills }
      })
        .sort((a, b) => b.score - a.score || b.matchedSkills - a.matchedSkills)
        .slice(0, 3)

      const digestHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB">
        <tr><td style="padding:32px 32px 24px">
          <h1 style="font-size:20px;font-weight:700;margin:0;color:#1A1D23">Your Weekly LeadFlow Digest</h1>
          <p style="font-size:13px;color:#6B7280;margin:6px 0 0">Your top matches and weekly stats</p>
        </td></tr>
        <tr><td style="padding:0 32px 16px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding:12px;background:#EBF5F0;border-radius:8px;width:33%">
                <div style="font-size:18px;font-weight:700;color:#1B6B4A">${interested.length}</div>
                <div style="font-size:11px;color:#6B7280">Leads pursued</div>
              </td>
              <td width="8"></td>
              <td align="center" style="padding:12px;background:#F0EFFE;border-radius:8px;width:33%">
                <div style="font-size:18px;font-weight:700;color:#7C3AED">${conversionRate}%</div>
                <div style="font-size:11px;color:#6B7280">Conversion rate</div>
              </td>
              <td width="8"></td>
              <td align="center" style="padding:12px;background:#ECFDF5;border-radius:8px;width:33%">
                <div style="font-size:18px;font-weight:700;color:#059669">${won}</div>
                <div style="font-size:11px;color:#6B7280">Projects won</div>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 8px">
          <h2 style="font-size:14px;font-weight:600;margin:0;color:#1A1D23">Top 3 Matches This Week</h2>
        </td></tr>
        ${scoredLeads.map((lead, i) => `
        <tr><td style="padding:${i === 0 ? '12' : '8'}px 32px">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border-radius:8px;padding:12px">
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <span style="font-size:13px;font-weight:600;color:#1A1D23">${lead.title}</span>
                  <span style="font-size:10px;font-weight:600;padding:2px 6px;border-radius:4px;background:${lead.score >= 8 ? '#EBF5F0' : '#FEF3E2'};color:${lead.score >= 8 ? '#1B6B4A' : '#D97706'}">${lead.score}/10</span>
                </div>
                <p style="font-size:12px;color:#6B7280;margin:0;line-height:1.4">${(lead.description || '').substring(0, 120)}${(lead.description || '').length > 120 ? '...' : ''}</p>
                <div style="margin-top:6px;font-size:11px;color:#9CA3AF">
                  ${lead.budget_min || lead.budget_max ? `£${lead.budget_min || 0}${lead.budget_max ? ` - £${lead.budget_max}` : '+'}` : ''}${lead.client_location ? ` · ${lead.client_location}` : ''}${lead.matchedSkills > 0 ? ` · ${lead.matchedSkills} skill match` : ''}
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
        `).join('')}
        ${scoredLeads.length === 0 ? `
        <tr><td style="padding:12px 32px;text-align:center;color:#AAB0BB;font-size:13px">
          No new matching leads this week. Check back soon.
        </td></tr>
        ` : ''}
        <tr><td style="padding:24px 32px 32px;text-align:center">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://lead-flow-gpyj.vercel.app'}/dashboard"
             style="display:inline-block;padding:12px 24px;background:#1B6B4A;color:white;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px">
            View all leads on LeadFlow
          </a>
        </td></tr>
        <tr><td style="padding:0 32px 24px;text-align:center;font-size:11px;color:#9CA3AF">
          LeadFlow · Quality freelance leads, delivered weekly.<br>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://lead-flow-gpyj.vercel.app'}/dashboard/settings" style="color:#9CA3AF">Unsubscribe</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'LeadFlow <onboarding@resend.dev>',
          to: [profile.email],
          subject: `Your Weekly Digest — ${scoredLeads.length} new matches`,
          html: digestHtml,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        results.push({ email: profile.email, success: false, error: err.substring(0, 200) })
      } else {
        results.push({ email: profile.email, success: true })
      }
    } catch (err) {
      results.push({ email: profile.email || 'unknown', success: false, error: err instanceof Error ? err.message : 'Unknown' })
    }
  }

  return NextResponse.json({
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  })
}

export async function GET() {
  return NextResponse.json({ message: 'POST to /api/digest to send weekly digests to all users' })
}
