/**
 * "Easy-work engine" filters.
 *
 * Three signals that help freelancers — especially those without a platform
 * reputation — win work fast:
 *   1. Direct Apply Only — no bidding-platform middlemen (Upwork, Fiverr…)
 *   2. Beginner-friendly — posts that welcome juniors / no experience
 *   3. Freshness — posted in the last few hours, so you pitch first
 *
 * Used both at ingestion (scrape-leads) and at read time (dashboard/API).
 */

// ── Direct Apply Only ────────────────────────────────────────────────────
// Bidding/marketplace platforms where you compete on proposals + reputation.
export const BIDDING_DOMAINS = [
  'upwork.com',
  'fiverr.com',
  'freelancer.com',
  'peopleperhour.com',
  'guru.com',
  '99designs.com',
  'toptal.com',
  'workana.com',
]

/**
 * True when a lead can be applied to directly (email / ATS / direct link),
 * i.e. it is NOT hosted on or pointing at a bidding marketplace.
 */
export function isDirectApply(sourceUrl?: string | null, text?: string | null): boolean {
  const url = (sourceUrl || '').toLowerCase()
  if (BIDDING_DOMAINS.some(d => url.includes(d))) return false
  // A post that funnels you to a marketplace isn't really "direct apply"
  const body = (text || '').toLowerCase()
  if (BIDDING_DOMAINS.some(d => body.includes(d))) return false
  return true
}

// ── Beginner-friendly / No-Experience tier ───────────────────────────────
const BEGINNER_PATTERNS = [
  /\bbeginners?\s+welcome\b/i,
  /\bno\s+experience\b/i,
  /\bentry[-\s]?level\b/i,
  /\bjunior\b/i,
  /\bwill\s+train\b/i,
  /\btraining\s+provided\b/i,
  /\bgreat\s+for\s+(students|beginners)\b/i,
  /\bopen\s+to\s+(juniors?|beginners?)\b/i,
  /\bfast\s+turnaround\b/i,
  /\bquick\s+(task|gig|job)\b/i,
  /\bsimple\s+(task|project)\b/i,
]

/** True when the lead reads as accessible to someone starting out. */
export function isBeginnerFriendly(text?: string | null): boolean {
  const body = text || ''
  if (!body) return false
  return BEGINNER_PATTERNS.some(re => re.test(body))
}

// ── Freshness ─────────────────────────────────────────────────────────────
export function hoursSince(date?: string | null): number {
  if (!date) return Infinity
  const t = new Date(date).getTime()
  if (Number.isNaN(t)) return Infinity
  return (Date.now() - t) / 3600000
}

/** Posted within the last `withinHours` hours (default 6). */
export function isFresh(date?: string | null, withinHours = 6): boolean {
  return hoursSince(date) <= withinHours
}
