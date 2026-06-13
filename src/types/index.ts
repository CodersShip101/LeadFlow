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
  subscription_status: 'free' | 'pro';
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

export function computeMatchExplanation(lead: Lead, profile?: Profile | null): MatchExplanation {
  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  if (profile?.skills && lead.skills_required) {
    const ps = profile.skills.map(s => s.toLowerCase())
    for (const s of lead.skills_required) {
      if (ps.includes(s.toLowerCase())) matchedSkills.push(s)
      else missingSkills.push(s)
    }
  }

  const reqCount = lead.skills_required?.length || 0
  const budgetKnown = !!(lead.budget_min || lead.budget_max)
  const skillsKnown = reqCount > 0
  const locationKnown = !!lead.client_location
  const detailedDesc = !!(lead.description && lead.description.length > 100)

  // ── Skill match ──────────────────────────────────────────────
  let skillValue: number
  let skillDetail: string
  if (!profile?.skills || profile.skills.length === 0) {
    skillValue = 5
    skillDetail = 'Add skills to your profile for a personalised score'
  } else if (!skillsKnown) {
    skillValue = 6
    skillDetail = 'No skills listed on this lead'
  } else {
    const ratio = matchedSkills.length / reqCount
    skillValue = clamp10(3 + ratio * 7)
    skillDetail = `${matchedSkills.length} of ${reqCount} required skills match your profile`
  }

  // ── Rate match ───────────────────────────────────────────────
  let rateValue: number
  let rateDetail: string
  const leadRate = lead.budget_max || lead.budget_min || 0
  const myRate = profile?.hourly_rate || 0
  if (!budgetKnown) {
    rateValue = 5
    rateDetail = 'No rate listed — worth a look'
  } else if (!myRate) {
    rateValue = 7
    rateDetail = `Budget ${lead.budget_min ? `£${lead.budget_min}` : ''}${lead.budget_max ? `–£${lead.budget_max}` : '+'} listed`
  } else {
    const pct = leadRate / myRate
    rateValue = clamp10(pct >= 1 ? 10 : 3 + pct * 6)
    rateDetail = pct >= 1
      ? `At or above your minimum (£${myRate})`
      : `${Math.round((1 - pct) * 100)}% below your minimum (£${myRate})`
  }

  // ── Recency ──────────────────────────────────────────────────
  const ageHours = (Date.now() - new Date(lead.posted_date).getTime()) / 3600000
  const recencyValue = clamp10(ageHours < 2 ? 10 : ageHours < 12 ? 9 : ageHours < 24 ? 8 : ageHours < 72 ? 6 : ageHours < 168 ? 4 : 2)
  const recencyDetail = ageHours < 1 ? 'Posted within the hour' : ageHours < 24 ? `Posted ${Math.round(ageHours)}h ago` : `Posted ${Math.round(ageHours / 24)}d ago`

  // ── Detail / quality ─────────────────────────────────────────
  let qualityHits = 0
  if (detailedDesc) qualityHits++
  if (locationKnown) qualityHits++
  if (skillsKnown) qualityHits++
  if (budgetKnown) qualityHits++
  const qualityValue = clamp10(3 + qualityHits * 1.75)
  const qualityDetail = `${qualityHits} of 4 listing details provided`

  const subScores: SubScore[] = [
    { label: 'Skill match', value: skillValue, weight: 0.4, detail: skillDetail, icon: 'puzzle' },
    { label: 'Rate match', value: rateValue, weight: 0.3, detail: rateDetail, icon: 'currency-pound' },
    { label: 'Recency', value: recencyValue, weight: 0.2, detail: recencyDetail, icon: 'clock' },
    { label: 'Detail', value: qualityValue, weight: 0.1, detail: qualityDetail, icon: 'list-check' },
  ]

  const score = clamp10(subScores.reduce((acc, s) => acc + s.value * s.weight, 0))

  // Legacy binary breakdown (used by the lead detail page)
  const breakdown = [
    { label: 'Base score', achieved: true, detail: 'Every lead starts here' },
    { label: 'Budget specified', achieved: budgetKnown, detail: budgetKnown ? `£${lead.budget_min || 0}${lead.budget_max ? ` - £${lead.budget_max}` : '+'}` : 'No budget listed' },
    { label: 'Skills required', achieved: skillsKnown, detail: skillsKnown ? `${reqCount} skills listed` : 'No skills listed' },
    { label: 'Client location', achieved: locationKnown, detail: locationKnown ? lead.client_location! : 'Remote / unknown' },
    { label: 'Detailed description', achieved: detailedDesc, detail: detailedDesc ? `${lead.description!.length} chars` : 'Brief description' },
  ]

  let summary = ''
  if (matchedSkills.length > 0 && missingSkills.length === 0 && (lead.budget_min || 0) > 0) {
    summary = `Strong match — you have all ${matchedSkills.length} required skill${matchedSkills.length > 1 ? 's' : ''} and the budget aligns with your rates.`
  } else if (matchedSkills.length > 0) {
    summary = `You match ${matchedSkills.length}/${reqCount} skill${reqCount > 1 ? 's' : ''}.`
    if (missingSkills.length > 0) summary += ` Missing: ${missingSkills.join(', ')}.`
  } else if (profile?.skills && profile.skills.length > 0) {
    summary = 'No skill overlap with your profile, but the budget and details look solid.'
  } else {
    summary = 'Add your skills to your profile for a personalized match score.'
  }

  // Single-line "why this score" — lead with the weakest meaningful driver
  const sorted = [...subScores].sort((a, b) => a.value - b.value)
  const weakest = sorted[0]
  const strongest = [...subScores].sort((a, b) => b.value - a.value)[0]
  const why = strongest.value - weakest.value >= 2
    ? `${strongest.label} is strong (${strongest.value}/10) but ${weakest.label.toLowerCase()} is lower (${weakest.value}/10).`
    : `Balanced across skill, rate and recency — composite ${score}/10.`

  return { score, breakdown, subScores, summary, why, skillMatch: { matched: matchedSkills, missing: missingSkills } }
}
