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
const leadId = await page.evaluate(async () => {
  const apps = await (await fetch('/api/applications')).json()
  return (apps.find(a => a.status === 'hired') ?? apps[0])?.lead_id
})
await page.goto(`http://localhost:3000/dashboard/lead/${leadId}`)
await page.waitForTimeout(2000)
await page.click('text=Draft pitch')
await page.waitForTimeout(500)
const info = await page.evaluate(() => {
  const ta = document.querySelector('textarea.ld-pitch-ta')
  if (!ta) return 'no textarea with class found; textareas: ' + document.querySelectorAll('textarea').length
  const cs = getComputedStyle(ta)
  const inSheet = [...document.styleSheets].some(s => {
    try { return [...s.cssRules].some(r => r.selectorText && r.selectorText.includes('ld-pitch-ta')) } catch { return false }
  })
  return { class: ta.className, width: cs.width, border: cs.border, ruleInAnySheet: inSheet }
})
console.log(JSON.stringify(info))
await browser.close()
