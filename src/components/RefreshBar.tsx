'use client'

import { useState, useEffect, useRef } from 'react'
import { entitlementsFor, type Tier } from '@/lib/tiers'

type Props = {
  plan: Tier
  lastScrapeAt: number | null
  lastRefreshedAt: number
  newCount?: number
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

export default function RefreshBar({ plan, lastScrapeAt, lastRefreshedAt, newCount = 0 }: Props) {
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

  const timeSinceScrape = lastScrapeAt ? now - lastScrapeAt : 0
  const nextScrapeIn = lastScrapeAt ? Math.max(0, intervalMs - timeSinceScrape) : null
  const progress = lastScrapeAt
    ? Math.min(100, (timeSinceScrape / intervalMs) * 100)
    : 0

  return (
    <div className="refresh-bar">
      <div className="rb-left">
        <i className="ti ti-refresh" />
        <span className="rb-label">
          Auto-refresh: every <strong>{e.scanIntervalHours}h</strong>
        </span>
        <span className="rb-countdown">
          {lastScrapeAt
            ? <>Next scan in {formatCountdown(nextScrapeIn!)}</>
            : <span className="rb-due">Awaiting first scan</span>
          }
          <span className="rb-last">· Last checked {formatAgo(now - lastRefreshedAt)}</span>
        </span>
      </div>

      <div className="rb-center">
        <div className="rb-track">
          <div className="rb-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {newCount > 0 && (
        <div className="rb-right">
          <span className="rb-badge">
            <i className="ti ti-sparkles" />
            {newCount} new
          </span>
        </div>
      )}
    </div>
  )
}
