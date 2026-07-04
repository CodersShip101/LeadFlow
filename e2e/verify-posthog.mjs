// Verify PostHog initialises in the browser and captures without errors.
import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 120)) })
page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 120)))

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(2500)

const ph = await page.evaluate(() => {
  const p = window.posthog
  if (!p) return { loaded: false }
  return {
    loaded: !!p.__loaded,
    hasCapture: typeof p.capture === 'function',
    token: p.config?.token?.slice(0, 10) || null,
    host: p.config?.api_host || null,
  }
})
// fire a test event
const captured = await page.evaluate(() => {
  try { window.posthog?.capture('flaiir_verify_event', { ok: true }); return true } catch { return false }
})
console.log('PostHog:', JSON.stringify(ph), '| test capture:', captured)
console.log('console errors:', errors.length ? errors.slice(0, 5).join(' | ') : 'none')
await browser.close()
