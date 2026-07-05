import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
for (const path of ['/auth/login', '/auth/forgot-password', '/auth/reset-password']) {
  await page.goto('http://localhost:3000' + path)
  await page.waitForTimeout(1200)
  const fakes = await page.evaluate(() => ({
    testimonials: document.querySelectorAll('.auth-testimonial').length,
    stats: document.querySelectorAll('.auth-stats-row').length,
    ticker: document.querySelectorAll('.auth-ticker').length,
  }))
  const name = path.replaceAll('/', '_')
  await page.screenshot({ path: `e2e/honesty${name}.png` })
  console.log(path, JSON.stringify(fakes))
}
await browser.close()
