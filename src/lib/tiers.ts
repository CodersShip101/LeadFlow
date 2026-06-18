// lib/tiers.ts
// ---------------------------------------------------------------------------
// Single source of truth for the four-tier system. The pricing UI, the feature
// gates in the API routes, and the upgrade prompts all read from here, so a
// tier's definition lives in exactly one place.
//
// Ladder (internal key → customer-facing label):
//   free  → "Free"     £0             exploring        — freemium hook
//   pro   → "Starter"  £15/mo         working solo     — "I outgrew free"
//   max   → "Pro"      £49/mo         optimising solo  — power features (most popular)
//   team  → "Team"     £39/seat/mo    agencies/studios — multi-seat, shared pipeline
//                                       (+ enterprise = custom)
//
// NOTE: the internal keys (`pro`, `max`) are bound to Stripe price env vars,
// the `subscription_status` column, and the webhook mapping — DO NOT rename them.
// Only the `label` below is shown to users.
// ---------------------------------------------------------------------------

export type Tier = 'free' | 'pro' | 'max' | 'team' | 'enterprise'

export type Entitlements = {
  applicationsPerMonth: number | 'unlimited'
  seats: number | 'custom'
  scanIntervalHours: number
  manualRefresh: boolean
  sourceLinks: boolean
  emailDigest: boolean
  basicAnalytics: boolean
  advancedAnalytics: boolean
  csvExport: boolean
  adjustableScoring: boolean
  pitchTemplates: boolean
  calendarSync: boolean
  customAlerts: boolean
  prioritySupport: boolean
  sharedLeadPool: boolean
  teamPipeline: boolean
  leadAssignment: boolean
  roles: boolean
  centralBilling: boolean
  sso: boolean
  apiAccess: boolean
  dedicatedManager: boolean
}

export const ENTITLEMENTS: Record<Tier, Entitlements> = {
  free: {
    applicationsPerMonth: 5,
    seats: 1,
    scanIntervalHours: 5,
    manualRefresh: false,
    sourceLinks: false,
    emailDigest: false,
    basicAnalytics: false,
    advancedAnalytics: false,
    csvExport: false,
    adjustableScoring: false,
    pitchTemplates: false,
    calendarSync: false,
    customAlerts: false,
    prioritySupport: false,
    sharedLeadPool: false,
    teamPipeline: false,
    leadAssignment: false,
    roles: false,
    centralBilling: false,
    sso: false,
    apiAccess: false,
    dedicatedManager: false,
  },
  pro: {
    applicationsPerMonth: 'unlimited',
    seats: 1,
    scanIntervalHours: 2,
    manualRefresh: false,
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: false,
    csvExport: false,
    adjustableScoring: false,
    pitchTemplates: false,
    calendarSync: false,
    customAlerts: true,
    prioritySupport: false,
    sharedLeadPool: false,
    teamPipeline: false,
    leadAssignment: false,
    roles: false,
    centralBilling: false,
    sso: false,
    apiAccess: false,
    dedicatedManager: false,
  },
  max: {
    applicationsPerMonth: 'unlimited',
    seats: 1,
    scanIntervalHours: 1,
    manualRefresh: true,
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    csvExport: true,
    adjustableScoring: true,
    pitchTemplates: true,
    calendarSync: true,
    customAlerts: true,
    prioritySupport: true,
    sharedLeadPool: false,
    teamPipeline: false,
    leadAssignment: false,
    roles: false,
    centralBilling: false,
    sso: false,
    apiAccess: false,
    dedicatedManager: false,
  },
  team: {
    applicationsPerMonth: 'unlimited',
    seats: 1,
    scanIntervalHours: 1,
    manualRefresh: true,
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    csvExport: true,
    adjustableScoring: true,
    pitchTemplates: true,
    calendarSync: true,
    customAlerts: true,
    prioritySupport: true,
    sharedLeadPool: true,
    teamPipeline: true,
    leadAssignment: true,
    roles: true,
    centralBilling: true,
    sso: false,
    apiAccess: false,
    dedicatedManager: false,
  },
  enterprise: {
    applicationsPerMonth: 'unlimited',
    seats: 'custom',
    scanIntervalHours: 1,
    manualRefresh: true,
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    csvExport: true,
    adjustableScoring: true,
    pitchTemplates: true,
    calendarSync: true,
    customAlerts: true,
    prioritySupport: true,
    sharedLeadPool: true,
    teamPipeline: true,
    leadAssignment: true,
    roles: true,
    centralBilling: true,
    sso: true,
    apiAccess: true,
    dedicatedManager: true,
  },
}

export const PRICING: Record<
  Tier,
  { label: string; monthly: number | null; annual: number | null; perSeat?: boolean; blurb: string }
> = {
  free: { label: 'Free', monthly: 0, annual: 0, blurb: 'Dip your toes in. Scored feed, pipeline, 5 applications a month.' },
  pro: { label: 'Starter', monthly: 15, annual: 12, blurb: 'For freelancers actively chasing work. No cap, no middleman.' },
  max: { label: 'Pro', monthly: 49, annual: 39, blurb: 'For those who want every edge: adjust scoring, export data, get in first.' },
  team: { label: 'Team', monthly: 39, annual: 32, perSeat: true, blurb: 'Shared pipeline and lead pool for agencies and studios.' },
  enterprise: { label: 'Enterprise', monthly: null, annual: null, blurb: 'Custom scale, SSO, API and a dedicated manager.' },
}

export function entitlementsFor(plan: Tier, orgSeats?: number): Entitlements {
  const base = ENTITLEMENTS[plan]
  if ((plan === 'team' || plan === 'enterprise') && orgSeats) {
    return { ...base, seats: orgSeats }
  }
  return base
}

export function can(plan: Tier, feature: keyof Entitlements): boolean {
  return ENTITLEMENTS[plan][feature] === true
}

// ---------------------------------------------------------------------------
// Presentation — shared by the dashboard billing page and the public landing
// pricing grid so the two never drift. Mirrors the entitlements above and uses
// the customer-facing labels (hence "Everything in Starter / Pro").
// ---------------------------------------------------------------------------

export type PlanFeature = { txt: string; muted?: boolean }

export const TIER_ICONS: Record<Tier, string> = {
  free: 'ti-radar-2',
  pro: 'ti-bolt',
  max: 'ti-crown',
  team: 'ti-users',
  enterprise: 'ti-building',
}

export function planFeatures(tier: Tier): PlanFeature[] {
  const appLimit = ENTITLEMENTS.free.applicationsPerMonth
  switch (tier) {
    case 'free':
      return [
        { txt: 'Scored lead feed (all sources)' },
        { txt: `${appLimit} applications / month` },
        { txt: 'Pipeline tracking' },
        { txt: 'Source links hidden', muted: true },
        { txt: 'No analytics', muted: true },
      ]
    case 'pro':
      return [
        { txt: 'Everything in Free' },
        { txt: 'Unlimited applications' },
        { txt: 'Direct source links' },
        { txt: 'Daily email digest' },
        { txt: 'Custom lead alerts' },
        { txt: 'Basic analytics' },
      ]
    case 'max':
      return [
        { txt: `Everything in ${PRICING.pro.label}` },
        { txt: 'Adjustable scoring weights' },
        { txt: `Priority scanning every ${ENTITLEMENTS.max.scanIntervalHours}h` },
        { txt: 'Refresh your feed on demand' },
        { txt: 'Full analytics + CSV export' },
        { txt: 'Saved pitch & application templates' },
        { txt: 'Follow-up reminders & calendar sync' },
        { txt: 'Priority support' },
      ]
    case 'team':
      return [
        { txt: `Everything in ${PRICING.max.label}` },
        { txt: 'Shared team lead pool' },
        { txt: 'Team pipeline & assignment' },
        { txt: 'Shared pitch & template library' },
        { txt: 'Team analytics & win-rate leaderboard' },
        { txt: 'Admin & member roles' },
        { txt: 'Slack & email notifications' },
        { txt: 'Centralised billing' },
        { txt: 'Priority onboarding & data migration' },
      ]
    default:
      return []
  }
}
