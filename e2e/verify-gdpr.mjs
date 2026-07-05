// Verify GDPR export returns the user's data; screenshot the danger zone.
// NEVER triggers the actual account delete.
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

// Export: fetch the endpoint with the session cookie, check shape.
const exp = await page.evaluate(async () => {
  const r = await fetch('/api/account/export')
  if (!r.ok) return { status: r.status }
  const j = await r.json()
  return { status: r.status, keys: Object.keys(j), apps: j.applications?.length, hasProfile: !!j.profile, cd: r.headers.get('content-disposition') }
})
console.log('EXPORT:', JSON.stringify(exp))

// Screenshot the danger zone (scroll to bottom of settings).
await page.goto('http://localhost:3000/dashboard/profile')
await page.waitForTimeout(2000)
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(600)
await page.screenshot({ path: 'e2e/gdpr-dangerzone.png' })

// Exercise the delete-confirm UI (but DO NOT confirm): click "Delete account",
// confirm the input appears and the button stays disabled until DELETE typed.
const del = await page.locator('button', { hasText: 'Delete account' }).first()
if (await del.count()) {
  await del.click()
  await page.waitForTimeout(400)
  const disabledBefore = await page.locator('button', { hasText: 'Permanently delete' }).isDisabled()
  await page.fill('input[placeholder="Type DELETE to confirm"]', 'DELETE')
  await page.waitForTimeout(200)
  const disabledAfter = await page.locator('button', { hasText: 'Permanently delete' }).isDisabled()
  console.log('DELETE UI: disabled before typing =', disabledBefore, '| after typing DELETE =', disabledAfter)
  await page.screenshot({ path: 'e2e/gdpr-delete-confirm.png' })
}
await browser.close()
