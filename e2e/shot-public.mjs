// Screenshot a public page (no auth) at desktop + mobile.
// Usage: node e2e/shot-public.mjs / landing
import { chromium } from '@playwright/test'
const path = process.argv[2] || '/'
const name = process.argv[3] || 'public'
const browser = await chromium.launch()
for (const [w, h, tag] of [[1440, 1000, 'desktop'], [390, 844, 'mobile']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `e2e/${name}-${tag}.png`, fullPage: tag === 'desktop' })
  await page.close()
}
await browser.close()
console.log('done')
