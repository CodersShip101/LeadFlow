import { chromium } from '@playwright/test'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1440, height: 900 } })
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
await p.waitForTimeout(1000)
for (const [sel, name] of [['.aud-rows', 'audience'], ['.prob-list', 'problem'], ['.feat-list', 'features']]) {
  const el = p.locator(sel).first()
  await el.scrollIntoViewIfNeeded()
  await p.waitForTimeout(900)
  const sec = p.locator(`section:has(${sel})`).first()
  await sec.screenshot({ path: `e2e/landing-${name}.png` })
}
await b.close()
