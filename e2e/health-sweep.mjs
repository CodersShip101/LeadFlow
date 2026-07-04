// Visit every dashboard page as the test user. Capture console errors,
// page errors, and failed network requests. Screenshot each. Print a compact
// per-page health report so we only eyeball the pages that actually broke.
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()

const PAGES = [
  ['/dashboard', 'feed'],
  ['/dashboard/saved', 'saved'],
  ['/dashboard/applied', 'pipeline'],
  ['/dashboard/analytics', 'analytics'],
  ['/dashboard/templates', 'templates'],
  ['/dashboard/team', 'team'],
  ['/dashboard/profile', 'settings'],
  ['/dashboard/billing', 'plan'],
  ['/dashboard/calendar', 'calendar'],
  ['/dashboard/messages', 'messages'],
]

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.waitForTimeout(1500)

for (const [path, name] of PAGES) {
  const errors = []
  const onConsole = m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 140)) }
  const onPageErr = e => errors.push('pageerror: ' + String(e).slice(0, 140))
  const onFail = r => errors.push(`netfail ${r.failure()?.errorText || ''}: ${r.url().slice(0, 90)}`)
  page.on('console', onConsole)
  page.on('pageerror', onPageErr)
  page.on('requestfailed', onFail)

  let status = '?'
  try {
    const resp = await page.goto(`http://localhost:3000${path}`, { waitUntil: 'domcontentloaded', timeout: 20000 })
    status = resp ? resp.status() : 'no-resp'
    await page.waitForTimeout(2500)
  } catch (e) { errors.push('nav: ' + String(e).slice(0, 100)) }

  // crude "is it blank/crashed" check
  const bodyLen = await page.evaluate(() => document.body?.innerText?.trim().length || 0)
  await page.screenshot({ path: `e2e/health-${name}.png` })

  page.off('console', onConsole)
  page.off('pageerror', onPageErr)
  page.off('requestfailed', onFail)

  const verdict = errors.length === 0 && bodyLen > 40 ? 'OK' : 'CHECK'
  console.log(`[${verdict}] ${name} (HTTP ${status}, text ${bodyLen}c)` + (errors.length ? '\n    ' + errors.slice(0, 4).join('\n    ') : ''))
}

await browser.close()
console.log('done')
