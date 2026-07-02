// Give the test account's won deal a confirmed value via the app's own API,
// then screenshot Analytics to verify the revenue chart renders.
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.waitForTimeout(1500)

const result = await page.evaluate(async () => {
  const apps = await (await fetch('/api/applications')).json()
  const won = apps.find(a => a.status === 'hired')
  if (!won) return 'no won deal found'
  const r = await fetch('/api/applications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: won.lead_id, won_amount: 1250 }),
  })
  return `set won_amount: ${r.status}`
})
console.log(result)

await page.goto('http://localhost:3000/dashboard/analytics')
await page.waitForTimeout(3500)
await page.screenshot({ path: 'e2e/analytics-revenue.png', fullPage: true })
await browser.close()
console.log('done')
