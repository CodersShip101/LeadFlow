'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  /** Epoch ms when the user's next scan delivers. Null until the feed loads. */
  nextScanAt: number | null
  /** Leads ingested but held back until the next scan. */
  waitingCount?: number
  /** Called when the countdown reaches zero so the feed can deliver the batch. */
  onScanReady?: () => void
  /** Free-plan weekly cap (null for paid). */
  weeklyLeadCap?: number | null
  /** Leads left this week (null for paid). */
  weeklyRemaining?: number | null
  /** True when the weekly cap is exhausted (free only). Hides the daily
   * countdown, since no drop will deliver until the weekly reset. */
  capReached?: boolean | null
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${s}s`
}

export default function RefreshBar({ nextScanAt, waitingCount = 0, weeklyLeadCap = null, weeklyRemaining = null, capReached = null, onScanReady }: Props) {
  const [now, setNow] = useState(Date.now())
  const mounted = useRef(true)
  // Guards against firing onScanReady repeatedly for the same scan window.
  const firedFor = useRef<number | null>(null)

  useEffect(() => {
    mounted.current = true
    const tick = setInterval(() => { if (mounted.current) setNow(Date.now()) }, 1000)
    return () => { mounted.current = false; clearInterval(tick) }
  }, [])

  const remaining = nextScanAt ? Math.max(0, nextScanAt - now) : null

  // When the timer hits zero (and leads are waiting), ask the page to deliver.
  useEffect(() => {
    if (nextScanAt == null) return
    if (remaining === 0 && firedFor.current !== nextScanAt) {
      firedFor.current = nextScanAt
      onScanReady?.()
    }
    if (remaining !== 0 && firedFor.current === nextScanAt) {
      // A new window opened (nextScanAt advanced); allow firing again later.
      firedFor.current = null
    }
  }, [remaining, nextScanAt, onScanReady])

  const ready = remaining === 0

  return (
    <span className="rb-inline">
      {/* No "N new" badge here — the greeting subtitle already says it; one
          number, one place. */}
      {/* Daily countdown — hidden once the weekly cap is hit, since no drop will
          deliver until the weekly reset (the cap panel carries that message). */}
      {!capReached && (
        <span className={`rb-status ${nextScanAt == null ? 'pending' : ready ? 'pending' : 'live'}`}>
          <span className="rb-dot" />
          {nextScanAt == null
            ? 'Loading feed'
            : ready
              ? (waitingCount > 0 ? <>Delivering <strong>{waitingCount}</strong>…</> : <>Scanning…</>)
              : <>Next scan <strong>{formatCountdown(remaining!)}</strong></>
          }
        </span>
      )}
      {weeklyLeadCap != null && weeklyRemaining != null && (
        <span className="rb-week tip" data-tip={`${weeklyLeadCap - weeklyRemaining} of ${weeklyLeadCap} leads used this week`}>
          <span className="rb-week-bar">
            <span className="rb-week-fill" style={{ width: `${Math.max(0, Math.min(100, ((weeklyLeadCap - weeklyRemaining) / weeklyLeadCap) * 100))}%` }} />
          </span>
          <span className="rb-week-num">{weeklyRemaining}/{weeklyLeadCap} left</span>
        </span>
      )}
    </span>
  )
}
