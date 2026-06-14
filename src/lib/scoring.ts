// lib/scoring.ts
// ---------------------------------------------------------------------------
// The weighted 40/30/20/10 scoring model that ranks every lead against a
// freelancer's profile. Pure functions, no I/O — easy to unit test and reuse
// on the server (API routes) or in a scraper post-processing step.
// ---------------------------------------------------------------------------

export interface ScoringLead {
  id: string;
  skills_required: string[];
  budget_min: number | null;
  budget_max: number | null;
  posted_date: string;
  detail_score: number;
}

export interface ScoringProfile {
  skills: string[];
  hourly_rate: number | null;
}

export interface SubScores {
  skill: number;
  rate: number;
  recency: number;
  detail: number;
}

export interface ScoredLead {
  score: number;
  sub: SubScores;
  why: string;
  skillDetail: { have: string[]; miss: string[] };
}

export const WEIGHTS = { skill: 0.4, rate: 0.3, recency: 0.2, detail: 0.1 } as const;

const norm = (s: string) => s.trim().toLowerCase();

function skillMatch(lead: ScoringLead, profile: ScoringProfile) {
  const have: string[] = [];
  const miss: string[] = [];
  const mine = new Set(profile.skills.map(norm));
  for (const req of lead.skills_required) {
    (mine.has(norm(req)) ? have : miss).push(req);
  }
  const total = lead.skills_required.length || 1;
  const score = Math.round((have.length / total) * 10);
  return { score, have, miss };
}

function rateMatch(lead: ScoringLead, profile: ScoringProfile): number {
  if (!profile.hourly_rate) return 5;
  const dayRate = profile.hourly_rate * 8;
  const budget = lead.budget_max ?? lead.budget_min;
  if (!budget) return 5;
  const ratio = budget / dayRate;
  if (ratio >= 1) return 10;
  if (ratio >= 0.9) return 8;
  if (ratio >= 0.75) return 6;
  if (ratio >= 0.6) return 4;
  return 2;
}

function recency(lead: ScoringLead): number {
  const hours = (Date.now() - new Date(lead.posted_date).getTime()) / 3.6e6;
  if (hours <= 3) return 10;
  if (hours <= 12) return 9;
  if (hours <= 24) return 8;
  if (hours <= 48) return 6;
  if (hours <= 96) return 4;
  return 2;
}

function detailScore(lead: ScoringLead): number {
  return Math.max(0, Math.min(10, lead.detail_score));
}

export function scoreLead(lead: ScoringLead, profile: ScoringProfile): ScoredLead {
  const skill = skillMatch(lead, profile);
  const sub: SubScores = {
    skill: skill.score,
    rate: rateMatch(lead, profile),
    recency: recency(lead),
    detail: detailScore(lead),
  };
  const score =
    Math.round(
      (sub.skill * WEIGHTS.skill +
        sub.rate * WEIGHTS.rate +
        sub.recency * WEIGHTS.recency +
        sub.detail * WEIGHTS.detail) *
        10,
    ) / 10;

  return {
    score,
    sub,
    why: explain(sub, skill),
    skillDetail: { have: skill.have, miss: skill.miss },
  };
}

function explain(sub: SubScores, skill: { have: string[]; miss: string[] }): string {
  const entries = Object.entries(sub).sort((a, b) => b[1] - a[1]);
  const [topK, topV] = entries[0];
  const [loK, loV] = entries[entries.length - 1];
  const label: Record<string, string> = {
    skill: 'skill match',
    rate: 'rate match',
    recency: 'freshness',
    detail: 'detail',
  };
  if (loV <= 4) {
    return `Strong ${label[topK]} (${topV}/10) but weaker ${label[loK]} (${loV}/10).`;
  }
  if (skill.miss.length === 0) {
    return `Every required skill matches your profile — a clean ${topV}/10 on ${label[topK]}.`;
  }
  return `Solid all-round fit, led by ${label[topK]} at ${topV}/10.`;
}

export function rankLeads(leads: ScoringLead[], profile: ScoringProfile) {
  return leads
    .map((l) => ({ lead: l, ...scoreLead(l, profile) }))
    .sort((a, b) => b.score - a.score);
}
