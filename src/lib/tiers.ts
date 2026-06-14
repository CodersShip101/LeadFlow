// lib/tiers.ts
// ---------------------------------------------------------------------------
// Single source of truth for the four-tier system. The pricing UI, the feature
// gates in the API routes, and the upgrade prompts all read from here, so a
// tier's definition lives in exactly one place.
//
// Ladder (Good / Better / Best):
//   free     £0             exploring        — freemium hook
//   starter  £15/mo         working solo     — "I outgrew free"
//   pro      £49/mo         optimising solo  — power features
//   team     £39/seat/mo    agencies/studios — multi-seat, shared pipeline
//                            (+ enterprise = custom)
// ---------------------------------------------------------------------------

export type Tier = 'free' | 'starter' | 'pro' | 'team' | 'enterprise'

export type Entitlements = {
  applicationsPerMonth: number | 'unlimited'
  seats: number | 'custom'
  scanIntervalHours: number
  sourceLinks: boolean
  emailDigest: boolean
  basicAnalytics: boolean
  advancedAnalytics: boolean
  csvExport: boolean
  adjustableScoring: boolean
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
    scanIntervalHours: 6,
    sourceLinks: false,
    emailDigest: false,
    basicAnalytics: false,
    advancedAnalytics: false,
    csvExport: false,
    adjustableScoring: false,
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
  starter: {
    applicationsPerMonth: 'unlimited',
    seats: 1,
    scanIntervalHours: 6,
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: false,
    csvExport: false,
    adjustableScoring: false,
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
  pro: {
    applicationsPerMonth: 'unlimited',
    seats: 1,
    scanIntervalHours: 3,
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    csvExport: true,
    adjustableScoring: true,
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
    scanIntervalHours: 3,
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    csvExport: true,
    adjustableScoring: true,
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
    sourceLinks: true,
    emailDigest: true,
    basicAnalytics: true,
    advancedAnalytics: true,
    csvExport: true,
    adjustableScoring: true,
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
  free: { label: 'Free', monthly: 0, annual: 0, blurb: 'Try the scored feed and build a pipeline.' },
  starter: { label: 'Starter', monthly: 15, annual: 12, blurb: 'For freelancers actively winning work.' },
  pro: { label: 'Pro', monthly: 49, annual: 39, blurb: 'For optimising every lead and rate.' },
  team: { label: 'Team', monthly: 39, annual: 32, perSeat: true, blurb: 'For agencies and studios sharing a pipeline.' },
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
