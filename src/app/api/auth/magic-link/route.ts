import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

// Server-side cooldown so spamming "Resend link" can't waste emails.
const COOLDOWN_MS = 60_000
const lastSent = new Map<string, number>()

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const key = String(email).toLowerCase().trim()
    const now = Date.now()
    const prev = lastSent.get(key)
    if (prev && now - prev < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (now - prev)) / 1000)
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting another link.`, retryAfter: wait },
        { status: 429 },
      )
    }
    lastSent.set(key, now)

    const supabase = createAdminSupabase()

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    // Don't leak whether an account exists — if the user has no account,
    // generateLink errors; respond success either way.
    if (error || !data?.properties?.hashed_token) {
      return NextResponse.json({ success: true })
    }

    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://flaiir.co'
    const link = `${site}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/dashboard`

    await sendEmail({
      to: email,
      subject: 'Your Flaiir sign-in link',
      html: magicLinkHtml(link),
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}



function magicLinkHtml(link: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F5F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="460" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;border:1px solid #E5E7EB;overflow:hidden">
      <tr><td style="background:#111827;padding:24px 32px">
        <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#fff">fl<span style="color:#C4F000">ai</span>ir</span>
      </td></tr>
      <tr><td style="padding:32px 32px 8px">
        <h1 style="font-size:20px;font-weight:700;margin:0;color:#111827">Sign in to Flaiir</h1>
        <p style="font-size:14px;line-height:1.55;color:#6B7280;margin:12px 0 0">
          Click the button below to sign in — no password needed. Straight to your lead feed.
        </p>
      </td></tr>
      <tr><td style="padding:24px 32px 8px" align="center">
        <a href="${link}" style="display:inline-block;padding:13px 32px;background:#111827;color:#C4F000;text-decoration:none;font-size:14px;font-weight:700;border-radius:9px">Sign in to Flaiir</a>
      </td></tr>
      <tr><td style="padding:8px 32px 24px">
        <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.5">
          This link expires in 10 minutes and can only be used once. If the button doesn't work, paste this into your browser:<br>
          <a href="${link}" style="color:#5E8F00;word-break:break-all">${link}</a>
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #F0F0F2">
        <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.5">
          If you didn't request this, you can safely ignore this email.
        </p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#AAB0BB;margin:18px 0 0">Flaiir · Quality freelance leads, delivered.</p>
  </td></tr></table>
</body>
</html>`
}
