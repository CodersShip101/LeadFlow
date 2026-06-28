import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { isAuthorizedCron } from '@/lib/cron'
import { sendEmail } from '@/lib/email'
import { formatBudgetGBP } from '@/lib/utils'
import { canonSource, sourceMeta } from '@/lib/sources'

export const maxDuration = 60

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Emails users their due follow-up reminders, once each. Driven by the external
// scheduler (GitHub Actions) on a daily cadence, gated by CRON_SECRET.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = createAdminSupabase()
    const nowISO = new Date().toISOString()

    // Due = follow_up_at in the past and not yet emailed.
    const { data: due, error } = await admin
      .from('applications')
      .select('id, lead_id, freelancer_id, follow_up_at, follow_up_note')
      .lte('follow_up_at', nowISO)
      .is('follow_up_notified_at', null)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!due || due.length === 0) return NextResponse.json({ users_notified: 0, reminders_sent: 0 })

    const leadIds = [...new Set(due.map(d => d.lead_id))]
    const userIds = [...new Set(due.map(d => d.freelancer_id))]
    const [{ data: leads }, { data: profiles }] = await Promise.all([
      admin.from('leads').select('id, title, source_url, source, budget_min, budget_max, client_name').in('id', leadIds),
      admin.from('profiles').select('id, email, full_name').in('id', userIds),
    ])
    const leadMap = new Map((leads ?? []).map(l => [l.id, l]))
    const profMap = new Map((profiles ?? []).map(p => [p.id, p]))

    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.flaiir.co'
    const byUser = new Map<string, typeof due>()
    for (const d of due) {
      if (!byUser.has(d.freelancer_id)) byUser.set(d.freelancer_id, [])
      byUser.get(d.freelancer_id)!.push(d)
    }

    let usersNotified = 0
    const sentAppIds: string[] = []

    for (const [userId, items] of byUser) {
      const prof = profMap.get(userId)
      if (!prof?.email) continue

      const first = leadMap.get(items[0].lead_id)
      const firstTitle = first?.title || 'a lead'
      const n = items.length
      const subject = n === 1 ? `Time to follow up: ${firstTitle}` : `${n} follow-ups due on Flaiir`
      const preheader = n === 1 ? `Follow up on ${firstTitle}` : `${n} leads are ready for your next move`
      const headline = n === 1 ? 'Time to follow up' : `${n} leads to follow up on`
      const sub = n === 1
        ? 'You set a reminder to come back to this lead — here it is.'
        : 'You set reminders on these leads. They’re ready for your next move.'
      const mono = "'SFMono-Regular',ui-monospace,'Menlo',monospace"

      const rows = items.map(it => {
        const lead = leadMap.get(it.lead_id)
        const title = esc(lead?.title || 'Lead')
        const link = lead?.source_url || `${base}/dashboard/applied`
        const budget = lead ? formatBudgetGBP(lead.budget_min, lead.budget_max) : ''
        const src = lead ? sourceMeta(canonSource(lead)) : null
        const chips: string[] = []
        if (budget) chips.push(`<span style="display:inline-block;font:700 11px ${mono};color:#3D4D08;background:#F2FAD6;padding:3px 8px;border-radius:6px;margin:0 6px 6px 0">${esc(budget)}</span>`)
        if (lead?.client_name) chips.push(`<span style="display:inline-block;font:600 12px ${mono};color:#6B7669;margin:0 6px 6px 0">${esc(lead.client_name)}</span>`)
        if (src) chips.push(`<span style="display:inline-block;font:700 10px ${mono};letter-spacing:.05em;color:${src.color};margin:0 0 6px 0">${esc(src.label.toUpperCase())}</span>`)
        const note = it.follow_up_note
          ? `<div style="font-size:13px;color:#6B7669;font-style:italic;margin-top:8px">“${esc(it.follow_up_note)}”</div>` : ''
        return `<tr><td style="padding:6px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F0;border-radius:12px">
            <tr><td style="padding:14px 16px">
              <div style="font-size:15px;font-weight:700;color:#15201A;line-height:1.35">${title}</div>
              <div style="margin-top:7px">${chips.join('')}</div>${note}
              <a href="${esc(link)}" style="display:inline-block;margin-top:10px;font-size:13px;font-weight:700;color:#7E9E0A;text-decoration:none">View listing &rarr;</a>
            </td></tr>
          </table>
        </td></tr>`
      }).join('')

      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#F4F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <span style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px">
        <tr><td style="padding:0 4px 16px">
          <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;color:#15201A">Fl<span style="color:#7E9E0A">ai</span>ir</span>
        </td></tr>
        <tr><td style="background:#FBFBF9;border:1px solid #E7E8E1;border-radius:16px;padding:30px 28px">
          <div style="width:46px;height:46px;background:#F2FAD6;border-radius:12px;text-align:center;font-size:22px;line-height:46px;margin-bottom:16px">&#9200;</div>
          <div style="font:700 11px ${mono};letter-spacing:.12em;color:#9AA398;text-transform:uppercase;margin-bottom:8px">Follow-up reminder</div>
          <div style="font-size:22px;font-weight:800;letter-spacing:-.02em;color:#15201A;margin-bottom:6px">${esc(headline)}</div>
          <div style="font-size:14px;color:#6B7669;line-height:1.5;margin-bottom:18px">${esc(sub)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-top:24px">
            <a href="${esc(base)}/dashboard/applied" style="display:inline-block;background:#C4F000;color:#15201A;font-size:14px;font-weight:800;text-decoration:none;padding:13px 30px;border-radius:10px">Open your pipeline &rarr;</a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:18px 4px 0;text-align:center">
          <div style="font:500 11.5px ${mono};color:#9AA398;letter-spacing:.03em;margin-bottom:4px">You set these reminders yourself in Flaiir</div>
          <a href="${esc(base)}/dashboard/applied" style="font-size:11.5px;color:#9AA398;text-decoration:underline">Manage reminders</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

      const res = await sendEmail({ to: prof.email, subject, html })
      if (res.ok) {
        usersNotified++
        for (const it of items) sentAppIds.push(it.id)
      }
    }

    if (sentAppIds.length > 0) {
      await admin.from('applications').update({ follow_up_notified_at: nowISO }).in('id', sentAppIds)
    }

    return NextResponse.json({ users_notified: usersNotified, reminders_sent: sentAppIds.length })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
