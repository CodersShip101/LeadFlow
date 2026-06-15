'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { entitlementsFor, type Tier } from '@/lib/tiers'
import toast from 'react-hot-toast'

type Props = {
  plan: Tier
  lastScanAt: number | null
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

export default function RefreshBar({ plan, lastScanAt }: Props) {
  const [cooldown, setCooldown] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now())
  const mounted = useRef(true)

  const e = entitlementsFor(plan)
  const intervalMs = e.scanIntervalHours * 3600000
  const canManual = e.manualRefresh

  useEffect(() => {
    mounted.current = true
    const tick = setInterval(() => {
      if (mounted.current) setNow(Date.now())
    }, 1000)
    return () => { mounted.current = false; clearInterval(tick) }
  }, [])

  const cooldownTimer = cooldown > 0

  useEffect(() => {
    if (cooldown <= 0) return
    const tick = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [cooldown])

  const timeSinceScan = lastScanAt ? now - lastScanAt : 0
  const nextRefreshIn = lastScanAt ? Math.max(0, intervalMs - timeSinceScan) : 0
  const isDue = lastScanAt && timeSinceScan >= intervalMs
  const progress = lastScanAt
    ? Math.min(100, (timeSinceScan / intervalMs) * 100)
    : 0

  const handleRefresh = useCallback(async () => {
    if (refreshing || cooldown > 0) return
    setRefreshing(true)
    try {
      const res = await fetch('/api/leads/refresh', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Feed refreshed')
        setCooldown(data.cooldownMs ?? 300000)
        window.location.reload()
      } else if (res.status === 429) {
        setCooldown(data.cooldownRemaining ?? 300000)
        toast.error(data.error || 'Too soon — wait before refreshing again')
      } else if (res.status === 403 && data.upgrade) {
        toast.error('Upgrade to Pro or Team for manual refresh')
      } else {
        toast.error(data.error || 'Refresh failed')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setRefreshing(false)
    }
  }, [refreshing, cooldown])

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
          </span>
        )}
      </div>

      <div className="rb-center">
        <div className="rb-track">
          <div className="rb-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="rb-right">
        {canManual && (
          <button
            className="rb-btn"
            disabled={refreshing || cooldownTimer}
            onClick={handleRefresh}
          >
            <i className={`ti ${refreshing ? 'ti-loader' : 'ti-refresh'}`} />
            {refreshing ? 'Refreshing...'
              : cooldownTimer ? `Refresh in ${formatCountdown(cooldown)}`
              : 'Refresh now'
            }
          </button>
        )}
      </div>
    </div>
  )
}
