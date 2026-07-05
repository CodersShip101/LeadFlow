// Integration check for the slot-based feed delivery + weekly cap enforcement
// (Task 5). The feed route authenticates via the SSR cookie session, not a
// bearer token, so we drive it through a real logged-in Playwright page and
// reuse its cookies for the API call. Between scenarios we force the test
// user's profile state directly via the service-role admin client.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const admin = createClient(url, get('SUPABASE_SERVICE_ROLE_KEY'))
const email = get('TEST_USER_EMAIL')
const { data: prof, error: profErr } = await admin.from('profiles').select('id').eq('email', email).single()
if (profErr || !prof) { console.error('could not find test profile', profErr); process.exit(1) }

// Mirrors src/lib/lead-schedule.ts weekAnchor(): Monday 00:00:00 UTC on/before `now`.
function weekAnchor(now) {
  const d = new Date(now)
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const dow = new Date(midnight).getUTCDay()
  const daysSinceMonday = (dow + 6) % 7
  return midnight - daysSinceMonday * 86400000
}

// `freshWeek: true` sets anchor=null so the route's own isWeekStale() logic
// resets weekCount to 0 (the "brand new week" case). For scenarios where we
// want an injected weekCount to actually stick (B, C), we must supply a
// non-stale anchor (the real current week) — otherwise the route treats a
// null anchor as stale and overwrites our weekCount with 0 before we can
// observe cap behaviour.
async function setState({ lastScanHoursAgo, weekCount, freshWeek = false }) {
  const { error } = await admin.from('profiles').update({
    subscription_status: 'free',
    last_scan_at: new Date(Date.now() - lastScanHoursAgo * 3600000).toISOString(),
    leads_week_count: weekCount,
    leads_week_anchor: freshWeek ? null : new Date(weekAnchor(Date.now())).toISOString(),
  }).eq('id', prof.id)
  if (error) { console.error('setState failed', error); process.exit(1) }
}

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', get('TEST_USER_EMAIL'))
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })

async function callFeed() {
  const res = await page.request.get('http://localhost:3000/api/leads/feed')
  return res.json()
}

// Scenario A: fresh week, plenty of quota, a boundary crossed 6h ago.
await setState({ lastScanHoursAgo: 6, weekCount: 0, freshWeek: true })
const a = await callFeed()
console.log('A delivered:', a.delivered, 'deliveredCount:', a.deliveredCount, 'remaining:', a.weeklyRemaining, 'capReached:', a.capReached, 'leads:', a.leads?.length, 'cap:', a.weeklyLeadCap)

// Scenario B: near cap (48 of 50 used, same week) -> at most 2 more can be delivered.
await setState({ lastScanHoursAgo: 6, weekCount: 48 })
const b = await callFeed()
console.log('B deliveredCount (<=2 expected):', b.deliveredCount, 'remaining:', b.weeklyRemaining, 'capReached:', b.capReached)

// Scenario C: cap reached (50 of 50, same week) -> nothing more delivered.
await setState({ lastScanHoursAgo: 6, weekCount: 50 })
const c = await callFeed()
console.log('C capReached (true expected):', c.capReached, 'remaining:', c.weeklyRemaining, 'deliveredCount (0 expected):', c.deliveredCount)

// Key invariants, regardless of how many active leads exist in the pool.
const allowedA = Math.max(0, 50 - 0)
const allowedB = Math.max(0, 50 - 48)
const allowedC = Math.max(0, 50 - 50)
let ok = true
if (a.deliveredCount > allowedA) { console.error('FAIL: A deliveredCount exceeds allowed', a.deliveredCount, '>', allowedA); ok = false }
if (b.deliveredCount > allowedB) { console.error('FAIL: B deliveredCount exceeds allowed', b.deliveredCount, '>', allowedB); ok = false }
if (c.deliveredCount > allowedC) { console.error('FAIL: C deliveredCount exceeds allowed', c.deliveredCount, '>', allowedC); ok = false }
if (a.weeklyRemaining !== 50 - a.deliveredCount) { console.error('FAIL: A weeklyRemaining mismatch', a.weeklyRemaining); ok = false }
if (b.weeklyRemaining !== 50 - (48 + b.deliveredCount)) { console.error('FAIL: B weeklyRemaining mismatch', b.weeklyRemaining); ok = false }
if (c.capReached !== true || c.weeklyRemaining !== 0 || c.deliveredCount !== 0) { console.error('FAIL: C cap-reached invariants violated'); ok = false }

console.log(ok ? 'ALL INVARIANTS HOLD' : 'INVARIANT FAILURE')

await browser.close()
if (!ok) process.exit(1)
