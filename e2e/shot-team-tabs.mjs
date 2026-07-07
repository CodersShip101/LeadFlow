import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:3000/auth/login')
await p.fill('#email', get('TEST_USER_EMAIL')); await p.fill('#password', get('TEST_USER_PASSWORD'))
await p.click('button[type=submit]'); await p.waitForURL('**/dashboard**', { timeout: 30000 })
await p.goto('http://localhost:3000/dashboard/team', { waitUntil: 'networkidle' })
await p.waitForTimeout(2000)
for (const [id, label] of [['overview','Overview'],['members','Members'],['pool','Lead pool'],['settings','Settings']]) {
  await p.click(`.tm-tab:has-text("${label}")`)
  await p.waitForTimeout(500)
  await p.screenshot({ path: `e2e/team-tab-${id}.png` })
}
await b.close()
