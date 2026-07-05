# Free-plan Windowed Lead Delivery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the free tier 5 fixed daily UTC lead-drop slots plus a 50-leads/week cap, as a refinement of the existing high-water-mark feed engine, without changing paid tiers.

**Architecture:** A new pure module (`src/lib/lead-schedule.ts`) computes slot/interval marks and the weekly anchor; `src/lib/tiers.ts` gains `deliveryMode`/`dropSlotsUTC`/`weeklyLeadCap`; `src/app/api/leads/feed/route.ts` branches on `deliveryMode` and, for free, caps delivery by advancing the mark only across released leads while tracking a weekly counter on `profiles`; the feed UI gains a weekly meter and a cap-reached state.

**Tech Stack:** Next.js 16 (App Router, TS), Supabase (admin client for the gate), vitest (new, for the pure helper), Playwright (existing, for UI states).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-05-free-windowed-leads-design.md`.
- Free drop slots: `[0, 5, 10, 15, 20]` (UTC hours). Weekly cap: `50`. Week reset: Monday 00:00 UTC.
- Paid tiers (`pro`/`max`/`team`/`enterprise`) behaviour MUST NOT change: `deliveryMode: 'interval'`, `weeklyLeadCap: null`, existing `scanIntervalHours`.
- Delivery gate stays server-side via the admin client (`createAdminSupabase`) — never trust the browser.
- All user-visible copy must be honest (no invented numbers). One lime accent; status colours for status only.
- Internal tier keys (`pro`, `max`) are bound to Stripe/env — DO NOT rename.
- Do not push or deploy. Commit locally only.

---

### Task 1: Add vitest for pure-unit tests

**Files:**
- Modify: `package.json` (devDependency + `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/__smoke__.test.ts` (temporary smoke test, deleted at end of task)

**Interfaces:**
- Produces: a working `npm test` command running vitest over `src/**/*.test.ts`.

- [ ] **Step 1: Install vitest**

Run: `npm i -D vitest@^2`
Expected: added to devDependencies, no errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
```

- [ ] **Step 3: Add the `test` script to `package.json`**

In the `"scripts"` block add (leave existing scripts intact):

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test**

Create `src/lib/__smoke__.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest wiring', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run it**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/__smoke__.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest for unit tests"
```

---

### Task 2: Extend tier entitlements

**Files:**
- Modify: `src/lib/tiers.ts` (the `Entitlements` type + every tier in `ENTITLEMENTS`)

**Interfaces:**
- Produces: `Entitlements.deliveryMode: 'slots' | 'interval'`, `Entitlements.dropSlotsUTC: number[]`, `Entitlements.weeklyLeadCap: number | null`. Free = `'slots'`/`[0,5,10,15,20]`/`50`; all paid = `'interval'`/`[]`/`null`.

- [ ] **Step 1: Add fields to the `Entitlements` type**

In `src/lib/tiers.ts`, in the `export type Entitlements = { ... }` block, after `scanIntervalHours: number` add:

```ts
  deliveryMode: 'slots' | 'interval'
  dropSlotsUTC: number[]
  weeklyLeadCap: number | null
```

- [ ] **Step 2: Set free's values**

In `ENTITLEMENTS.free`, after `scanIntervalHours: 5,` add:

```ts
    deliveryMode: 'slots',
    dropSlotsUTC: [0, 5, 10, 15, 20],
    weeklyLeadCap: 50,
```

- [ ] **Step 3: Set paid values**

In each of `ENTITLEMENTS.pro`, `.max`, `.team`, `.enterprise`, after their `scanIntervalHours` line add:

```ts
    deliveryMode: 'interval',
    dropSlotsUTC: [],
    weeklyLeadCap: null,
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output (clean). If it errors that some tier is missing the new required fields, add them to that tier.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tiers.ts
git commit -m "feat(tiers): add deliveryMode, dropSlotsUTC, weeklyLeadCap entitlements"
```

---

### Task 3: Pure lead-schedule helper (TDD)

**Files:**
- Create: `src/lib/lead-schedule.ts`
- Create: `src/lib/lead-schedule.test.ts`

**Interfaces:**
- Produces:
  - `currentSlotMark(now: number, slotsUTC: number[]): number` — epoch ms of the most recent fixed daily UTC slot ≤ `now`.
  - `nextSlotAt(now: number, slotsUTC: number[]): number` — epoch ms of the earliest slot > `now`.
  - `currentIntervalMark(now: number, intervalMs: number): number` — epoch-aligned interval boundary ≤ `now`.
  - `nextIntervalAt(now: number, intervalMs: number): number` — next epoch-aligned interval boundary > `now`.
  - `weekAnchor(now: number): number` — Monday 00:00:00 UTC on or before `now` (epoch ms).
  - `isWeekStale(anchorMs: number | null, now: number): boolean` — true if `anchorMs` is null or `now ≥ anchorMs + 7d`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/lead-schedule.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  currentSlotMark, nextSlotAt, currentIntervalMark, nextIntervalAt,
  weekAnchor, isWeekStale,
} from './lead-schedule'

const SLOTS = [0, 5, 10, 15, 20]
const ms = (iso: string) => new Date(iso).getTime()
const DAY = 86400000

describe('currentSlotMark', () => {
  it('returns today’s 10:00 slot at 12:30', () => {
    expect(currentSlotMark(ms('2026-07-05T12:30:00Z'), SLOTS)).toBe(ms('2026-07-05T10:00:00Z'))
  })
  it('is inclusive at the slot instant', () => {
    expect(currentSlotMark(ms('2026-07-05T15:00:00Z'), SLOTS)).toBe(ms('2026-07-05T15:00:00Z'))
  })
  it('returns today’s 20:00 slot late at night', () => {
    expect(currentSlotMark(ms('2026-07-05T23:59:00Z'), SLOTS)).toBe(ms('2026-07-05T20:00:00Z'))
  })
  it('returns midnight slot just after midnight', () => {
    expect(currentSlotMark(ms('2026-07-05T00:10:00Z'), SLOTS)).toBe(ms('2026-07-05T00:00:00Z'))
  })
})

describe('nextSlotAt', () => {
  it('returns today’s 15:00 at 12:30', () => {
    expect(nextSlotAt(ms('2026-07-05T12:30:00Z'), SLOTS)).toBe(ms('2026-07-05T15:00:00Z'))
  })
  it('rolls to tomorrow 00:00 after the last slot', () => {
    expect(nextSlotAt(ms('2026-07-05T20:30:00Z'), SLOTS)).toBe(ms('2026-07-06T00:00:00Z'))
  })
  it('is strictly future at the slot instant', () => {
    expect(nextSlotAt(ms('2026-07-05T15:00:00Z'), SLOTS)).toBe(ms('2026-07-05T20:00:00Z'))
  })
})

describe('interval helpers preserve existing behaviour', () => {
  const FIVE_H = 5 * 3600000
  it('currentIntervalMark floors to the epoch-aligned boundary', () => {
    const now = ms('2026-07-05T12:30:00Z')
    expect(currentIntervalMark(now, FIVE_H)).toBe(Math.floor(now / FIVE_H) * FIVE_H)
  })
  it('nextIntervalAt is one boundary ahead', () => {
    const now = ms('2026-07-05T12:30:00Z')
    expect(nextIntervalAt(now, FIVE_H)).toBe((Math.floor(now / FIVE_H) + 1) * FIVE_H)
  })
})

describe('weekAnchor', () => {
  it('returns the Monday for a mid-week day', () => {
    // 2024-01-03 is a Wednesday; its week’s Monday is 2024-01-01
    expect(weekAnchor(ms('2024-01-03T12:00:00Z'))).toBe(ms('2024-01-01T00:00:00Z'))
  })
  it('returns itself at Monday 00:00', () => {
    expect(weekAnchor(ms('2024-01-01T00:00:00Z'))).toBe(ms('2024-01-01T00:00:00Z'))
  })
  it('returns the same Monday on Sunday night', () => {
    // 2024-01-07 is a Sunday
    expect(weekAnchor(ms('2024-01-07T23:59:00Z'))).toBe(ms('2024-01-01T00:00:00Z'))
  })
})

describe('isWeekStale', () => {
  const anchor = ms('2024-01-01T00:00:00Z')
  it('is stale when anchor is null', () => {
    expect(isWeekStale(null, anchor)).toBe(true)
  })
  it('is not stale within the week', () => {
    expect(isWeekStale(anchor, anchor + 3 * DAY)).toBe(false)
  })
  it('is stale at exactly 7 days', () => {
    expect(isWeekStale(anchor, anchor + 7 * DAY)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./lead-schedule` (module not created yet).

- [ ] **Step 3: Implement the helper**

Create `src/lib/lead-schedule.ts`:

```ts
// Pure scheduling maths for lead delivery. No I/O — unit-tested in isolation.
// `now` and all returns are epoch milliseconds (UTC).

const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000

// Epoch ms of 00:00:00 UTC for the day containing `now`.
function utcMidnight(now: number): number {
  const d = new Date(now)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

// Most recent fixed daily UTC slot instant <= now.
export function currentSlotMark(now: number, slotsUTC: number[]): number {
  const slots = [...slotsUTC].sort((a, b) => a - b)
  const base = utcMidnight(now)
  const todays = slots.map((h) => base + h * HOUR_MS).filter((t) => t <= now)
  if (todays.length) return Math.max(...todays)
  // Before today's earliest slot — use yesterday's latest slot.
  return base - DAY_MS + Math.max(...slots) * HOUR_MS
}

// Earliest slot instant strictly after now.
export function nextSlotAt(now: number, slotsUTC: number[]): number {
  const slots = [...slotsUTC].sort((a, b) => a - b)
  const base = utcMidnight(now)
  const todays = slots.map((h) => base + h * HOUR_MS).filter((t) => t > now)
  if (todays.length) return Math.min(...todays)
  // After today's latest slot — use tomorrow's earliest slot.
  return base + DAY_MS + Math.min(...slots) * HOUR_MS
}

export function currentIntervalMark(now: number, intervalMs: number): number {
  return Math.floor(now / intervalMs) * intervalMs
}

export function nextIntervalAt(now: number, intervalMs: number): number {
  return (Math.floor(now / intervalMs) + 1) * intervalMs
}

// Monday 00:00:00 UTC on or before `now`.
export function weekAnchor(now: number): number {
  const midnight = utcMidnight(now)
  const dow = new Date(midnight).getUTCDay() // 0=Sun..6=Sat
  const daysSinceMonday = (dow + 6) % 7
  return midnight - daysSinceMonday * DAY_MS
}

export function isWeekStale(anchorMs: number | null, now: number): boolean {
  if (anchorMs == null) return true
  return now >= anchorMs + 7 * DAY_MS
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: PASS — all describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/lead-schedule.ts src/lib/lead-schedule.test.ts
git commit -m "feat(leads): pure slot/interval/week scheduling helper with tests"
```

---

### Task 4: Add weekly-counter columns to `profiles`

**Files:**
- Create: `supabase/RUN_THIS_free_windowed_leads.sql`
- Create: `e2e/apply-windowed-migration.mjs` (applies + verifies the columns via the service role; deleted is optional)

**Interfaces:**
- Produces: `profiles.leads_week_count integer not null default 0` and `profiles.leads_week_anchor timestamptz` present in the live DB.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/RUN_THIS_free_windowed_leads.sql`:

```sql
-- Free-plan windowed leads: per-user weekly delivery counter.
-- Safe to re-run.
alter table public.profiles
  add column if not exists leads_week_count integer not null default 0;
alter table public.profiles
  add column if not exists leads_week_anchor timestamptz;
```

- [ ] **Step 2: Check for a direct Postgres connection string**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && grep -iE "DATABASE_URL|POSTGRES_URL|DIRECT_URL" .env.local | sed 's/=.*/=<set>/' || echo "none"`
Expected: either a connection var name (`<set>`) or `none`.

- [ ] **Step 3a: If a connection string exists — apply via psql**

Run (substitute the actual var name found in Step 2):
`cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && psql "$(grep -E '^DATABASE_URL=' .env.local | cut -d= -f2-)" -f supabase/RUN_THIS_free_windowed_leads.sql`
Expected: `ALTER TABLE` x2 (or no-op if already present).

- [ ] **Step 3b: If NO connection string — apply from the app runtime**

The Supabase JS client can't run DDL. Create `e2e/apply-windowed-migration.mjs` that verifies the columns exist and, if missing, prints instructions to paste the SQL into the Supabase SQL editor:

```js
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const admin = createClient(get('NEXT_PUBLIC_SUPABASE_URL'), get('SUPABASE_SERVICE_ROLE_KEY'))
const { error } = await admin.from('profiles').select('leads_week_count, leads_week_anchor').limit(1)
if (error) {
  console.log('Columns missing. Paste supabase/RUN_THIS_free_windowed_leads.sql into')
  console.log('Supabase → SQL Editor → Run, then re-run this script. Detail:', error.message)
  process.exit(1)
}
console.log('OK — leads_week_count + leads_week_anchor present')
```

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && node e2e/apply-windowed-migration.mjs`
If it reports missing, apply the SQL via the Supabase SQL editor (the RUN_THIS pattern matches existing files like `supabase/RUN_THIS_teams_and_templates.sql`), then re-run until it prints `OK`.

- [ ] **Step 4: Commit**

```bash
git add supabase/RUN_THIS_free_windowed_leads.sql e2e/apply-windowed-migration.mjs
git commit -m "feat(db): add weekly lead-counter columns to profiles"
```

---

### Task 5: Feed route — slot delivery + weekly cap enforcement

**Files:**
- Modify: `src/app/api/leads/feed/route.ts` (whole handler body)
- Create: `e2e/verify-windowed-feed.mjs` (integration check against the seeded free account)

**Interfaces:**
- Consumes: helper from Task 3, entitlements from Task 2, columns from Task 4.
- Produces: `GET /api/leads/feed` response gains (free only): `weeklyLeadCap: number`, `weeklyRemaining: number`, `weekResetAt: number` (epoch ms), `capReached: boolean`. Existing fields (`leads`, `plan`, `scanIntervalHours`, `lastScanAt`, `nextScanAt`, `delivered`, `deliveredCount`, `waitingCount`) unchanged. For paid users the weekly fields are `null`.

- [ ] **Step 1: Replace the handler body**

Replace the entire body of `export async function GET()` in `src/app/api/leads/feed/route.ts` with:

```ts
export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabase()
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_status, last_scan_at, leads_week_count, leads_week_anchor')
      .eq('id', user.id)
      .single()

    const plan = (profile?.subscription_status ?? 'free') as Tier
    const ent = entitlementsFor(plan)
    const now = Date.now()

    // Delivery mark + next-drop time depend on the tier's delivery mode.
    const prevScan = profile?.last_scan_at ? new Date(profile.last_scan_at).getTime() : now
    const slotMark = ent.deliveryMode === 'slots'
      ? currentSlotMark(now, ent.dropSlotsUTC)
      : currentIntervalMark(now, ent.scanIntervalHours * 3600000)
    const nextScanAt = ent.deliveryMode === 'slots'
      ? nextSlotAt(now, ent.dropSlotsUTC)
      : nextIntervalAt(now, ent.scanIntervalHours * 3600000)

    const boundaryCrossed = slotMark > prevScan

    // Weekly cap state (free only).
    const cap = ent.weeklyLeadCap
    let weekCount = profile?.leads_week_count ?? 0
    let weekAnchorMs = profile?.leads_week_anchor ? new Date(profile.leads_week_anchor).getTime() : null
    if (cap != null && isWeekStale(weekAnchorMs, now)) {
      weekAnchorMs = weekAnchor(now)
      weekCount = 0
    }

    let cutoff = prevScan
    let delivered = false
    let deliveredCount = 0

    if (boundaryCrossed) {
      const allowed = cap == null ? Infinity : Math.max(0, cap - weekCount)
      if (allowed > 0) {
        const prevISO = new Date(prevScan).toISOString()
        const slotISO = new Date(slotMark).toISOString()
        const { count: candidateCount } = await admin
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('created_at', prevISO)
          .lte('created_at', slotISO)
        const cc = candidateCount ?? 0
        if (cc <= allowed) {
          deliveredCount = cc
          cutoff = slotMark
        } else {
          deliveredCount = allowed as number
          // created_at of the `allowed`-th newest candidate becomes the new mark,
          // so exactly `allowed` leads fall <= cutoff; older ones wait.
          const { data: nth } = await admin
            .from('leads')
            .select('created_at')
            .eq('status', 'active')
            .gt('created_at', prevISO)
            .lte('created_at', slotISO)
            .order('created_at', { ascending: false })
            .range((allowed as number) - 1, (allowed as number) - 1)
            .single()
          cutoff = nth?.created_at ? new Date(nth.created_at).getTime() : prevScan
        }
        delivered = deliveredCount > 0
        weekCount += deliveredCount
        await admin
          .from('profiles')
          .update({
            last_scan_at: new Date(cutoff).toISOString(),
            leads_week_count: weekCount,
            leads_week_anchor: weekAnchorMs ? new Date(weekAnchorMs).toISOString() : null,
          })
          .eq('id', user.id)
      } else if (cap != null) {
        // Cap reached this week — persist the week roll if it happened, no release.
        await admin
          .from('profiles')
          .update({
            leads_week_count: weekCount,
            leads_week_anchor: weekAnchorMs ? new Date(weekAnchorMs).toISOString() : null,
          })
          .eq('id', user.id)
      }
    } else if (cap != null && (weekCount !== (profile?.leads_week_count ?? 0))) {
      // No drop, but the week rolled over — persist the reset.
      await admin
        .from('profiles')
        .update({ leads_week_count: weekCount, leads_week_anchor: weekAnchorMs ? new Date(weekAnchorMs).toISOString() : null })
        .eq('id', user.id)
    }

    const cutoffISO = new Date(cutoff).toISOString()
    const { data: leads } = await admin
      .from('leads')
      .select('*')
      .eq('status', 'active')
      .lte('created_at', cutoffISO)
      .order('posted_date', { ascending: false })

    const { count: waitingCount } = await admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('created_at', cutoffISO)

    const weeklyRemaining = cap == null ? null : Math.max(0, cap - weekCount)
    const capReached = cap == null ? false : weeklyRemaining === 0
    const weekResetAt = cap == null || weekAnchorMs == null ? null : weekAnchorMs + 7 * 86400000

    return NextResponse.json({
      leads: leads ?? [],
      plan,
      scanIntervalHours: ent.scanIntervalHours,
      lastScanAt: cutoff,
      nextScanAt,
      delivered,
      deliveredCount,
      waitingCount: waitingCount ?? 0,
      weeklyLeadCap: cap,
      weeklyRemaining,
      weekResetAt,
      capReached,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Update the imports**

At the top of `src/app/api/leads/feed/route.ts`, replace the tiers import line with the tiers + schedule imports:

```ts
import { entitlementsFor, type Tier } from '@/lib/tiers'
import {
  currentSlotMark, nextSlotAt, currentIntervalMark, nextIntervalAt,
  weekAnchor, isWeekStale,
} from '@/lib/lead-schedule'
```

- [ ] **Step 3: Typecheck**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Write the integration verifier**

Create `e2e/verify-windowed-feed.mjs`. It sets the seeded free test user's `last_scan_at` back 6h and `leads_week_count` to a chosen value, hits the feed API as that user, and prints the delivery + weekly fields:

```js
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const env = readFileSync('.env.local', 'utf8')
const get = k => env.match(new RegExp(`${k}=(.+)`))[1].trim()
const url = get('NEXT_PUBLIC_SUPABASE_URL')
const admin = createClient(url, get('SUPABASE_SERVICE_ROLE_KEY'))
const email = get('TEST_USER_EMAIL')
const { data: prof } = await admin.from('profiles').select('id').eq('email', email).single()

async function setState({ lastScanHoursAgo, weekCount }) {
  await admin.from('profiles').update({
    subscription_status: 'free',
    last_scan_at: new Date(Date.now() - lastScanHoursAgo * 3600000).toISOString(),
    leads_week_count: weekCount,
    leads_week_anchor: null, // force a fresh week roll
  }).eq('id', prof.id)
}
async function callFeed() {
  const user = createClient(url, get('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
  await user.auth.signInWithPassword({ email, password: get('TEST_USER_PASSWORD') })
  const { data: { session } } = await user.auth.getSession()
  const res = await fetch('http://localhost:3000/api/leads/feed', {
    headers: { cookie: '', authorization: `Bearer ${session.access_token}` },
  })
  return res.json()
}

// Scenario A: fresh week, plenty of quota, a boundary crossed 6h ago.
await setState({ lastScanHoursAgo: 6, weekCount: 0 })
const a = await callFeed()
console.log('A delivered:', a.delivered, 'deliveredCount:', a.deliveredCount, 'remaining:', a.weeklyRemaining, 'capReached:', a.capReached, 'leads:', a.leads.length)

// Scenario B: near cap (48 of 50 used).
await setState({ lastScanHoursAgo: 6, weekCount: 48 })
const b = await callFeed()
console.log('B deliveredCount (<=2 expected):', b.deliveredCount, 'remaining:', b.weeklyRemaining, 'capReached:', b.capReached)

// Scenario C: cap reached (50 of 50).
await setState({ lastScanHoursAgo: 6, weekCount: 50 })
const c = await callFeed()
console.log('C capReached (true expected):', c.capReached, 'remaining:', c.weeklyRemaining, 'deliveredCount (0 expected):', c.deliveredCount)
```

> Note: the feed route reads the session from the SSR cookie, not a bearer header. If the bearer call returns Unauthorized, drive the feed through Playwright instead (log in, then `page.request.get('/api/leads/feed')` reusing the browser cookies) — Task 6 already logs in, so fold this assertion there. Prefer the Playwright path if the bearer path 401s.

- [ ] **Step 5: Run the verifier (dev server must be running on :3000)**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && node e2e/verify-windowed-feed.mjs`
Expected: A shows `delivered: true` with `deliveredCount` ≤ 50 and `capReached: false`; B shows `deliveredCount` ≤ 2 and `remaining: 0`; C shows `capReached: true`, `remaining: 0`, `deliveredCount: 0`.
(If the bearer call 401s, skip to Task 6 and assert these via Playwright's authenticated `page.request` instead.)

- [ ] **Step 6: Restore the test account and commit**

```bash
cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && node e2e/set-plan.mjs free
git add src/app/api/leads/feed/route.ts e2e/verify-windowed-feed.mjs
git commit -m "feat(leads): slot-based delivery + weekly cap for the free plan"
```

---

### Task 6: Feed UI — weekly meter + cap-reached state

**Files:**
- Modify: `src/components/RefreshBar.tsx` (add weekly props + a cap-reached branch)
- Modify: `src/app/dashboard/page.tsx` (new state + pass props; render cap-reached panel)
- Modify: `src/app/globals.css` (styles for the weekly meter + cap panel)
- Create: `e2e/shot-windowed-states.mjs` (Playwright screenshots of the 3 states)

**Interfaces:**
- Consumes: feed response fields from Task 5 (`weeklyLeadCap`, `weeklyRemaining`, `weekResetAt`, `capReached`).
- Produces: visible weekly meter for free users, plus a distinct locked panel when `capReached`.

- [ ] **Step 1: Extend `RefreshBar` props and render a weekly meter**

In `src/components/RefreshBar.tsx`, extend `type Props` with:

```ts
  /** Free-plan weekly cap (null for paid). */
  weeklyLeadCap?: number | null
  /** Leads left this week (null for paid). */
  weeklyRemaining?: number | null
```

Change the signature to destructure them:

```ts
export default function RefreshBar({ nextScanAt, waitingCount = 0, newCount = 0, weeklyLeadCap = null, weeklyRemaining = null, onScanReady }: Props) {
```

Then, inside the returned `<span className="rb-inline">`, after the `rb-status` span, add the meter (only when a cap applies):

```tsx
      {weeklyLeadCap != null && weeklyRemaining != null && (
        <span className="rb-week tip" data-tip={`${weeklyLeadCap - weeklyRemaining} of ${weeklyLeadCap} leads used this week`}>
          <span className="rb-week-bar">
            <span className="rb-week-fill" style={{ width: `${Math.min(100, ((weeklyLeadCap - weeklyRemaining) / weeklyLeadCap) * 100)}%` }} />
          </span>
          <span className="rb-week-num">{weeklyRemaining}/{weeklyLeadCap} left</span>
        </span>
      )}
```

- [ ] **Step 2: Wire feed state in the dashboard page**

In `src/app/dashboard/page.tsx`, near the other feed state (around line 173-174 where `nextScanAt`/`waitingCount` are declared) add:

```ts
  const [weeklyLeadCap, setWeeklyLeadCap] = useState<number | null>(null)
  const [weeklyRemaining, setWeeklyRemaining] = useState<number | null>(null)
  const [weekResetAt, setWeekResetAt] = useState<number | null>(null)
  const [capReached, setCapReached] = useState(false)
```

In the feed fetch handler (around line 244-245 where `setNextScanAt`/`setWaitingCount` are called) add:

```ts
      setWeeklyLeadCap(typeof fd.weeklyLeadCap === 'number' ? fd.weeklyLeadCap : null)
      setWeeklyRemaining(typeof fd.weeklyRemaining === 'number' ? fd.weeklyRemaining : null)
      setWeekResetAt(typeof fd.weekResetAt === 'number' ? fd.weekResetAt : null)
      setCapReached(!!fd.capReached)
```

- [ ] **Step 3: Pass the new props to `RefreshBar`**

Find the `<RefreshBar ... />` usage (around line 795) and add the two props:

```tsx
            <RefreshBar nextScanAt={nextScanAt} waitingCount={waitingCount} newCount={newCount} weeklyLeadCap={weeklyLeadCap} weeklyRemaining={weeklyRemaining} onScanReady={() => syncFeed()} />
```

- [ ] **Step 4: Render the cap-reached panel**

Immediately before the feed list renders (locate where the `leads` array is mapped to cards in `src/app/dashboard/page.tsx`), add a banner shown only when `capReached`:

```tsx
      {capReached && (
        <div className="cap-panel">
          <i className="ti ti-lock" aria-hidden="true" />
          <div className="cap-panel-txt">
            <b>You&apos;ve reached this week&apos;s {weeklyLeadCap} leads.</b>
            <span>{weekResetAt ? `New leads unlock ${new Date(weekResetAt).toLocaleDateString('en-GB', { weekday: 'long' })} · ` : ''}or upgrade for unlimited leads.</span>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/billing')}>
            <i className="ti ti-bolt" /> Upgrade
          </button>
        </div>
      )}
```

(Confirm `router` is in scope in this component; the page already uses `useRouter`. If the class name `btn btn-primary` differs from the page's button convention, match the existing primary-button class used elsewhere on this page.)

- [ ] **Step 5: Add styles**

Append to `src/app/globals.css`:

```css
/* Free-plan weekly lead meter (RefreshBar) */
.rb-week { display: inline-flex; align-items: center; gap: 8px; }
.rb-week-bar { width: 46px; height: 5px; border-radius: 3px; background: var(--line); overflow: hidden; }
.rb-week-fill { display: block; height: 100%; background: var(--lime-deep); border-radius: 3px; }
.rb-week-num { font-family: var(--font-mono); font-size: 11px; color: var(--slate); }

/* Weekly cap-reached panel */
.cap-panel { display: flex; align-items: center; gap: 14px; padding: 16px 18px; margin-bottom: 16px; background: var(--card); border: 1px solid var(--line); border-radius: var(--r-lg); }
.cap-panel > .ti { font-size: 22px; color: var(--lime-deep); flex-shrink: 0; }
.cap-panel-txt { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.cap-panel-txt b { font-size: 14px; color: var(--ink); }
.cap-panel-txt span { font-size: 12.5px; color: var(--slate); }
```

- [ ] **Step 6: Typecheck**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Screenshot the 3 states**

Create `e2e/shot-windowed-states.mjs`. It logs in, forces each profile state via the service role, reloads the feed, and screenshots. It uses `page.request.get('/api/leads/feed')` to double as the Task 5 assertion if the bearer path failed.

```js
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

for (const [name, weekCount] of [['within-quota', 5], ['near-cap', 48], ['cap-reached', 50]]) {
  await setState(weekCount, 6)
  const j = await (await page.request.get('http://localhost:3000/api/leads/feed')).json()
  console.log(name, '-> remaining:', j.weeklyRemaining, 'capReached:', j.capReached, 'delivered:', j.deliveredCount)
  await page.goto('http://localhost:3000/dashboard')
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `e2e/windowed-${name}.png`, fullPage: true })
}
await browser.close()
```

- [ ] **Step 8: Run it and inspect the screenshots (dev server on :3000)**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && node e2e/shot-windowed-states.mjs`
Expected console: `within-quota` → capReached false, remaining ~45; `cap-reached` → capReached true, remaining 0, delivered 0. Open `e2e/windowed-within-quota.png` (meter shows leads left) and `e2e/windowed-cap-reached.png` (lock panel visible). Fix any layout/copy issues before committing.

- [ ] **Step 9: Restore the test account and commit**

```bash
cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && node e2e/set-plan.mjs free
git add src/components/RefreshBar.tsx src/app/dashboard/page.tsx src/app/globals.css e2e/shot-windowed-states.mjs
git commit -m "feat(feed): weekly lead meter + cap-reached state for free plan"
```

---

### Task 7: Regression — paid tiers unchanged + full build

**Files:** none (verification only)

**Interfaces:** confirms Task 5/6 didn't change paid behaviour.

- [ ] **Step 1: Confirm a paid account still gets interval delivery, no cap fields**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && node e2e/set-plan.mjs max && node e2e/verify-windowed-feed.mjs; node e2e/set-plan.mjs free`
Expected: for the `max` account the feed returns `weeklyLeadCap: null`, `capReached: false`, and delivers on the 1h interval (not slots). Then the account is restored to free.

- [ ] **Step 2: Full typecheck + production build**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && npx tsc --noEmit && npm run build`
Expected: tsc clean; build succeeds.

- [ ] **Step 3: Unit tests still green**

Run: `cd "C:/Users/Mamadou Sow/Desktop/Flaiir" && npm test`
Expected: all `lead-schedule` tests pass.

- [ ] **Step 4: Final commit (if any verification tweaks were needed)**

```bash
git add -A
git commit -m "test: verify paid tiers unchanged by windowed free delivery" --allow-empty
```

---

## Self-Review notes

- **Spec coverage:** fixed slots (Task 3 + 5), weekly cap w/ mark-advancement (Task 5), entitlement fields (Task 2), profiles columns (Task 4), 3 UI states (Task 6), paid-unchanged + verification (Tasks 5-7). All spec sections mapped.
- **Cap-hit UX:** the spec hides the daily countdown when capped; the `cap-panel` shows the Monday reset and the meter reads `0/50 left`. The RefreshBar countdown still renders but the cap panel is the primary signal — if the countdown should be fully hidden when `capReached`, gate the `rb-status` span on `!capReached` (minor, decide during Task 6 Step 8 review).
- **Types:** helper signatures in Task 3 match their use in Task 5; response field names in Task 5 match the setters in Task 6.
