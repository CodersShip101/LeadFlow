'use client'

import { useState, useEffect, useRef } from 'react'

type Props = {
  /** Epoch ms when the user's next scan delivers. Null until the feed loads. */
  nextScanAt: number | null
  /** Leads ingested but held back until the next scan. */
  waitingCount?: number
  /** Leads just delivered (for the "X new" badge). */
  newCount?: number
  /** Called when the countdown reaches zero so the feed can deliver the batch. */
  onScanReady?: () => void
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

export default function RefreshBar({ nextScanAt, waitingCount = 0, newCount = 0, onScanReady }: Props) {
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
      {newCount > 0 && (
        <span className="rb-badge-sm">
          <i className="ti ti-sparkles" />{newCount} new
        </span>
      )}
      <span className={`rb-status ${nextScanAt == null ? 'pending' : ready ? 'pending' : 'live'}`}>
        <span className="rb-dot" />
        {nextScanAt == null
          ? 'Loading feed'
          : ready
            ? (waitingCount > 0 ? <>Delivering <strong>{waitingCount}</strong>…</> : <>Scanning…</>)
            : <>Next scan <strong>{formatCountdown(remaining!)}</strong></>
        }
      </span>
    </span>
  )
}
