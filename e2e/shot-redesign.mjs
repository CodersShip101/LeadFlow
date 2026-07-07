import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
await p.goto('http://localhost:3000/auth/login')
await p.fill('#email', get('TEST_USER_EMAIL')); await p.fill('#password', get('TEST_USER_PASSWORD'))
await p.click('button[type=submit]'); await p.waitForURL('**/dashboard**', { timeout: 30000 })
await p.waitForTimeout(2500)
// 1. closed state
await p.screenshot({ path: 'e2e/redesign-sidebar.png' })
// 2. account popover open
await p.click('.acct-card')
await p.waitForTimeout(400)
await p.screenshot({ path: 'e2e/redesign-acct-pop.png' })
await p.keyboard.press('Escape'); await p.click('body', { position: { x: 640, y: 80 } }).catch(()=>{})
// 3. kebab menu open on first card
const kebab = p.locator('.lca-icon[aria-label="More actions"]').first()
await kebab.click()
await p.waitForTimeout(400)
const menu = await p.locator('.lca-menu').count()
console.log('kebab menu rendered:', menu === 1 ? 'yes' : 'NO')
await p.screenshot({ path: 'e2e/redesign-kebab.png' })
await b.close()
