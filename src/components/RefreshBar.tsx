'use client'

import { useState, useEffect, useRef } from 'react'
import { entitlementsFor, type Tier } from '@/lib/tiers'

type Props = {
  plan: Tier
  lastScanAt: number | null
  lastRefreshedAt: number
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'now'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatAgo(ms: number): string {
  if (ms < 60000) return 'just now'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}h ${m}m ago`
  return `${m}m ago`
}

export default function RefreshBar({ plan, lastScanAt, lastRefreshedAt }: Props) {
  const [now, setNow] = useState(Date.now())
  const mounted = useRef(true)

  const e = entitlementsFor(plan)
  const intervalMs = e.scanIntervalHours * 3600000

  useEffect(() => {
    mounted.current = true
    const tick = setInterval(() => {
      if (mounted.current) setNow(Date.now())
    }, 1000)
    return () => { mounted.current = false; clearInterval(tick) }
  }, [])

  const timeSinceScan = lastScanAt ? now - lastScanAt : 0
  const nextRefreshIn = lastScanAt ? Math.max(0, intervalMs - timeSinceScan) : 0
  const isDue = lastScanAt && timeSinceScan >= intervalMs
  const progress = lastScanAt
    ? Math.min(100, (timeSinceScan / intervalMs) * 100)
    : 0

  return (
    <div className="refresh-bar">
      <div className="rb-left">
        <i className={`ti ${isDue ? 'ti-refresh-alert' : 'ti-refresh'}`} />
        <span className="rb-label">
          Auto-refresh: every <strong>{e.scanIntervalHours}h</strong>
        </span>
        {lastScanAt && (
          <span className="rb-countdown">
            {isDue
              ? <span className="rb-due">Due now</span>
              : <>Next scan in {formatCountdown(nextRefreshIn)}</>
            }
            <span className="rb-last">· Last refreshed {formatAgo(now - lastRefreshedAt)}</span>
          </span>
        )}
      </div>

      <div className="rb-center">
        <div className="rb-track">
          <div className="rb-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}
