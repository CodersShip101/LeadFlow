# Free-plan windowed lead delivery — design

Date: 2026-07-05
Status: approved for planning

## Goal

Give the free plan a Claude-style rate-limited access model so free users get a
real taste of the product but hit a clear wall that motivates upgrading. Two
composed limits:

1. **Daily drops** — new leads are released only at 5 fixed times each day.
2. **Weekly cap** — a free user receives at most 50 leads per week.

This is a refinement of the delivery engine that already exists in
`src/app/api/leads/feed/route.ts`, not a new subsystem. Paid tiers are
unchanged.

## Decisions (locked)

- **Drop schedule (free):** 5 fixed UTC slots — **00:00, 05:00, 10:00, 15:00,
  20:00** — repeating at the same clock time every day. Replaces the current
  5h-from-epoch interval, which drifts ~1h/day because 24 isn't divisible by 5.
- **Weekly cap (free):** **50 leads/week**, reset **Mondays 00:00 UTC**. Single
  tunable constant.
- **Paid tiers:** untouched. Starter every 2h, Pro/Team every 1h, no weekly cap.
- **Applications cap:** unchanged (5/month for free). Separate limit.
- **Cap-hit UX:** when the weekly cap is exhausted, the daily-drop countdown is
  hidden (it would mislead — nothing can release), and the feed shows only the
  "resets Monday · upgrade for unlimited" state.

## What stays the same

- The per-user high-water-mark model: leads are scraped once into a shared pool;
  each user receives leads up to their personal delivery mark; the mark advances
  when a delivery boundary is crossed. Enforced server-side with the admin
  client so it can't be bypassed from the browser.
- The response fields the feed UI already consumes: `leads`, `plan`,
  `nextScanAt`, `waitingCount`, `deliveredCount`, `lastScanAt`.

## Delivery schedule (free): fixed slots

Replace the interval-boundary math with slot math for free users only:

- `slotsUTC = [0, 5, 10, 15, 20]` (hours).
- **Current mark** = the most recent slot instant ≤ now (today's slots plus
  yesterday's 20:00 for the pre-00:00 case).
- **Next drop** (`nextScanAt`) = the earliest slot instant > now.
- A delivery happens when the current mark is newer than the stored
  `last_scan_at` (i.e. a slot boundary was crossed since last read).

Paid tiers keep `deliveryMode: 'interval'` and the existing epoch-boundary
interval math.

## Weekly cap (free): data model + enforcement

New `profiles` columns:

- `leads_week_count integer not null default 0`
- `leads_week_anchor timestamptz` — start of the user's current week (Monday
  00:00 UTC).

The key idea: the weekly cap constrains **how far the delivery mark advances**,
not what the feed is allowed to show. The mark only moves forward across leads we
actually release, so the feed can always return everything ≤ mark (cumulative,
never hidden) while new releases are capped. Nothing is ever lost — leads held
back stay `> mark` and become releasable at the next drop or after the weekly
reset.

On each feed read (free only):

1. **Roll the week if stale.** If `leads_week_anchor` is null or
   `now ≥ leads_week_anchor + 7 days`, set `leads_week_anchor` to the current
   Monday 00:00 UTC and reset `leads_week_count = 0`.
2. **On a drop** (slot boundary crossed and `allowed > 0`):
   - `allowed = max(0, weeklyLeadCap − leads_week_count)`.
   - Candidate leads = active leads with `created_at` in
     `(last_scan_at, current slot mark]`, ordered by `created_at desc`.
   - If candidate count ≤ `allowed`: `released` = candidate count; advance
     `last_scan_at` to the current slot mark.
   - If candidate count > `allowed`: `released = allowed`; advance `last_scan_at`
     to the `created_at` of the `allowed`-th newest candidate (so exactly those
     `allowed` leads become `≤ mark`; older candidates stay `> mark`).
   - `leads_week_count += released`.
   - If `allowed == 0` (cap already reached): no release, mark unchanged,
     `capReached = true`.
3. **Feed contents.** The free feed returns active leads with
   `created_at ≤ last_scan_at`, ordered by `posted_date desc`, with **no count
   limit**. Because the mark only advanced by released (capped) leads, this is
   exactly the cumulative delivered set and stays visible across weekly resets.

Paid tiers skip all of the above (no cap; advance mark to the interval boundary;
return all leads ≤ mark).

## Entitlements (`src/lib/tiers.ts`)

Extend `Entitlements`:

- `deliveryMode: 'slots' | 'interval'`
- `dropSlotsUTC: number[]` (used when `deliveryMode === 'slots'`)
- `weeklyLeadCap: number | null`

Values:

- free: `deliveryMode: 'slots'`, `dropSlotsUTC: [0,5,10,15,20]`,
  `weeklyLeadCap: 50`. Keep `scanIntervalHours` for backward-compat display but
  it's no longer the free delivery driver.
- pro/max/team/enterprise: `deliveryMode: 'interval'`, `dropSlotsUTC: []`,
  `weeklyLeadCap: null` (existing `scanIntervalHours` unchanged).

## API response additions

`GET /api/leads/feed` adds, for free users:

- `weeklyLeadCap` (number)
- `weeklyRemaining` (number = cap − count)
- `weekResetAt` (ISO, next Monday 00:00 UTC)
- `capReached` (boolean)

Existing fields unchanged. For paid users the weekly fields are null/absent.

## UX (feed page)

Free-user status line has three states:

1. **Leads available (just dropped / within quota):** existing feed, plus a
   subtle "N of 50 leads this week" meter.
2. **Between drops, quota remaining:** "Next drop 15:00 UTC · X waiting · N of 50
   this week" + an "Upgrade to see them now" nudge.
3. **Weekly cap reached:** distinct locked panel — "You've reached this week's 50
   leads. Resets Monday · or upgrade for unlimited leads" + countdown to Monday.
   Daily-drop countdown hidden. Already-delivered leads remain visible above it.

All copy must be honest (no fake numbers). Paid users see none of this.

## Files touched

- `src/lib/tiers.ts` — new entitlement fields + free/paid values.
- `src/lib/` — a small pure helper module for schedule math (current mark, next
  drop, week anchor) so it's unit-testable in isolation.
- `src/app/api/leads/feed/route.ts` — branch on `deliveryMode`; apply weekly cap
  for free; add response fields.
- DB migration — add the two `profiles` columns (SQL file under `supabase/`).
- Feed page component — the three status states + weekly meter.

## Verification

- Unit-test the pure schedule/week helper (slot boundaries around midnight and
  the 20:00→00:00 4h gap; week roll on Monday; cap arithmetic).
- Playwright against the seeded test account: force `last_scan_at` and
  `leads_week_count` to exercise (a) a normal drop, (b) near-cap partial
  release, (c) cap-reached locked state — asserting released counts and that the
  correct UI state renders (screenshots).
- `npx tsc --noEmit` clean; paid-tier feed behaviour unchanged (regression
  check with a pro account).

## Out of scope

- Per-user timezones (UTC only).
- Changing the applications/month cap.
- Any paid-tier behaviour change.
