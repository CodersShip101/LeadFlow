'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'

const SRC_LABEL: Record<string, string> = {
  reddit: 'Reddit', reed: 'Reed', wwr: 'We Work Remotely', rok: 'Remote OK',
  remoteok: 'Remote OK', remotive: 'Remotive', himalayas: 'Himalayas',
  arbeitnow: 'Arbeitnow', indeed: 'Indeed', cwjobs: 'CWJobs', unknown: 'Other',
}
const srcLabel = (s: string) => SRC_LABEL[s?.toLowerCase()] ?? (s ? s[0].toUpperCase() + s.slice(1) : 'Other')

interface Analytics {
  summary: { total: number; won: number; lost: number; winRate: number | null; avgBudget: number | null }
  weeklyActivity: { week: string; count: number }[]
  sources: { source: string; count: number }[]
  advanced: null | {
    stageCounts: { interested: number; applied: number; hired: number }
    skillCoverageRate: number | null
    sourceWinRates: { source: string; winRate: number; total: number }[]
    avgDaysToApply: number | null
  }
  plan: string
}

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      try {
        const res = await fetch('/api/analytics')
        if (res.status === 403) { setLocked(true); setLoading(false); return }
        if (res.ok) setData(await res.json())
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 14 }}>Loading&hellip;</span>
    </div>
  )

  // Paywall — free plan
  if (locked) return (
    <div className="empty">
      <div className="empty-icon"><i className="ti ti-chart-bar" /></div>
      <h3>Analytics is a Starter feature</h3>
      <p>Track your win rate, application activity and best sources. Upgrade to unlock your numbers.</p>
      <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard/billing')}>
        <i className="ti ti-sparkles" /> See plans
      </button>
    </div>
  )

  if (!data) return null

  const { summary, weeklyActivity, sources, advanced } = data
  const maxWeek = Math.max(1, ...weeklyActivity.map(w => w.count))
  const maxSource = Math.max(1, ...sources.map(s => s.count))
  const noData = summary.total === 0

  return (
    <>
      <div className="an-header">
        <div>
          <h2 className="an-title">Analytics</h2>
          <p className="an-sub">Your application activity and outcomes over time.</p>
        </div>
      </div>

      {noData ? (
        <div className="an-empty-note">
          <i className="ti ti-chart-dots" />
          <div>
            <strong>No applications yet</strong>
            <span>Apply to a few leads and your stats will start building here.</span>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
            <i className="ti ti-layout-grid" /> Browse leads
          </button>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="an-kpis">
            <div className="an-kpi">
              <span className="an-kpi-ico"><i className="ti ti-send" /></span>
              <span className="an-kpi-val">{summary.total}</span>
              <span className="an-kpi-lbl">Applications</span>
            </div>
            <div className="an-kpi">
              <span className="an-kpi-ico" style={{ background: 'var(--hi-bg)', color: 'var(--hi)' }}><i className="ti ti-trophy" /></span>
              <span className="an-kpi-val">{summary.winRate !== null ? `${summary.winRate}%` : '—'}</span>
              <span className="an-kpi-lbl">Win rate</span>
            </div>
            <div className="an-kpi">
              <span className="an-kpi-ico" style={{ background: 'var(--lime-dim)', color: 'var(--lime-ink)' }}><i className="ti ti-circle-check" /></span>
              <span className="an-kpi-val">{summary.won}</span>
              <span className="an-kpi-lbl">Projects won</span>
            </div>
            <div className="an-kpi">
              <span className="an-kpi-ico"><i className="ti ti-currency-pound" /></span>
              <span className="an-kpi-val">{summary.avgBudget !== null ? `£${summary.avgBudget.toLocaleString('en-GB')}` : '—'}</span>
              <span className="an-kpi-lbl">Avg budget applied</span>
            </div>
          </div>

          {/* Weekly activity */}
          <div className="an-card">
            <div className="an-card-head">
              <h3>Applications per week</h3>
              <span className="an-card-meta">Last 8 weeks</span>
            </div>
            <div className="an-bars">
              {weeklyActivity.map((w, i) => (
                <div key={i} className="an-bar-col">
                  <span className="an-bar-val">{w.count > 0 ? w.count : ''}</span>
                  <div className="an-bar-track">
                    <div className="an-bar-fill" style={{ height: `${Math.round((w.count / maxWeek) * 100)}%` }} />
                  </div>
                  <span className="an-bar-lbl">{w.week}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div className="an-card">
              <div className="an-card-head">
                <h3>Where your leads came from</h3>
                <span className="an-card-meta">By applications</span>
              </div>
              <div className="an-rows">
                {sources.map(s => (
                  <div key={s.source} className="an-row">
                    <span className="an-row-lbl">{srcLabel(s.source)}</span>
                    <div className="an-row-track">
                      <div className="an-row-fill" style={{ width: `${Math.round((s.count / maxSource) * 100)}%` }} />
                    </div>
                    <span className="an-row-val">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advanced — Max plan */}
          {advanced && (
            <>
              <div className="an-card">
                <div className="an-card-head">
                  <h3>Pipeline funnel</h3>
                  <span className="an-card-meta an-pro-tag">Max</span>
                </div>
                <div className="an-funnel">
                  {([
                    ['Interested', advanced.stageCounts.interested, 'ti-eye'],
                    ['Applied', advanced.stageCounts.applied, 'ti-send'],
                    ['Hired', advanced.stageCounts.hired, 'ti-trophy'],
                  ] as [string, number, string][]).map(([lbl, n, ic]) => (
                    <div key={lbl} className="an-funnel-step">
                      <span className="an-funnel-ico"><i className={`ti ${ic}`} /></span>
                      <span className="an-funnel-val">{n}</span>
                      <span className="an-funnel-lbl">{lbl}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="an-split">
                <div className="an-card an-stat-card">
                  <span className="an-stat-lbl">Skill coverage</span>
                  <span className="an-stat-val">{advanced.skillCoverageRate !== null ? `${advanced.skillCoverageRate}%` : '—'}</span>
                  <span className="an-stat-note">of required skills you matched</span>
                </div>
                <div className="an-card an-stat-card">
                  <span className="an-stat-lbl">Avg time to apply</span>
                  <span className="an-stat-val">{advanced.avgDaysToApply !== null ? `${advanced.avgDaysToApply}d` : '—'}</span>
                  <span className="an-stat-note">from post to your application</span>
                </div>
              </div>

              {advanced.sourceWinRates.length > 0 && (
                <div className="an-card">
                  <div className="an-card-head">
                    <h3>Win rate by source</h3>
                    <span className="an-card-meta an-pro-tag">Max</span>
                  </div>
                  <div className="an-rows">
                    {advanced.sourceWinRates.map(s => (
                      <div key={s.source} className="an-row">
                        <span className="an-row-lbl">{srcLabel(s.source)}</span>
                        <div className="an-row-track">
                          <div className="an-row-fill" style={{ width: `${s.winRate}%`, background: 'var(--hi)' }} />
                        </div>
                        <span className="an-row-val">{s.winRate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {!advanced && (
            <div className="an-upsell" onClick={() => router.push('/dashboard/billing')}>
              <i className="ti ti-lock" />
              <div>
                <strong>Unlock advanced analytics</strong>
                <span>Pipeline funnel, win rate by source, skill coverage and more on Pro.</span>
              </div>
              <i className="ti ti-chevron-right an-upsell-arr" />
            </div>
          )}
        </>
      )}
    </>
  )
}
