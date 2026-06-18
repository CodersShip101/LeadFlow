// Lightweight notification helpers. Both are non-blocking and never throw —
// callers fire-and-forget so a failed notification can't break the request.

export async function notifySlack(webhookUrl: string | null | undefined, text: string): Promise<void> {
  if (!webhookUrl) return
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(6000),
    })
  } catch { /* non-blocking */ }
}

export async function notifyEmail(to: string | null | undefined, subject: string, html: string): Promise<void> {
  if (!to || !process.env.RESEND_API_KEY) return
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Flaiir <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    })
  } catch { /* non-blocking */ }
}
