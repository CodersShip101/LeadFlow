import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: orgRows } = await supabase.rpc('user_org', { p_user: user.id })
  const org = orgRows?.[0]
  if (!org || org.role !== 'admin') return NextResponse.json({ error: 'admin only' }, { status: 403 })

  const { email, role = 'member' } = await req.json().catch(() => ({}))
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email))
    return NextResponse.json({ error: 'valid email required' }, { status: 400 })

  const [{ count: memberCount }, { count: inviteCount }] = await Promise.all([
    supabase.from('org_members').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id),
    supabase.from('org_invites').select('*', { count: 'exact', head: true }).eq('org_id', org.org_id).is('accepted_at', null),
  ])
  if ((memberCount ?? 0) + (inviteCount ?? 0) >= org.seats) {
    return NextResponse.json(
      { error: 'no_seats', message: 'All seats are in use. Add seats to invite more teammates.' },
      { status: 402 },
    )
  }

  const { data: invite, error } = await supabase
    .from('org_invites')
    .upsert(
      { org_id: org.org_id, email: email.toLowerCase(), role, invited_by: user.id },
      { onConflict: 'org_id,email' },
    )
    .select('token')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL!
  const acceptUrl = `${origin}/api/team/accept?token=${invite!.token}`

  // Email the invitee the accept link.
  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#F5F5F7;margin:0;padding:24px">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #E5E7EB;margin:0 auto">
      <tr><td style="padding:28px 28px 8px">
        <h1 style="font-size:18px;font-weight:700;margin:0;color:#111827">You've been invited to a team on Flaiir</h1>
        <p style="font-size:14px;color:#6B7280;margin:10px 0 0;line-height:1.5">Join your team's shared lead pool, pipeline and templates. Click below to accept (you'll sign in or create an account with this email).</p>
      </td></tr>
      <tr><td style="padding:22px 28px 28px">
        <a href="${acceptUrl}" style="background:#111827;color:#C4F000;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;display:inline-block">Accept invitation</a>
      </td></tr>
      <tr><td style="padding:0 28px 24px;font-size:11px;color:#9CA3AF;word-break:break-all">Or paste this link: ${acceptUrl}</td></tr>
    </table>
  </body></html>`

  let emailed = false
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Flaiir <onboarding@resend.dev>',
          to: [email.toLowerCase()],
          subject: 'You\'ve been invited to a Flaiir team',
          html,
        }),
      })
      emailed = r.ok
    } catch { /* fall back to link sharing */ }
  }

  return NextResponse.json({ ok: true, acceptUrl, emailed })
}
