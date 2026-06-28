import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { isAuthorizedCron } from '@/lib/cron'
import { sendEmail } from '@/lib/email'

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
      admin.from('leads').select('id, title, source_url').in('id', leadIds),
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
      const subject = items.length === 1
        ? `Time to follow up: ${firstTitle}`
        : `${items.length} follow-ups due on Flaiir`

      const rows = items.map(it => {
        const lead = leadMap.get(it.lead_id)
        const title = esc(lead?.title || 'Lead')
        const link = lead?.source_url || `${base}/dashboard/applied`
        const note = it.follow_up_note ? `<div style="font-size:13px;color:#6B7280;margin-top:3px">${esc(it.follow_up_note)}</div>` : ''
        return `<tr><td style="padding:10px 0;border-bottom:1px solid #EEE">
          <a href="${esc(link)}" style="font-size:15px;font-weight:600;color:#111827;text-decoration:none">${title}</a>${note}
        </td></tr>`
      }).join('')

      const html = `<!DOCTYPE html><html><body style="margin:0;background:#F5F5F7;font-family:-apple-system,Segoe UI,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 16px">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:14px;padding:28px">
            <tr><td>
              <div style="font-size:18px;font-weight:800;color:#111827;margin-bottom:4px">Follow-up reminder</div>
              <div style="font-size:14px;color:#6B7280;margin-bottom:18px">${items.length === 1 ? "Here's the lead you wanted to come back to:" : `You have ${items.length} leads to follow up on:`}</div>
              <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
              <a href="${esc(base)}/dashboard/applied" style="display:inline-block;margin-top:22px;background:#C4F000;color:#1A1A1A;font-weight:700;font-size:14px;text-decoration:none;padding:11px 22px;border-radius:8px">Open your pipeline</a>
            </td></tr>
          </table>
          <div style="font-size:11px;color:#9CA3AF;margin-top:16px">Flaiir · you set these reminders yourself</div>
        </td></tr></table>
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
