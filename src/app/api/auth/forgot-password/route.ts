import { NextResponse } from 'next/server'
import { createAdminSupabase } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminSupabase()

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/reset-password`,
      },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Use the hashed token with our own page + verifyOtp instead of the raw
    // action_link, so the link lives on flaiir.co and lands on the reset form.
    const tokenHash = data?.properties?.hashed_token
    if (!tokenHash) {
      return NextResponse.json({ error: 'Failed to generate reset link' }, { status: 500 })
    }
    const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://flaiir.co'
    const resetLink = `${site}/auth/reset-password?token_hash=${tokenHash}&type=recovery`

    const res = await sendEmail({
      to: email,
      subject: 'Reset your Flaiir password',
      html: resetEmailHtml(resetLink),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to send email: ${res.error}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}

function resetEmailHtml(resetLink: string): string {
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
        <h1 style="font-size:20px;font-weight:700;margin:0;color:#111827">Reset your password</h1>
        <p style="font-size:14px;line-height:1.55;color:#6B7280;margin:12px 0 0">
          We received a request to reset the password for your Flaiir account. Click the button below to choose a new one.
        </p>
      </td></tr>
      <tr><td style="padding:24px 32px 8px" align="center">
        <a href="${resetLink}" style="display:inline-block;padding:13px 32px;background:#111827;color:#C4F000;text-decoration:none;font-size:14px;font-weight:700;border-radius:9px">Reset password</a>
      </td></tr>
      <tr><td style="padding:8px 32px 24px">
        <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.5">
          This link expires in 1 hour. If the button doesn't work, paste this into your browser:<br>
          <a href="${resetLink}" style="color:#5E8F00;word-break:break-all">${resetLink}</a>
        </p>
      </td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #F0F0F2">
        <p style="font-size:12px;color:#9CA3AF;margin:0;line-height:1.5">
          If you didn't request this, you can safely ignore this email — your password won't change.
        </p>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#AAB0BB;margin:18px 0 0">Flaiir · Quality freelance leads, delivered.</p>
  </td></tr></table>
</body>
</html>`
}
