// One-off: mark the Playwright test account as email-confirmed.
// The default Supabase mailer is rate-limited and the confirmation email
// never arrived, so this does what the link would have done.
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const email = env.match(/TEST_USER_EMAIL=(.+)/)[1].trim()
const base = 'https://ezxesrespmcrzrmnzknn.supabase.co'
const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

const res = await fetch(`${base}/auth/v1/admin/users?page=1&per_page=100`, { headers })
const { users } = await res.json()
const user = users.find(u => u.email === email)
if (!user) { console.log(`No user found for ${email}`); process.exit(1) }

const r2 = await fetch(`${base}/auth/v1/admin/users/${user.id}`, {
  method: 'PUT', headers, body: JSON.stringify({ email_confirm: true }),
})
const body = await r2.json()
console.log(r2.ok ? `Confirmed: ${body.email} at ${body.email_confirmed_at}` : `Failed: ${JSON.stringify(body)}`)
