// Verify Sentry: trigger the test error and confirm events are sent
// (through the /monitoring tunnel → Sentry ingest).
import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const sentryReqs = []
page.on('request', r => {
  const u = r.url()
  if (u.includes('/monitoring') || u.includes('sentry.io') || u.includes('ingest.')) sentryReqs.push(u.slice(0, 60))
})
page.on('pageerror', () => {}) // expected: the test throws on purpose

await page.goto('http://localhost:3000/sentry-example-page', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(1500)
// click the throw button (the click handler triggers server API + client throw)
await page.click('button', { timeout: 5000 }).catch(() => {})
await page.waitForTimeout(4000) // let Sentry flush

console.log('Sentry/tunnel requests fired:', sentryReqs.length)
sentryReqs.slice(0, 6).forEach(u => console.log('  ', u))
console.log(sentryReqs.length > 0 ? 'PASS — Sentry is sending events' : 'FAIL — no Sentry traffic')
await browser.close()
