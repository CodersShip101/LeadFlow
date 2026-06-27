import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { entitlementsFor } from '@/lib/tiers'

const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000

export async function POST() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, last_manual_refresh_at')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 404 })

    const plan = (profile.subscription_status ?? 'free') as any
    const entitlements = entitlementsFor(plan)

    if (!entitlements.manualRefresh) {
      return NextResponse.json({
        error: 'Manual refresh is not available on your plan',
        upgrade: true,
      }, { status: 403 })
    }

    const now = Date.now()
    const lastRefresh = profile.last_manual_refresh_at
      ? new Date(profile.last_manual_refresh_at).getTime()
      : 0

    const cooldownRemaining = MIN_REFRESH_INTERVAL_MS - (now - lastRefresh)
    if (cooldownRemaining > 0) {
      const seconds = Math.ceil(cooldownRemaining / 1000)
      return NextResponse.json({
        error: `Please wait ${seconds}s before refreshing again`,
        cooldownRemaining: cooldownRemaining,
      }, { status: 429 })
    }

    const admin = createAdminSupabase()
    const nowISO = new Date().toISOString()
    // Manual refresh delivers immediately: advance the scan high-water mark so
    // the gated feed releases everything ingested up to now.
    const { error: updateError } = await admin
      .from('profiles')
      .update({ last_manual_refresh_at: nowISO, last_scan_at: nowISO })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      lastRefreshAt: new Date().toISOString(),
      plan,
      scanIntervalHours: entitlements.scanIntervalHours,
      cooldownMs: MIN_REFRESH_INTERVAL_MS,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
