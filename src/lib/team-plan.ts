// Shared helpers for the team-membership <-> individual-plan handoff.
//
// Joining a team overwrites a user's `subscription_status` with 'team'. To make
// that reversible, we snapshot their prior individual plan into
// `profiles.pre_team_status` on join and restore it when they leave / are
// removed / the team is cancelled. All prior-plan reads and writes are
// best-effort: the `pre_team_status` column ships in a separate migration
// (supabase/RUN_THIS_team_prior_plan.sql), so if it isn't applied yet the core
// join/leave still works and we simply fall back to 'free'.

import type { SupabaseClient } from '@supabase/supabase-js'

// Either the SSR (server) client or the service-role admin client.
type Db = SupabaseClient

type PlanRow = { subscription_status?: string | null; pre_team_status?: string | null }

// Snapshot the user's current plan before they get moved onto 'team'.
// No-op if they're already on 'team' (don't clobber a real prior plan) or if
// the column doesn't exist yet.
export async function rememberPriorPlan(db: Db, userId: string): Promise<void> {
  const { data, error } = await db.from('profiles').select('subscription_status, pre_team_status').eq('id', userId).maybeSingle()
  if (error) return // column missing or read failed — skip snapshotting
  const row = (data ?? {}) as PlanRow
  const current = row.subscription_status ?? 'free'
  if (current === 'team') return
  await db.from('profiles').update({ pre_team_status: current }).eq('id', userId)
}

// Put the user on the team plan.
export async function joinTeamPlan(db: Db, userId: string): Promise<void> {
  await db.from('profiles').update({ subscription_status: 'team' }).eq('id', userId)
}

// Leaving/removal: restore the snapshotted plan (default 'free') and clear the
// snapshot. Degrades to a plain 'free' revert if the column isn't present.
export async function restorePriorPlan(db: Db, userId: string): Promise<void> {
  const { data, error } = await db.from('profiles').select('pre_team_status').eq('id', userId).maybeSingle()
  if (error) {
    // Column missing — fall back to the safe default.
    await db.from('profiles').update({ subscription_status: 'free' }).eq('id', userId)
    return
  }
  const prior = ((data ?? {}) as PlanRow).pre_team_status
  const restored = prior && prior !== 'team' ? prior : 'free'
  await db.from('profiles').update({ subscription_status: restored, pre_team_status: null }).eq('id', userId)
}

// Team subscription ended: revert every member to their prior plan, then delete
// the org (cascade clears members + invites). Best-effort per member.
export async function disbandOrg(admin: Db, orgId: string): Promise<void> {
  const { data: members } = await admin.from('org_members').select('user_id').eq('org_id', orgId)
  for (const m of members ?? []) {
    await restorePriorPlan(admin, (m as { user_id: string }).user_id)
  }
  await admin.from('organizations').delete().eq('id', orgId)
}
