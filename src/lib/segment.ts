// lib/segment.ts
// ---------------------------------------------------------------------------
// "Personalize the experience based on user behaviour" (Top 5 Advanced #1).
// Classify each user as new / returning / power from cheap activity counters
// kept on the profile row, so the feed can tailor its greeting, emphasis and
// nudges without an extra query.
// ---------------------------------------------------------------------------

export type Segment = 'new' | 'returning' | 'power';

export type Activity = {
  applications_total: number;
  days_active: number;
};

export function segmentOf(a: Activity): Segment {
  if (a.applications_total >= 10 || a.days_active >= 14) return 'power';
  if (a.applications_total >= 1 || a.days_active >= 2) return 'returning';
  return 'new';
}

export const SEGMENT_CONFIG: Record<
  Segment,
  { greeting: (name: string) => string; emphasis: string; banner?: string }
> = {
  new: {
    greeting: (n) => `Welcome, ${n} \u{1F44B}`,
    emphasis: 'first_picks',
    banner: "You're set up. We've scored every open lead against your skills and rate — your strongest matches are crowned at the top.",
  },
  returning: {
    greeting: (n) => `Good to see you, ${n} \u{1F44B}`,
    emphasis: 'new_since_last_visit',
  },
  power: {
    greeting: (n) => `Welcome back, ${n} \u{1F44B}`,
    emphasis: 'fastest_to_apply',
    banner: 'Power users who apply within 2 hours hear back 3x more often — your freshest matches are up top.',
  },
};
