// Screenshot the value-for-money features: ROI banner + market rate on
// Analytics, and pitch draft + client intel on a lead detail page.
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

await page.goto('http://localhost:3000/dashboard/analytics')
await page.waitForTimeout(3500)
await page.screenshot({ path: 'e2e/analytics-value.png' })

// Open the won lead's detail page and draft a pitch
const leadId = await page.evaluate(async () => {
  const apps = await (await fetch('/api/applications')).json()
  return (apps.find(a => a.status === 'hired') ?? apps[0])?.lead_id
})
if (leadId) {
  await page.goto(`http://localhost:3000/dashboard/lead/${leadId}`)
  await page.waitForTimeout(2500)
  await page.click('text=Draft pitch')
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'e2e/lead-pitch.png', fullPage: true })
}
await browser.close()
console.log('done')
