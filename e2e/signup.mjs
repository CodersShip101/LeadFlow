// One-off: sign up the shared test account through the real UI.
import { chromium } from '@playwright/test'

const email = process.env.TEST_USER_EMAIL || 'smamdou111+claudetest@gmail.com'
const password = process.env.TEST_USER_PASSWORD || 'Fl4iir-PwTest-x7#2026'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:3000/auth/signup')
await page.fill('#email', email)
await page.fill('#password', password)
await page.click('button[type=submit]')
await page.waitForTimeout(5000)
await page.screenshot({ path: 'e2e/signup-result.png' })
await browser.close()
console.log('done')
