import { chromium } from '@playwright/test'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const phReqs = []
page.on('request', r => { if (r.url().includes('posthog.com')) phReqs.push(r.url().slice(0, 70)) })
const errs = []
page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)) })
page.on('pageerror', e => errs.push('PE: ' + String(e).slice(0, 140)))

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 30000 })
await page.waitForTimeout(4000)

const info = await page.evaluate(() => ({
  posthogType: typeof window.posthog,
  hasInit: typeof window.posthog?.init,
  loaded: window.posthog?.__loaded ?? null,
  token: window.posthog?.config?.token?.slice(0, 12) ?? null,
}))
console.log('posthog on window:', JSON.stringify(info))
console.log('posthog network reqs:', phReqs.length, phReqs.slice(0, 3).join(' | ') || 'NONE')
console.log('errors:', errs.length ? errs.slice(0, 4).join(' || ') : 'none')
await browser.close()
