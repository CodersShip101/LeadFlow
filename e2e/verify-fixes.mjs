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
await page.waitForTimeout(3000)

// FEED: count how many APPLIED indicators an applied card shows
const appliedCards = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.lead-card')]
  const applied = cards.filter(c => c.querySelector('.applied-chip'))
  return applied.map(c => ({
    stateBadgeApplied: !!c.querySelector('.state-badge.st-applied'),
    hasAppliedChip: !!c.querySelector('.applied-chip'),
  })).slice(0, 3)
})
console.log('FEED applied cards (stateBadgeApplied should be false):', JSON.stringify(appliedCards))
await page.screenshot({ path: 'e2e/feed-applied-fix.png' })

// PIPELINE: hover a header stat to check tooltip
await page.goto('http://localhost:3000/dashboard/applied')
await page.waitForTimeout(2500)
const stat = page.locator('.pipe-stat-l', { hasText: 'win rate' })
if (await stat.count()) { await stat.hover(); await page.waitForTimeout(400) }
console.log('PIPELINE tooltip stats:', await page.locator('.pipe-stat-l.tip').count())
await page.screenshot({ path: 'e2e/pipeline-tooltip.png' })
await browser.close()
