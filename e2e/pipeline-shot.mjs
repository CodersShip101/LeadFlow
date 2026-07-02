// Log in as the test user, seed the pipeline across all stages, screenshot the board.
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const EMAIL = get('TEST_USER_EMAIL')
const PASSWORD = get('TEST_USER_PASSWORD')
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL')
const ANON = get('NEXT_PUBLIC_SUPABASE_ANON_KEY')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

// 1. Real UI login
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', EMAIL)
await page.fill('#password', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.waitForTimeout(2500)

// 2. Complete onboarding as the logged-in user (own profile row, RLS-scoped)
const profileResult = await page.evaluate(async ({ SUPA_URL, ANON }) => {
  const key = Object.keys(localStorage).find(k => k.endsWith('-auth-token'))
  if (!key) return 'no session in localStorage'
  const session = JSON.parse(localStorage.getItem(key))
  const token = session.access_token
  const userId = session.user.id
  const r = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      onboarding_completed: true,
      full_name: 'Playwright Test',
      skills: ['React', 'Next.js', 'TypeScript', 'Figma'],
      disciplines: ['Web Development'],
      experience_level: 'senior',
      hourly_rate: 60,
    }),
  })
  return `profile patch: ${r.status}`
}, { SUPA_URL, ANON })
console.log(profileResult)

// 3. Seed the pipeline via the app's own API (one lead per stage)
const seedResult = await page.evaluate(async () => {
  const feedRes = await fetch('/api/leads/feed')
  const feed = await feedRes.json()
  const leads = Array.isArray(feed) ? feed : (feed.leads ?? [])
  if (leads.length === 0) return 'no leads in feed'
  const stages = ['interested', 'interested', 'applied', 'in_talks', 'hired', 'lost']
  const out = []
  for (let i = 0; i < Math.min(stages.length, leads.length); i++) {
    const r = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leads[i].id, status: stages[i] }),
    })
    out.push(`${stages[i]}:${r.status}`)
  }
  return out.join(' ')
})
console.log(seedResult)

// 4. Screenshot the pipeline board
await page.goto('http://localhost:3000/dashboard/applied')
await page.waitForTimeout(3500)
await page.screenshot({ path: 'e2e/pipeline-board.png' })

// 5. Expand the Lost tray and screenshot again
const tray = page.locator('.lost-tray-head')
if (await tray.count() > 0) {
  await tray.click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'e2e/pipeline-lost-open.png' })
}

await browser.close()
console.log('done')
