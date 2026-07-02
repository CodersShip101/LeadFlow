// Complete onboarding through the real UI, then screenshot the pipeline board.
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
await page.waitForURL('**/onboarding**', { timeout: 15000 }).catch(() => {})

if (page.url().includes('onboarding')) {
  // Step 1 — name + disciplines
  await page.fill('input.input', 'Playwright Test')
  await page.click('.ob-cat:first-child')
  await page.click('.ob-next')
  // Step 2 — skills
  await page.waitForSelector('.ob-skill', { timeout: 10000 })
  const skills = page.locator('.ob-skill')
  const n = Math.min(4, await skills.count())
  for (let i = 0; i < n; i++) await skills.nth(i).click()
  await page.click('.ob-next')
  // Step 3 — experience + availability, finish
  await page.waitForSelector('.ob-seg-item', { timeout: 10000 })
  await page.click('.ob-seg-item:nth-child(2)')
  await page.click('.ob-pills .ob-pill:first-child')
  await page.click('.ob-next')
  await page.waitForTimeout(4000)
  console.log('onboarding finished, now at:', page.url())
}

await page.goto('http://localhost:3000/dashboard/applied')
await page.waitForTimeout(3500)
await page.screenshot({ path: 'e2e/pipeline-board.png' })

const tray = page.locator('.lost-tray-head')
if (await tray.count() > 0) {
  await tray.click()
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'e2e/pipeline-lost-open.png' })
}

await browser.close()
console.log('done')
