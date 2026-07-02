// Trigger a password-reset email for the test account to verify auth SMTP delivery.
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()

const res = await fetch(`${get('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/recover`, {
  method: 'POST',
  headers: { apikey: get('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: get('TEST_USER_EMAIL') }),
})
console.log(res.ok ? 'Password-reset email requested — check the inbox.' : `Failed: ${res.status} ${await res.text()}`)
