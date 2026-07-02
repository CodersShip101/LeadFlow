// Verify: a lead marked lost does not consume the monthly quota.
// Test account is at 5/5 — creating a 6th application as 'lost' must succeed.
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.waitForTimeout(2000)

const result = await page.evaluate(async () => {
  const apps = await (await fetch('/api/applications')).json()
  const inPipeline = new Set(apps.map(a => a.lead_id))
  const feed = await (await fetch('/api/leads/feed')).json()
  const leads = Array.isArray(feed) ? feed : (feed.leads ?? [])
  const fresh = leads.find(l => !inPipeline.has(l.id))
  if (!fresh) return 'no fresh lead available'
  const r = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: fresh.id, status: 'lost' }),
  })
  return `POST lost as 6th app: ${r.status} ${r.ok ? '(quota not consumed — fix works)' : JSON.stringify(await r.json())}`
})
console.log(result)

await page.goto('http://localhost:3000/dashboard/applied')
await page.waitForTimeout(3000)
await page.click('.lost-tray-head')
await page.waitForTimeout(600)
await page.screenshot({ path: 'e2e/lost-tray-verified.png' })
await browser.close()
