// One-off: point Supabase auth emails (signup confirmations, password resets)
// at SendGrid SMTP, using the same verified sender as the app's reminder
// emails. Fixes the default Supabase mailer never delivering signup links.
import { readFileSync } from 'fs'
import { join } from 'path'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const sendgridKey = get('SENDGRID_API_KEY')
const from = get('EMAIL_FROM') // "Flaiir <noreply@flaiir.co>"
const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/)
const senderName = m ? m[1] : 'Flaiir'
const senderEmail = m ? m[2] : from

// Supabase CLI access token (from `supabase login`)
const tokenPath = join(process.env.APPDATA, 'supabase', 'access-token')
const token = readFileSync(tokenPath, 'utf8').trim()

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
