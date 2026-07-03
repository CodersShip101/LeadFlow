// Generic: log in as the test user and screenshot a given dashboard path.
// Usage: node e2e/page-shot.mjs /dashboard feed.png [fullpage]
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const [, , path = '/dashboard', out = 'e2e/shot.png', full] = process.argv
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.goto(`http://localhost:3000${path}`)
await page.waitForTimeout(3500)
await page.screenshot({ path: out.startsWith('e2e/') ? out : `e2e/${out}`, fullPage: full === 'fullpage' })
await browser.close()
console.log('saved', out)
