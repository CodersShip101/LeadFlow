import { NextResponse } from 'next/server'
import { createServerSupabase, createAdminSupabase } from '@/lib/supabase-server'
import { entitlementsFor, type Tier } from '@/lib/tiers'
import {
  currentSlotMark, nextSlotAt, currentIntervalMark, nextIntervalAt,
  weekAnchor, isWeekStale,
} from '@/lib/lead-schedule'

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
      .select('subscription_status, last_scan_at, leads_week_count, leads_week_anchor')
      .eq('id', user.id)
      .single()

    const plan = (profile?.subscription_status ?? 'free') as Tier
    const ent = entitlementsFor(plan)
    const now = Date.now()

    // Delivery mark + next-drop time depend on the tier's delivery mode.
    // `prevISO` is the raw stored mark at full DB precision (used as the window
    // lower bound so a boundary lead is never dropped or re-released); `prevScan`
    // (ms) is only for the boundary comparison, which is hour-aligned.
    const prevISO = profile?.last_scan_at ?? new Date(now).toISOString()
    const prevScan = profile?.last_scan_at ? new Date(profile.last_scan_at).getTime() : now
    const slotMark = ent.deliveryMode === 'slots'
      ? currentSlotMark(now, ent.dropSlotsUTC)
      : currentIntervalMark(now, ent.scanIntervalHours * 3600000)
    const nextScanAt = ent.deliveryMode === 'slots'
      ? nextSlotAt(now, ent.dropSlotsUTC)
      : nextIntervalAt(now, ent.scanIntervalHours * 3600000)

    const boundaryCrossed = slotMark > prevScan

    // Weekly cap state (free only).
    const cap = ent.weeklyLeadCap
    let weekCount = profile?.leads_week_count ?? 0
    let weekAnchorMs = profile?.leads_week_anchor ? new Date(profile.leads_week_anchor).getTime() : null
    if (cap != null && isWeekStale(weekAnchorMs, now)) {
      weekAnchorMs = weekAnchor(now)
      weekCount = 0
    }

    // The delivery mark as an exact timestamp string (canonical, used for all DB
    // comparisons and persisted verbatim) plus a ms value for the response.
    // Default = the existing mark, i.e. no delivery this call.
    let cutoffISO = prevISO
    let cutoff = prevScan
    let delivered = false
    let deliveredCount = 0

    if (boundaryCrossed && cap == null) {
      // Paid tiers: unchanged behaviour — deliver everything up to the real poll time.
      cutoffISO = new Date(now).toISOString()
      cutoff = now
      const { count } = await admin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .gt('created_at', prevISO)
        .lte('created_at', cutoffISO)
      deliveredCount = count ?? 0
      delivered = deliveredCount > 0
      await admin
        .from('profiles')
        .update({ last_scan_at: cutoffISO })
        .eq('id', user.id)
    } else if (boundaryCrossed) {
      // Free tier: windowed drop, capped at the remaining weekly quota.
      const allowed = Math.max(0, (cap as number) - weekCount)
      const slotISO = new Date(slotMark).toISOString()
      if (allowed > 0) {
        const { count: candidateCount } = await admin
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .gt('created_at', prevISO)
          .lte('created_at', slotISO)
        const cc = candidateCount ?? 0
        if (cc <= allowed) {
          cutoffISO = slotISO
          cutoff = slotMark
          deliveredCount = cc
        } else {
          // Release the OLDEST `allowed` candidates (FIFO) — the only selection
          // consistent with a scalar high-water mark, where the feed shows every
          // lead with created_at <= mark. The `allowed`-th oldest candidate's
          // exact created_at becomes the new mark; newer candidates wait. The raw
          // timestamp string is threaded end-to-end so sub-millisecond precision
          // is never lost (which would drop the boundary lead or re-release it).
          const { data: nth } = await admin
            .from('leads')
            .select('created_at')
            .eq('status', 'active')
            .gt('created_at', prevISO)
            .lte('created_at', slotISO)
            .order('created_at', { ascending: true })
            .range(allowed - 1, allowed - 1)
            .single()
          cutoffISO = nth?.created_at ?? prevISO
          cutoff = new Date(cutoffISO).getTime()
          // Ties on the exact cutoff timestamp can pull in a few extra; count what
          // actually falls in the window so weekCount matches what the feed shows
          // (bounded over-delivery, never the whole backlog).
          const { count: releasedInWindow } = await admin
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active')
            .gt('created_at', prevISO)
            .lte('created_at', cutoffISO)
          deliveredCount = releasedInWindow ?? allowed
        }
        delivered = deliveredCount > 0
        weekCount += deliveredCount
        await admin
          .from('profiles')
          .update({
            last_scan_at: cutoffISO,
            leads_week_count: weekCount,
            leads_week_anchor: weekAnchorMs ? new Date(weekAnchorMs).toISOString() : null,
          })
          .eq('id', user.id)
      } else {
        // Weekly cap reached — release nothing, but persist a week roll if one
        // just happened.
        await admin
          .from('profiles')
          .update({
            leads_week_count: weekCount,
            leads_week_anchor: weekAnchorMs ? new Date(weekAnchorMs).toISOString() : null,
          })
          .eq('id', user.id)
      }
    } else if (cap != null && (weekCount !== (profile?.leads_week_count ?? 0))) {
      // No drop, but the week rolled over — persist the reset.
      await admin
        .from('profiles')
        .update({ leads_week_count: weekCount, leads_week_anchor: weekAnchorMs ? new Date(weekAnchorMs).toISOString() : null })
        .eq('id', user.id)
    }

    const { data: leads } = await admin
      .from('leads')
      .select('*')
      .eq('status', 'active')
      .lte('created_at', cutoffISO)
      .order('posted_date', { ascending: false })

    const { count: waitingCount } = await admin
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('created_at', cutoffISO)

    const weeklyRemaining = cap == null ? null : Math.max(0, cap - weekCount)
    const capReached = cap == null ? null : weeklyRemaining === 0
    const weekResetAt = cap == null || weekAnchorMs == null ? null : weekAnchorMs + 7 * 86400000

    return NextResponse.json({
      leads: leads ?? [],
      plan,
      scanIntervalHours: ent.scanIntervalHours,
      lastScanAt: cutoff,
      nextScanAt,
      delivered,
      deliveredCount,
      waitingCount: waitingCount ?? 0,
      weeklyLeadCap: cap,
      weeklyRemaining,
      weekResetAt,
      capReached,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 })
  }
}
