// Verify hide-lead triage: hiding removes the card, counter appears, reset restores.
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.waitForTimeout(3000)

const before = await page.locator('.lead-card').count()
const firstTitle = await page.locator('.lead-card .tt').first().textContent()
await page.locator('.lead-card [data-tip="Hide"]').first().click()
await page.waitForTimeout(800)
const after = await page.locator('.lead-card').count()
const counter = await page.locator('.tb-hidden').textContent().catch(() => 'NO COUNTER')
const newFirst = await page.locator('.lead-card .tt').first().textContent()
console.log(`cards ${before} -> ${after}; counter: "${counter}"; first card changed: ${firstTitle !== newFirst}`)

await page.locator('.tb-hidden').click()
await page.waitForTimeout(500)
const restored = await page.locator('.lead-card').count()
console.log(`after reset: ${restored} cards, restored: ${restored === before}`)
await browser.close()
