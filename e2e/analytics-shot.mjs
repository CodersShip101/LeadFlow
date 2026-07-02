// Put the test account on the max tier (own-profile update via its own
// session), then screenshot the Analytics page.
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL')
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.waitForTimeout(1500)

const result = await page.evaluate(async ({ SUPA_URL, ANON }) => {
  // Session lives in cookies (SSR client); may be chunked and base64-prefixed.
  const parts = document.cookie.split('; ')
    .filter(c => c.split('=')[0].includes('-auth-token'))
    .sort((a, b) => a.localeCompare(b))
    .map(c => decodeURIComponent(c.split('=').slice(1).join('=')))
  if (parts.length === 0) return 'no auth cookie found'
  let raw = parts.join('')
  if (raw.startsWith('base64-')) raw = atob(raw.slice(7))
  const session = JSON.parse(raw)
  const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${session.user.id}`, {
    method: 'PATCH',
    headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ subscription_status: 'max' }),
  })
  return `profile upgrade: ${r.status}`
}, { SUPA_URL, ANON })
console.log(result)

await page.goto('http://localhost:3000/dashboard/analytics')
await page.waitForTimeout(3500)
await page.screenshot({ path: 'e2e/analytics-money.png', fullPage: true })
await browser.close()
console.log('done')
