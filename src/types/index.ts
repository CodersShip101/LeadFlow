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
  client_location: string | null;
  source_url: string | null;
  posted_date: string;
  expiry_date: string | null;
  status: 'active' | 'filled' | 'expired';
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
  skillMatch: { matched: string[]; missing: string[] }
}

function clamp10(n: number) {
  return Math.max(1, Math.min(10, Math.round(n)))
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

  // ── Skill match (weight 0.45) ─────────────────────────────────
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
    // Smooth curve: 0%→3, 50%→6.5, 80%→8.6, 100%→10
    skillValue = clamp10(Math.round(3 + ratio * 7))
    skillDetail = matchedSkills.length === reqCount
      ? `All ${reqCount} required skills match your profile`
      : `${matchedSkills.length} of ${reqCount} required skills match your profile`
  }

  // ── Rate match (weight 0.30) ──────────────────────────────────
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
  const ageHours = (Date.now() - new Date(lead.posted_date).getTime()) / 3600000
  const recencyValue = clamp10(
    ageHours < 6   ? 10 :
    ageHours < 24  ? 9  :
    ageHours < 48  ? 8  :
    ageHours < 96  ? 7  :
    ageHours < 168 ? 5  :
    ageHours < 336 ? 3  : 2
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
    { label: 'Skill match', value: skillValue,   weight: 0.45, detail: skillDetail,   icon: 'puzzle' },
    { label: 'Rate match',  value: rateValue,    weight: 0.30, detail: rateDetail,    icon: 'currency-pound' },
    { label: 'Recency',     value: recencyValue, weight: 0.15, detail: recencyDetail, icon: 'clock' },
    { label: 'Detail',      value: qualityValue, weight: 0.10, detail: qualityDetail, icon: 'list-check' },
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
    summary = 'No direct skill overlap — but the budget and listing quality look solid.'
  } else {
    summary = 'Add your skills to your profile for a personalised match score.'
  }

  const byStrength = [...subScores].sort((a, b) => b.value - a.value)
  const strongest = byStrength[0]
  const weakest   = byStrength[byStrength.length - 1]
  const why = strongest.value - weakest.value >= 3
    ? `Strong ${strongest.label.toLowerCase()} (${strongest.value}/10), weaker on ${weakest.label.toLowerCase()} (${weakest.value}/10).`
    : `Balanced fit — ${score}/10 composite across skill, rate and recency.`

  return { score, breakdown, subScores, summary, why, skillMatch: { matched: matchedSkills, missing: missingSkills } }
}
