// Screenshot-verify the enhanced team dashboard: seat stepper, leave button,
// enriched analytics KPIs, and pipeline breakdown. Seeds an org, temporarily
// attaches the owner's applications to it (so analytics render with real data),
// captures the page, then restores everything.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { chromium } from '@playwright/test'

const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const email = get('TEST_USER_EMAIL')

const { data: prof } = await admin.from('profiles').select('id').eq('email', email).single()
const ownerId = prof.id

// Ensure an org exists (reuse seed logic minimally).
let { data: org } = await admin.from('organizations').select('id').eq('owner_id', ownerId).maybeSingle()
if (!org) {
  const ins = await admin.from('organizations').insert({ owner_id: ownerId, name: 'Flaiir Test Studio', plan: 'team', seats: 4 }).select('id').single()
  org = ins.data
}
await admin.from('org_members').upsert({ org_id: org.id, user_id: ownerId, role: 'admin' }, { onConflict: 'org_id,user_id' })

// Temporarily tag the owner's applications to the org so analytics have data.
const { data: ownApps } = await admin.from('applications').select('id').eq('freelancer_id', ownerId).limit(200)
const appIds = (ownApps ?? []).map(a => a.id)
if (appIds.length) await admin.from('applications').update({ org_id: org.id }).in('id', appIds)
console.log('tagged', appIds.length, 'applications to org for the screenshot')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } })
await page.goto('http://localhost:3000/auth/login')
await page.fill('#email', email)
await page.fill('#password', get('TEST_USER_PASSWORD'))
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard**', { timeout: 30000 })
await page.goto('http://localhost:3000/dashboard/team')
await page.waitForTimeout(2500)
await page.screenshot({ path: 'e2e/team-dashboard-verify.png', fullPage: true })
console.log('screenshot saved: e2e/team-dashboard-verify.png')
await browser.close()

// Restore: untag applications. (Org/mates are cleaned by seed-team.mjs clean.)
if (appIds.length) await admin.from('applications').update({ org_id: null }).in('id', appIds)
console.log('restored applications (org_id=null)')
