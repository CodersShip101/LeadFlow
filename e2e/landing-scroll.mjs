// Scroll the landing in viewport steps and screenshot each — reveals whether
// mid-page content is present-but-hidden (reveal-gating) or genuinely empty.
import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
const total = await page.evaluate(() => document.body.scrollHeight)
const steps = [0.15, 0.35, 0.55, 0.75]
let i = 1
for (const f of steps) {
  await page.evaluate(y => window.scrollTo(0, y), Math.round(total * f))
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `e2e/landing-scroll-${i}.png` })
  i++
}
// count sections with near-zero opacity after scrolling
const hidden = await page.evaluate(() => {
  const els = [...document.querySelectorAll('section, [class*="section"], [class*="reveal"]')]
  return els.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.1).length
})
console.log('sections still opacity<0.1 after scroll:', hidden)
await browser.close()
