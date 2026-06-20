// Centralized transactional email sender.
//
// Uses SendGrid: its domain authentication is CNAME-only (no subdomain MX),
// which works on Wix-managed DNS. To switch providers later, only this file
// changes. Never throws — returns { ok, error } so callers can decide.

type SendArgs = { to: string; subject: string; html: string }

// EMAIL_FROM may be "Flaiir <noreply@flaiir.co>" or a bare address.
function parseFrom(): { email: string; name?: string } {
  const raw = process.env.EMAIL_FROM ?? 'Flaiir <onboarding@resend.dev>'
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
  if (m) return { name: m[1] || undefined, email: m[2] }
  return { email: raw.trim() }
}

export async function sendEmail({ to, subject, html }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.SENDGRID_API_KEY
  if (!key) return { ok: false, error: 'SENDGRID_API_KEY not set' }
  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: parseFrom(),
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) return { ok: true } // SendGrid returns 202 on success
    const err = await res.text()
    return { ok: false, error: err.substring(0, 200) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' }
  }
}
