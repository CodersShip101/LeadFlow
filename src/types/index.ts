export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  skills: string[] | null;
  experience_level: string | null;
  hourly_rate: number | null;
  location: string | null;
  portfolio_url: string | null;
  availability: string | null;
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

export interface MatchExplanation {
  score: number
  breakdown: { label: string; achieved: boolean; detail: string }[]
  summary: string
  skillMatch: { matched: string[]; missing: string[] }
}

export function computeMatchExplanation(lead: Lead, profile?: Profile | null): MatchExplanation {
  const matchedSkills: string[] = []
  const missingSkills: string[] = []

  if (profile?.skills && lead.skills_required) {
    const ps = profile.skills.map(s => s.toLowerCase())
    for (const s of lead.skills_required) {
      if (ps.includes(s.toLowerCase())) {
        matchedSkills.push(s)
      } else {
        missingSkills.push(s)
      }
    }
  }

  const budgetKnown = !!(lead.budget_min || lead.budget_max)
  const skillsKnown = !!(lead.skills_required && lead.skills_required.length > 0)
  const locationKnown = !!lead.client_location
  const detailedDesc = !!(lead.description && lead.description.length > 100)

  let score = 5
  const breakdown: { label: string; achieved: boolean; detail: string }[] = [
    { label: 'Base score', achieved: true, detail: 'Every lead starts here' },
    { label: 'Budget specified', achieved: budgetKnown, detail: budgetKnown ? `£${lead.budget_min || 0}${lead.budget_max ? ` - £${lead.budget_max}` : '+'}` : 'No budget listed' },
    { label: 'Skills required', achieved: skillsKnown, detail: skillsKnown ? `${lead.skills_required!.length} skills listed` : 'No skills listed' },
    { label: 'Client location', achieved: locationKnown, detail: locationKnown ? lead.client_location! : 'Remote / unknown' },
    { label: 'Detailed description', achieved: detailedDesc, detail: detailedDesc ? `${lead.description!.length} chars` : 'Brief description' },
  ]

  if (budgetKnown) score += 2
  if (skillsKnown) score += 2
  if (locationKnown) score += 1
  if (detailedDesc) score += 1
  if (lead.description && lead.description.length < 50) score -= 1

  score = Math.max(1, Math.min(10, score))

  let summary = ''
  if (matchedSkills.length > 0 && missingSkills.length === 0 && (lead.budget_min || 0) > 0) {
    summary = `Strong match — you have all ${matchedSkills.length} required skill${matchedSkills.length > 1 ? 's' : ''} and the budget aligns with your rates.`
  } else if (matchedSkills.length > 0) {
    summary = `You match ${matchedSkills.length}/${(lead.skills_required?.length || 0) + matchedSkills.length} skill${(lead.skills_required?.length || 0) + matchedSkills.length > 1 ? 's' : ''}.`
    if (missingSkills.length > 0) summary += ` Missing: ${missingSkills.join(', ')}.`
  } else if (profile?.skills && profile.skills.length > 0) {
    summary = 'No skill overlap with your profile, but the budget and details look solid.'
  } else {
    summary = 'Add your skills to your profile for a personalized match score.'
  }

  return { score, breakdown, summary, skillMatch: { matched: matchedSkills, missing: missingSkills } }
}
