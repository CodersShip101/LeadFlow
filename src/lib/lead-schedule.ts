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
