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

// ── Experience Level ─────────────────────────────────────────────────────────
const LEVEL_PATTERNS: [RegExp, string][] = [
  [/\b(executive|head\s+of|vp\s+of|director\s+of|chief\s+)\b/i, 'Executive'],
  [/\b(senior|sr\.?|lead\s+|principal|staff|architect)\b/i, 'Expert'],
  [/\b(mid[\s-]?level|intermediate|mid)\b/i, 'Intermediate'],
  [/\b(junior|jr\.?|entry[\s-]?level|graduate|trainee|associate|apprentice)\b/i, 'Entry'],
]

export function deriveExperienceLevel(title?: string | null): string | null {
  if (!title) return null
  for (const [re, level] of LEVEL_PATTERNS) {
    if (re.test(title)) return level
  }
  return null
}

// ── Source verification ──────────────────────────────────────────────────────
// Platforms known to offer payment protection / escrow / verified payment.
export const VERIFIED_SOURCE_DOMAINS = [
  'reed.co.uk',
  'weworkremotely.com',
  'remoteok.com',
  'upwork.com',
  'toptal.com',
  'flexjobs.com',
]
export function sourceIsVerified(sourceUrl?: string | null): boolean {
  const url = (sourceUrl || '').toLowerCase()
  return VERIFIED_SOURCE_DOMAINS.some(d => url.includes(d))
}

// ── Client credibility helpers ────────────────────────────────────────────────

export function sourceTrustLevel(sourceUrl?: string | null): { label: string; color: string; icon: string } {
  const url = (sourceUrl || '').toLowerCase()
  if (VERIFIED_SOURCE_DOMAINS.some(d => url.includes(d))) {
    return { label: 'Verified platform', color: '#0DB955', icon: 'ti-shield-check' }
  }
  if (BIDDING_DOMAINS.some(d => url.includes(d))) {
    return { label: 'Marketplace', color: '#F7931A', icon: 'ti-building-store' }
  }
  return { label: 'Community board', color: '#6B7A8F', icon: 'ti-messages' }
}

export function deriveLocationFlexibility(location?: string | null): string | null {
  if (!location) return null
  const loc = location.toLowerCase()
  if (/\b(worldwide|anywhere|global|remote[\s-]?(first|friendly)?)\b/.test(loc)) return '100% Remote'
  if (/\bremote\b/.test(loc)) return 'Remote'
  if (/\bhybrid\b/.test(loc)) return 'Hybrid'
  if (/\bon.?site\b/.test(loc)) return 'On-site'
  return null
}

// Up to three consecutive Title-Case tokens — a plausible company name. A token
// may carry a dotted suffix (Builder.io) but NOT a bare sentence period, so the
// match can't span across "…Products. DoorDash…".
const COMPANY_TOKENS = String.raw`[A-Z][A-Za-z0-9&\-]*(?:\.[A-Za-z0-9]+)?(?:\s+[A-Z][A-Za-z0-9&\-]*(?:\.[A-Za-z0-9]+)?){0,2}`

function cleanCompany(raw: string): string | null {
  const c = raw.trim().replace(/[.,]+$/, '')
  // Reject junk: too long, too many words, or generic role words.
  if (!c || c.length > 32 || c.split(/\s+/).length > 3) return null
  if (/^(The|A|An|This|Our|We|Manager|Senior|Lead|Remote|Contract|Team)$/i.test(c)) return null
  return c
}

export function extractCompanyName(title?: string | null, description?: string | null): string | null {
  const text = [title, description].filter(Boolean).join('. ')
  // 1) "Acme is hiring / Acme is seeking / Acme are looking for…" — company leads the sentence.
  let m = text.match(new RegExp(String.raw`\b(${COMPANY_TOKENS})\s+(?:is|are)\s+(?:seeking|hiring|looking|searching|recruiting)`))
  if (m) { const c = cleanCompany(m[1]); if (c) return c }
  // 2) "…at/for/with Acme[.,]" — must be Title-Case tokens only (stops before lowercase like "focused on").
  m = text.match(new RegExp(String.raw`\b(?:at|for|with)\s+(${COMPANY_TOKENS})(?=[\s.,!?]|$)`))
  if (m) { const c = cleanCompany(m[1]); if (c) return c }
  return null
}

export function competitionLevel(applicants: number): { label: string; color: string } {
  if (applicants <= 3) return { label: 'Low', color: '#0DB955' }
  if (applicants <= 10) return { label: 'Medium', color: '#F7931A' }
  return { label: 'High', color: '#EC4831' }
}
