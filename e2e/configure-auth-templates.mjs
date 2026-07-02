// Brand all Supabase auth email templates (confirmation, recovery, magic link,
// invite, email change) with the Flaiir layout used by reminder emails.
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const get = k => {
  const m = env.match(new RegExp(`${k}=(.+)`))
  return m ? m[1].trim() : null
}
const token = process.env.SUPABASE_ACCESS_TOKEN || get('SUPABASE_ACCESS_TOKEN')

const mono = "'SFMono-Regular',ui-monospace,'Menlo',monospace"

// Shared branded shell. `url` is a Go-template expression Supabase fills in.
function render({ eyebrow, headline, sub, cta, note }) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#F4F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px">
        <tr><td style="padding:0 4px 16px">
          <span style="font-size:20px;font-weight:800;letter-spacing:-.02em;color:#15201A">Fl<span style="color:#7E9E0A">ai</span>ir</span>
        </td></tr>
        <tr><td style="background:#FBFBF9;border:1px solid #E7E8E1;border-radius:16px;padding:32px 30px">
          <div style="font:700 11px ${mono};letter-spacing:.12em;color:#9AA398;text-transform:uppercase;margin-bottom:10px">${eyebrow}</div>
          <div style="font-size:22px;font-weight:800;letter-spacing:-.02em;color:#15201A;margin-bottom:8px">${headline}</div>
          <div style="font-size:14px;color:#6B7669;line-height:1.55;margin-bottom:24px">${sub}</div>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td>
            <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#C4F000;color:#15201A;font-size:14px;font-weight:800;text-decoration:none;padding:13px 30px;border-radius:10px">${cta} &rarr;</a>
          </td></tr></table>
          <div style="font-size:12.5px;color:#9AA398;line-height:1.55;margin-top:22px">${note}</div>
          <div style="border-top:1px solid #E7E8E1;margin-top:22px;padding-top:16px">
            <div style="font:500 11px ${mono};color:#9AA398;letter-spacing:.02em;line-height:1.6">Button not working? Paste this link into your browser:<br>
              <a href="{{ .ConfirmationURL }}" style="color:#7E9E0A;word-break:break-all">{{ .ConfirmationURL }}</a>
            </div>
          </div>
        </td></tr>
        <tr><td style="padding:18px 4px 0;text-align:center">
          <div style="font:500 11.5px ${mono};color:#9AA398;letter-spacing:.03em">Flaiir &middot; AI-scored freelance leads</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

const payload = {
  mailer_subjects_confirmation: 'Confirm your email — Flaiir',
  mailer_templates_confirmation_content: render({
    eyebrow: 'Welcome to Flaiir',
    headline: 'Confirm your email',
    sub: 'You&rsquo;re one click away from your lead feed. Confirm your email and we&rsquo;ll start scoring leads against your skills.',
    cta: 'Confirm my email',
    note: 'This link expires in 1 hour. If you didn&rsquo;t create a Flaiir account, you can safely ignore this email.',
  }),
  mailer_subjects_recovery: 'Reset your Flaiir password',
  mailer_templates_recovery_content: render({
    eyebrow: 'Password reset',
    headline: 'Reset your password',
    sub: 'We received a request to reset the password for {{ .Email }}. Click below to choose a new one.',
    cta: 'Choose a new password',
    note: 'This link expires in 1 hour. If you didn&rsquo;t request a reset, ignore this email — your password stays as it is.',
  }),
  mailer_subjects_magic_link: 'Your Flaiir sign-in link',
  mailer_templates_magic_link_content: render({
    eyebrow: 'Sign in',
    headline: 'Sign in to Flaiir',
    sub: 'Click below to sign in as {{ .Email }} — no password needed.',
    cta: 'Sign me in',
    note: 'This link expires in 1 hour and can be used once. If you didn&rsquo;t request it, you can safely ignore this email.',
  }),
  mailer_subjects_invite: 'You&rsquo;ve been invited to Flaiir',
  mailer_templates_invite_content: render({
    eyebrow: 'Team invite',
    headline: 'Join your team on Flaiir',
    sub: 'You&rsquo;ve been invited to collaborate on Flaiir — shared leads, one pipeline, better wins.',
    cta: 'Accept invite',
    note: 'If you weren&rsquo;t expecting this invite, you can safely ignore this email.',
  }),
  mailer_subjects_email_change: 'Confirm your new email — Flaiir',
  mailer_templates_email_change_content: render({
    eyebrow: 'Email change',
    headline: 'Confirm your new email',
    sub: 'Click below to confirm changing your Flaiir account email to {{ .NewEmail }}.',
    cta: 'Confirm change',
    note: 'If you didn&rsquo;t request this change, ignore this email and your address stays the same.',
  }),
}

const res = await fetch('https://api.supabase.com/v1/projects/ezxesrespmcrzrmnzknn/config/auth', {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
console.log(res.ok ? 'All 5 auth email templates branded.' : `Failed (${res.status}): ${await res.text()}`)
