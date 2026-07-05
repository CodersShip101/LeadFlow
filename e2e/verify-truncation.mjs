// Verifies the weekly-cap TRUNCATION branch of the feed route:
// when more leads are waiting than the weekly quota allows, exactly `allowed`
// are released and the rest wait. node e2e/verify-truncation.mjs
import { readFileSync } from 'fs'
import { chromium } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const { data: prof } = await admin.from('profiles').select('id').eq('email', get('TEST_USER_EMAIL')).single()

const HOUR = 3600000
const SLOTS = [0, 5, 10, 15, 20]
const now = Date.now()
const base = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate())
const slotMark = Math.max(...SLOTS.map(h => base + h * HOUR).filter(t => t <= now))
// Monday 00:00 UTC of this week
const dow = new Date(base).getUTCDay()
const weekAnchorMs = base - ((dow + 6) % 7) * 24 * HOUR

// 8 leads spread through (slotMark-90m, slotMark-10m] — all inside the drop window.
const TAG = 'TRUNC_TEST_'
const leads = Array.from({ length: 8 }, (_, i) => {
  const created = new Date(slotMark - (80 - i * 9) * 60000).toISOString() // -80m..-17m
  return { title: `${TAG}${i}`, description: 'truncation test lead', status: 'active', created_at: created, posted_date: created, source_url: `https://example.com/${TAG}${i}` }
})

async function cleanup() {
  await admin.from('leads').delete().like('title', `${TAG}%`)
  await admin.from('profiles').update({ subscription_status: 'free', last_scan_at: null, leads_week_count: 0, leads_week_anchor: null }).eq('id', prof.id)
}

try {
  await cleanup()
  const ins = await admin.from('leads').insert(leads).select('id')
  if (ins.error) { console.error('insert error:', ins.error.message); await cleanup(); process.exit(1) }
  console.log('seeded', ins.data.length, 'leads in window; slotMark =', new Date(slotMark).toISOString())

  // allowed = 50 - 45 = 5, with 8 candidates in the window -> truncation branch.
  await admin.from('profiles').update({
    subscription_status: 'free',
    leads_week_count: 45,
    leads_week_anchor: new Date(weekAnchorMs).toISOString(),
    last_scan_at: new Date(slotMark - 2 * HOUR).toISOString(),
  }).eq('id', prof.id)

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:3000/auth/login')
  await page.fill('#email', get('TEST_USER_EMAIL'))
  await page.fill('#password', get('TEST_USER_PASSWORD'))
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard**', { timeout: 30000 })
  const j = await (await page.request.get('http://localhost:3000/api/leads/feed')).json()
  await browser.close()

  const { data: after } = await admin.from('profiles').select('leads_week_count, last_scan_at').eq('id', prof.id).single()
  console.log('deliveredCount:', j.deliveredCount, '(expect 5)')
  console.log('weeklyRemaining:', j.weeklyRemaining, '(expect 0)')
  console.log('capReached:', j.capReached, '(expect true)')
  console.log('weekCount after:', after.leads_week_count, '(expect 50)')
  console.log('mark advanced into window:', new Date(after.last_scan_at).toISOString(), '(expect <= slotMark, > slotMark-2h)')
  const pass = j.deliveredCount === 5 && j.weeklyRemaining === 0 && j.capReached === true && after.leads_week_count === 50
    && new Date(after.last_scan_at).getTime() <= slotMark && new Date(after.last_scan_at).getTime() > slotMark - 2 * HOUR
  console.log(pass ? 'TRUNCATION PASS ✅' : 'TRUNCATION FAIL ❌')
} finally {
  await cleanup()
  console.log('cleaned up test leads + reset account')
}
