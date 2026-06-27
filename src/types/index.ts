export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  skills: string[] | null;
  disciplines: string[] | null;
  experience_level: string | null;
  hourly_rate: number | null;
  location: string | null;
  timezone: string | null;
  portfolio_url: string | null;
  availability: string | null;
  onboarding_completed: boolean;
  subscription_status: 'free' | 'pro' | 'max' | 'team';
  created_at: string;
}

export interface Lead {
  id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  project_type: string | null;
  skills_required: string[] | null;
  responsibilities?: string[] | null;
  benefits?: string[] | null;
  client_location: string | null;
  client_name?: string | null;
  source_url: string | null;
  posted_date: string;
  expiry_date: string | null;
  status: 'active' | 'filled' | 'expired';
  ir35?: string | null;
  fingerprint?: string | null;
  created_at?: string;
}

export interface Application {
  id: string;
  freelancer_id: string;
  lead_id: string;
  status: 'saved' | 'interested' | 'applied' | 'hired';
  outcome: 'won' | 'lost' | 'pending' | null;
  outcome_at: string | null;
  created_at: string;
}

export interface PricingTier {
  name: string;
  price: number;
  annualPrice?: number;
  priceLabel: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

// ── Client telemetry / trust types (from migration_005) ──────────────
export interface ClientProfile {
  client_id: string;
  company_name: string | null;
  company_website: string | null;
  is_payment_verified: boolean;
  stripe_customer_id: string | null;
  avg_response_mins: number;
  total_posted: number;
  total_hired: number;
  total_spent: number;
}

export interface ClientTelemetry {
  client_id: string;
  company_name: string | null;
  is_payment_verified: boolean;
  has_payment_method: boolean;
  total_hired: number;
  total_posted: number;
  hire_rate_pct: number;
  total_spent: number;
  avg_response_mins: number;
}

export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  contract_type: 'FIXED_PRICE' | 'HOURLY' | 'MILESTONE';
  budget_allocated: number | null;
  status: 'OPEN' | 'HIRED' | 'EXPIRED' | 'CANCELLED';
  scope_score: number;
  is_escrow_funded: boolean;
  source: string;
  source_url: string | null;
  created_at: string;
  closed_at: string | null;
}

/** Compute a lead-level scope completeness score (1-4) from scraped lead data. */
export function computeScopeScore(lead: Lead): { score: number; items: { label: string; met: boolean }[] } {
  const items = [
    { label: 'Deliverables', met: (lead.description?.length || 0) > 80 },
    { label: 'Timeline', met: !!lead.expiry_date || (lead.project_type?.toLowerCase().includes('urgent') ?? false) },
    { label: 'Technical stack', met: (lead.skills_required?.length || 0) > 0 },
    { label: 'Budget', met: !!(lead.budget_min || lead.budget_max) },
  ]
  return { score: items.filter(i => i.met).length, items }
}

/** Compute lead-level trust signals from scraped data. */
export function computeLeadTrust(lead: Lead): {
  escrow: boolean;
  contractType: string;
  scopeScore: number;
  scopeItems: { label: string; met: boolean }[];
} {
  const { score, items } = computeScopeScore(lead)
  const escrow = lead.source_url?.includes('reed.co.uk') ?? false
  const contractType = lead.project_type || 'Fixed Price'
  return { escrow, contractType, scopeScore: score, scopeItems: items }
}

export function computeQualityScore(lead: Lead): number {
  let score = 5
  if (lead.budget_min || lead.budget_max) score += 2
  if (lead.skills_required && lead.skills_required.length > 0) score += 2
  if (lead.client_location) score += 1
  if (lead.description && lead.description.length > 100) score += 1
  if (lead.description && lead.description.length < 50) score -= 1
  return Math.max(1, Math.min(10, score))
}

export interface SubScore {
  /** Short label, e.g. "Skill match" */
  label: string
  /** 0–10 component score */
  value: number
  /** Relative weight in the composite (0–1) */
  weight: number
  /** One-line human explanation */
  detail: string
  /** lucide/tabler icon name without the `ti-` prefix */
  icon: string
}

export interface MatchExplanation {
  score: number
  /** Legacy binary breakdown — kept for the lead detail page */
  breakdown: { label: string; achieved: boolean; detail: string }[]
  /** Weighted component scores powering the "Why this score?" view */
  subScores: SubScore[]
  summary: string
  /** Single-line tooltip explanation */
  why: string
  /** Strongest sub-score with label — so UI can show "Skill match 6/10" not a bare number */
  topSubScore: { label: string; value: number }
  skillMatch: { matched: string[]; missing: string[] }
}

export function clamp10(n: number) {
  return Math.max(0, Math.min(10, Math.round(n)))
}

// ── TF-IDF Cosine Similarity for semantic matching ────────────────
function tokenize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s#+]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !['the','and','for','are','not','but','had','has','was','all','can','you','our','its','per','via','use','get','new','job','role'].includes(t))
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, nA = 0, nB = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; nA += a[i] * a[i]; nB += b[i] * b[i] }
  const denom = Math.sqrt(nA) * Math.sqrt(nB)
  return denom === 0 ? 0 : dot / denom
}

/** Compute TF-IDF cosine similarity between profile text and lead text. Returns 0–1. */
export function semanticSimilarity(profileText: string, leadText: string): number {
  const profileTokens = tokenize(profileText)
  const leadTokens = tokenize(leadText)
  if (profileTokens.length === 0 || leadTokens.length === 0) return 0
  const vocab = [...new Set([...profileTokens, ...leadTokens])]
  const profileTf = vocab.map(w => profileTokens.filter(t => t === w).length / profileTokens.length)
  const leadTf = vocab.map(w => leadTokens.filter(t => t === w).length / leadTokens.length)
  const df = vocab.map(w => (profileTokens.includes(w) ? 1 : 0) + (leadTokens.includes(w) ? 1 : 0))
  const idf = df.map(d => Math.log(2 / d))
  const profileTfidf = profileTf.map((tf, i) => tf * idf[i])
  const leadTfidf = leadTf.map((tf, i) => tf * idf[i])
  return cosineSimilarity(profileTfidf, leadTfidf)
}

// ── Skill alias map — fuzzy matching for common abbreviations ───────────────
const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ['js', 'es6', 'ecmascript', 'vanilla js'],
  typescript: ['ts'],
  react: ['reactjs', 'react.js', 'react js'],
  'next.js': ['nextjs', 'next js', 'next'],
  'node.js': ['node', 'nodejs'],
  python: ['py'],
  postgresql: ['postgres', 'psql', 'pg'],
  css: ['css3', 'scss', 'sass', 'less'],
  html: ['html5'],
  figma: ['figma design'],
  aws: ['amazon web services', 'amazon aws'],
  gcp: ['google cloud', 'google cloud platform'],
  azure: ['microsoft azure'],
  'vue.js': ['vue', 'vuejs'],
  'svelte': ['sveltekit'],
  kubernetes: ['k8s'],
  docker: ['containers'],
  graphql: ['graph ql'],
  'react native': ['rn'],
  flutter: ['dart/flutter'],
  wordpress: ['wp'],
  shopify: ['shopify liquid', 'liquid'],
}

function fuzzySkillMatch(profileSkill: string, leadSkill: string): boolean {
  const a = profileSkill.trim().toLowerCase()
  const b = leadSkill.trim().toLowerCase()
  if (a === b) return true
  if (a.includes(b) || b.includes(a)) return true
  const aliasesA = SKILL_ALIASES[a] || []
  if (aliasesA.includes(b)) return true
  const aliasesB = SKILL_ALIASES[b] || []
  if (aliasesB.includes(a)) return true
  return false
}

export function computeMatchExplanation(lead: Lead, profile?: Profile | null): MatchExplanation {
  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  if (profile?.skills && lead.skills_required) {
    for (const s of lead.skills_required) {
      const matched = profile.skills.some(ps => fuzzySkillMatch(ps, s))
      if (matched) matchedSkills.push(s)
      else missingSkills.push(s)
    }
  }

  const reqCount = lead.skills_required?.length || 0
  const budgetKnown = !!(lead.budget_min || lead.budget_max)
  const skillsKnown = reqCount > 0
  const locationKnown = !!lead.client_location
  const descLen = lead.description?.length || 0

  // ── Skill match (weight 0.30) ─────────────────────────────────
  let skillValue: number
  let skillDetail: string
  if (!profile?.skills || profile.skills.length === 0) {
    skillValue = 5
    skillDetail = 'Add skills to your profile for a personalised score'
  } else if (!skillsKnown) {
    skillValue = 6
    skillDetail = 'No skills listed — matched on rate and recency'
  } else {
    const ratio = matchedSkills.length / reqCount
    // FIX #1: no floor. 0 matched skills now scores 0, not 3.
    skillValue = clamp10(Math.round(ratio * 10))
    skillDetail = matchedSkills.length === reqCount
      ? `All ${reqCount} required skills match your profile`
      : matchedSkills.length === 0
        ? `None of the ${reqCount} required skills match your profile`
        : `${matchedSkills.length} of ${reqCount} required skills match your profile`
  }

  // ── Semantic match via TF-IDF (weight 0.20) ────────────────────
  let semanticValue: number
  let semanticDetail: string
  const profileText = [profile?.skills?.join(' '), profile?.disciplines?.join(' '), profile?.experience_level].filter(Boolean).join(' ')
  const leadText = [lead.title, lead.description, lead.skills_required?.join(' ')].filter(Boolean).join(' ')
  if (!profileText.trim()) {
    semanticValue = 5
    semanticDetail = 'Add skills to your profile for semantic matching'
  } else {
    const sim = semanticSimilarity(profileText, leadText)
    // FIX #1b: no floor. sim=0 now scores 0, not 2.
    semanticValue = clamp10(Math.round(sim * 10))
    semanticDetail = sim > 0.5
      ? `Strong semantic match (${(sim * 100).toFixed(0)}% similarity to your profile)`
      : sim > 0.3
        ? `Moderate semantic match (${(sim * 100).toFixed(0)}% similarity to your profile)`
        : sim > 0
          ? `Weak semantic match (${(sim * 100).toFixed(0)}% similarity)`
          : 'No meaningful overlap with your profile'
  }

  // ── Rate match (weight 0.25) ──────────────────────────────────
  let rateValue: number
  let rateDetail: string
  const leadBudget = lead.budget_max || lead.budget_min || 0
  const myRate = profile?.hourly_rate || 0
  if (!budgetKnown) {
    rateValue = 5
    rateDetail = 'No rate listed — worth checking directly'
  } else if (!myRate) {
    rateValue = 7
    rateDetail = `Budget ${lead.budget_min ? `£${lead.budget_min}` : ''}${lead.budget_max ? `–£${lead.budget_max}` : '+'} listed`
  } else {
    // Compare lead daily budget to profile daily rate (hourly × 8)
    const myDayRate = myRate * 8
    const ratio = leadBudget / myDayRate
    if (ratio >= 1.2) { rateValue = 10; rateDetail = `Budget is ${Math.round((ratio - 1) * 100)}% above your rate` }
    else if (ratio >= 1.0) { rateValue = 9; rateDetail = `Budget meets your rate (£${myDayRate}/day)` }
    else if (ratio >= 0.85) { rateValue = 7; rateDetail = `Budget is ${Math.round((1 - ratio) * 100)}% below your rate` }
    else if (ratio >= 0.7) { rateValue = 5; rateDetail = `Budget is ${Math.round((1 - ratio) * 100)}% below your rate` }
    else if (ratio >= 0.5) { rateValue = 3; rateDetail = `Budget is well below your rate (£${myDayRate}/day)` }
    else { rateValue = 1; rateDetail = `Budget is significantly below your rate` }
  }

  // ── Recency (weight 0.15) — gentler decay ─────────────────────
  // FIX #2: boundary off-by-one. '<=' so a lead at exactly 168h (7 days)
  // lands in the 7-day bucket (5), not the 14-day bucket (3).
  const ageHours = (Date.now() - new Date(lead.posted_date).getTime()) / 3600000
  const recencyValue = clamp10(
    ageHours <= 6   ? 10 :
    ageHours <= 24  ? 9  :
    ageHours <= 48  ? 8  :
    ageHours <= 96  ? 7  :
    ageHours <= 168 ? 5  :
    ageHours <= 336 ? 3  : 2
  )
  const recencyDetail =
    ageHours < 1   ? 'Posted within the hour' :
    ageHours < 24  ? `Posted ${Math.round(ageHours)}h ago` :
                     `Posted ${Math.round(ageHours / 24)}d ago`

  // ── Detail / quality (weight 0.10) — richer signals ──────────
  let qualityScore = 0
  if (budgetKnown) qualityScore += 2.5          // budget is the strongest quality signal
  if (skillsKnown) qualityScore += 2            // skills listed
  if (descLen > 200) qualityScore += 2          // thorough description
  else if (descLen > 80) qualityScore += 1      // adequate description
  if (locationKnown) qualityScore += 1.5        // location specified
  if (lead.project_type) qualityScore += 1      // project type clear
  if (lead.expiry_date) qualityScore += 1       // deadline shows urgency
  const qualityValue = clamp10(Math.round(qualityScore))
  const qualityHits = [budgetKnown, skillsKnown, descLen > 80, locationKnown, !!lead.project_type].filter(Boolean).length
  const qualityDetail = `${qualityHits} of 5 listing quality signals present`

  const subScores: SubScore[] = [
    { label: 'Skill match',  value: skillValue,    weight: 0.30, detail: skillDetail,    icon: 'puzzle' },
    { label: 'Semantic',     value: semanticValue, weight: 0.20, detail: semanticDetail,  icon: 'brain' },
    { label: 'Rate match',   value: rateValue,     weight: 0.25, detail: rateDetail,     icon: 'currency-pound' },
    { label: 'Recency',      value: recencyValue,  weight: 0.15, detail: recencyDetail,  icon: 'clock' },
    { label: 'Detail',       value: qualityValue,  weight: 0.10, detail: qualityDetail,  icon: 'list-check' },
  ]

  const score = clamp10(Math.round(subScores.reduce((acc, s) => acc + s.value * s.weight, 0) * 10) / 10)

  const breakdown = [
    { label: 'Budget specified',    achieved: budgetKnown,    detail: budgetKnown ? `£${lead.budget_min || 0}${lead.budget_max ? `–£${lead.budget_max}` : '+'}` : 'No budget listed' },
    { label: 'Skills required',     achieved: skillsKnown,    detail: skillsKnown ? `${reqCount} skills listed` : 'No skills listed' },
    { label: 'Client location',     achieved: locationKnown,  detail: locationKnown ? lead.client_location! : 'Remote / unknown' },
    { label: 'Detailed description',achieved: descLen > 80,   detail: descLen > 80 ? `${descLen} chars` : 'Brief description' },
    { label: 'Project type clear',  achieved: !!lead.project_type, detail: lead.project_type || 'Not specified' },
  ]

  let summary = ''
  if (matchedSkills.length > 0 && missingSkills.length === 0 && budgetKnown) {
    summary = `Strong match — you have all ${matchedSkills.length} required skill${matchedSkills.length > 1 ? 's' : ''} and the budget aligns.`
  } else if (matchedSkills.length > 0) {
    summary = `You match ${matchedSkills.length}/${reqCount} skill${reqCount > 1 ? 's' : ''}.`
    if (missingSkills.length > 0) summary += ` Missing: ${missingSkills.slice(0, 3).join(', ')}${missingSkills.length > 3 ? '…' : ''}.`
  } else if (profile?.skills && profile.skills.length > 0) {
    summary = 'No direct skill overlap with this listing.'
  } else {
    summary = 'Add your skills to your profile for a personalised match score.'
  }

  const byStrength = [...subScores].sort((a, b) => b.value - a.value)
  const strongest = byStrength[0]
  const weakest   = byStrength[byStrength.length - 1]
  const why = strongest.value - weakest.value >= 3
    ? `Strong ${strongest.label.toLowerCase()} (${strongest.value}/10), weaker on ${weakest.label.toLowerCase()} (${weakest.value}/10).`
    : `Balanced fit — ${score}/10 composite across skill, rate and recency.`

  // FIX #3: expose strongest sub-score with its label so UI never shows a bare number
  const topSubScore = { label: strongest.label, value: strongest.value }

  return { score, breakdown, subScores, summary, why, topSubScore, skillMatch: { matched: matchedSkills, missing: missingSkills } }
}
