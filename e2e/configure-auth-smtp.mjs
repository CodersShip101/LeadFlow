// One-off: point Supabase auth emails (signup confirmations, password resets)
// at SendGrid SMTP, using the same verified sender as the app's reminder
// emails. Fixes the default Supabase mailer never delivering signup links.
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const get = k => {
  const m = env.match(new RegExp(`${k}=(.+)`))
  return m ? m[1].trim() : null
}
const sendgridKey = get('SENDGRID_API_KEY')
const from = get('EMAIL_FROM') // "Flaiir <noreply@flaiir.co>"
const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
const senderName = m ? m[1] : 'Flaiir'
const senderEmail = m ? m[2] : from

// Personal access token from https://supabase.com/dashboard/account/tokens
// (the CLI login token lives in Windows Credential Manager, unreachable here)
const token = process.env.SUPABASE_ACCESS_TOKEN || get('SUPABASE_ACCESS_TOKEN')
if (!token) {
  console.log('Missing token. Create one at https://supabase.com/dashboard/account/tokens')
  console.log('then add a line to .env.local:  SUPABASE_ACCESS_TOKEN=sbp_...')
  process.exit(1)
}

const res = await fetch('https://api.supabase.com/v1/projects/ezxesrespmcrzrmnzknn/config/auth', {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    smtp_host: 'smtp.sendgrid.net',
    smtp_port: '587',
    smtp_user: 'apikey',
    smtp_pass: sendgridKey,
    smtp_admin_email: senderEmail,
    smtp_sender_name: senderName,
    rate_limit_email_sent: 60, // default is ~2/hr with built-in mailer
  }),
})
const body = await res.json()
console.log(res.ok
  ? `SMTP configured: ${body.smtp_host} as ${body.smtp_admin_email} (${body.smtp_sender_name}), ${body.rate_limit_email_sent} emails/hr`
  : `Failed (${res.status}): ${JSON.stringify(body)}`)
