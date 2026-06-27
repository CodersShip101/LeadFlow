import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { entitlementsFor, type Tier } from '@/lib/tiers'

// Per-user lead delivery gate.
//
// Leads are scraped once into a shared pool (the cron). Each user only receives
// leads ingested (`created_at`) up to their personal high-water mark
// (`last_scan_at`). When the scan timer has elapsed — now >= last_scan_at + tier
// interval — we advance the mark to now and release everything that accumulated
// in between ("the leads they don't have"). Enforced server-side with the admin
// client so the gate can't be bypassed from the browser.
export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminSupabase()
    const { data: profile } = await admin
      .from('profiles')
      .select('subscription_status, last_scan_at')
      .eq('id', user.id)
      .single()

    const plan = (profile?.subscription_status ?? 'free') as Tier
    const intervalMs = entitlementsFor(plan).scanIntervalHours * 3600000

    const now = Date.now()
    const prevScan = profile?.last_scan_at ? new Date(profile.last_scan_at).getTime() : now
    let cutoff = prevScan
    let delivered = false

    // Timer hit zero → deliver: advance the high-water mark to now.
    if (now >= prevScan + intervalMs) {
      cutoff = now
      delivered = true
      await admin
        .from('profiles')
        .update({ last_scan_at: new Date(now).toISOString() })
        .eq('id', user.id)
    }

    const cutoffISO = new Date(cutoff).toISOString()

    const { data: leads } = await admin
      .from('leads')
      .select('*')
      .eq('status', 'active')
      .lte('created_at', cutoffISO)
      .order('posted_date', { ascending: false })

    // How many are still held back, waiting for the next scan.
    const { count: waitingCount } = await admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('created_at', cutoffISO)

    // What this delivery just released (created after the previous mark).
    let deliveredCount = 0
    if (delivered) {
      const { count } = await admin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('created_at', new Date(prevScan).toISOString())
        .lte('created_at', cutoffISO)
      deliveredCount = count ?? 0
    }

    return NextResponse.json({
      leads: leads ?? [],
      plan,
      scanIntervalHours: entitlementsFor(plan).scanIntervalHours,
      lastScanAt: cutoff,
      nextScanAt: cutoff + intervalMs,
      delivered,
      deliveredCount,
      waitingCount: waitingCount ?? 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
