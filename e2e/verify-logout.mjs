// Verify sign-out actually kills the session: after clicking Sign out,
// /auth/login must NOT redirect back to /dashboard.
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
console.log('logged in:', page.url())

await page.click('text=Sign out')
await page.waitForURL('http://localhost:3000/', { timeout: 15000 })
console.log('after sign out:', page.url())

await page.goto('http://localhost:3000/auth/login')
await page.waitForTimeout(2500)
const finalUrl = page.url()
console.log('visiting /auth/login lands on:', finalUrl)
console.log(finalUrl.includes('/auth/login') ? 'PASS — stayed logged out' : 'FAIL — bounced back into dashboard')

await browser.close()
