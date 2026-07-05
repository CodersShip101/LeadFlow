import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const { data: prof } = await admin.from('profiles').select('id').eq('email', get('TEST_USER_EMAIL')).single()
const setState = (weekCount, hoursAgo) => admin.from('profiles').update({
  subscription_status: 'free',
  last_scan_at: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
  leads_week_count: weekCount, leads_week_anchor: new Date(Date.parse('2026-07-06T00:00:00Z')).toISOString(),
}).eq('id', prof.id)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })

let failures = []

for (const [name, weekCount] of [['within-quota', 5], ['near-cap', 48], ['cap-reached', 50]]) {
  await setState(weekCount, 6)
  const j = await (await page.request.get('http://localhost:3000/api/leads/feed')).json()
  console.log(name, '-> remaining:', j.weeklyRemaining, 'capReached:', j.capReached, 'delivered:', j.deliveredCount)

  // Note: setting last_scan_at 6h ago can trigger a real delivery (consuming
  // additional quota from the count we just set), so we assert on the
  // server's self-consistency and the intended direction of each state
  // rather than a naive weekCount-based arithmetic prediction.
  if (j.weeklyLeadCap !== 50) {
    failures.push(`${name}: expected weeklyLeadCap=50, got ${j.weeklyLeadCap}`)
  }
  if (j.weeklyRemaining == null || j.weeklyRemaining < 0 || j.weeklyRemaining > 50) {
    failures.push(`${name}: weeklyRemaining out of range, got ${j.weeklyRemaining}`)
  }
  if (j.capReached !== (j.weeklyRemaining === 0)) {
    failures.push(`${name}: capReached (${j.capReached}) inconsistent with weeklyRemaining (${j.weeklyRemaining})`)
  }
  if (name === 'within-quota' && (j.capReached !== false || !(j.weeklyRemaining > 0))) {
    failures.push(`${name}: expected capReached=false and weeklyRemaining>0, got capReached=${j.capReached} remaining=${j.weeklyRemaining}`)
  }
  if (name === 'cap-reached' && (j.capReached !== true || j.weeklyRemaining !== 0)) {
    failures.push(`${name}: expected capReached=true and weeklyRemaining=0, got capReached=${j.capReached} remaining=${j.weeklyRemaining}`)
  }

  await page.goto('http://localhost:3000/dashboard')
  await page.waitForTimeout(2500)

  if (name === 'within-quota') {
    const meterCount = await page.locator('.rb-week').count()
    if (meterCount < 1) failures.push(`${name}: expected .rb-week meter element in DOM, found ${meterCount}`)
    else console.log(`${name}: .rb-week found (${meterCount})`)
  }
  if (name === 'cap-reached') {
    const panelCount = await page.locator('.cap-panel').count()
    if (panelCount < 1) failures.push(`${name}: expected .cap-panel element in DOM, found ${panelCount}`)
    else console.log(`${name}: .cap-panel found (${panelCount})`)
  }

  await page.screenshot({ path: `e2e/windowed-${name}.png`, fullPage: true })
}
await browser.close()

if (failures.length) {
  console.error('\nFAILURES:')
  for (const f of failures) console.error(' -', f)
  process.exit(1)
} else {
  console.log('\nAll DOM assertions passed.')
}
