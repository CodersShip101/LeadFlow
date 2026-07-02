'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { sourceMeta } from '@/lib/sources'

// Brand label + colour per source (groups Reddit subs; direct/unknown → neutral).
// Compact money label: £850, £4.2k, £12k
function moneyLabel(n: number): string {
  if (n >= 1000) return `£${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return `£${n}`
}

function srcInfo(s: string): { label: string; color: string } {
  const id = (s || '').toLowerCase()
  if (!id || id === 'unknown' || id === 'direct') return { label: 'Other', color: '#9AA398' }
  return sourceMeta(id.startsWith('reddit') ? 'reddit' : id)
}

interface Analytics {
  summary: { total: number; won: number; lost: number; winRate: number | null; avgBudget: number | null; revenueWon?: number }
  money?: { revenueByMonth: { month: string; amount: number }[]; pipelineValue: number; openCount: number; avgDealCycleDays: number | null }
  weeklyActivity: { week: string; count: number }[]
  sources: { source: string; count: number }[]
  advanced: null | {
    stageCounts: { interested: number; applied: number; in_talks?: number; hired: number; lost?: number }
    skillCoverageRate: number | null
    sourceWinRates: { source: string; winRate: number; total: number }[]
    avgDaysToApply: number | null
    lostReasons?: { reason: string; count: number }[]
  }
  plan: string
}

// Continuous data over time → line/area chart (dashboard best-practice).
function TrendChart({ data }: { data: { week: string; count: number }[] }) {
  const W = 600, H = 132, P = 10
  const max = Math.max(1, ...data.map(d => d.count))
  const n = data.length
  const x = (i: number) => P + (n <= 1 ? 0 : (i / (n - 1)) * (W - 2 * P))
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)} ${H - P} L${x(0).toFixed(1)} ${H - P} Z`
  const last = data[n - 1]
  return (
    <svg className="an-area" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Applications per week">
      <defs>
        <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--line)" strokeWidth="1" />
      <path d={area} fill="url(#anGrad)" />
      <path d={line} fill="none" stroke="var(--lime-deep)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(n - 1)} cy={y(last.count)} r="4" fill="var(--lime-deep)" stroke="var(--card)" strokeWidth="2.5" />
    </svg>
  )
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
    <>
      <div className="an-head"><div className="skel" style={{ height: 26, width: 180, borderRadius: 7 }} /></div>
      <div className="an-outcomes">
        <div className="an-hero"><div className="skel" style={{ height: 64, width: 140, borderRadius: 8 }} /></div>
        <div className="an-stats">
          {[0, 1, 2].map(i => <div key={i} className="an-stat"><div className="skel" style={{ height: 28, width: 70, borderRadius: 6 }} /><div className="skel" style={{ height: 12, width: 60, borderRadius: 6, marginTop: 8 }} /></div>)}
        </div>
      </div>
      <div className="an-panel"><div className="skel" style={{ height: 150, width: '100%', borderRadius: 8 }} /></div>
      <div className="an-panel"><div className="skel" style={{ height: 110, width: '100%', borderRadius: 8 }} /></div>
    </>
  )

  if (locked) return (
    <div className="empty">
      <div className="empty-icon"><i className="ti ti-chart-bar" /></div>
      <h3>Analytics is a Starter feature</h3>
      <p>Track your win rate, application activity and best sources. Upgrade to unlock your numbers.</p>
      <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard/billing')}>See plans</button>
    </div>
  )

  if (!data) return null

  const { summary, money, weeklyActivity, sources, advanced } = data
  const maxSource = Math.max(1, ...sources.map(s => s.count))
  const noData = summary.total === 0
  const decided = summary.won + summary.lost
  const thisWeek = weeklyActivity[weeklyActivity.length - 1]?.count ?? 0
  const lastWeek = weeklyActivity[weeklyActivity.length - 2]?.count ?? 0
  const weekTrend = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null
  const weeksTotal = weeklyActivity.reduce((s, w) => s + w.count, 0)

  return (
    <>
      <div className="an-head">
        <h1 className="an-h1">Performance</h1>
        <p className="an-sub">Your application activity and outcomes.</p>
      </div>

      {noData ? (
        <div className="an-empty-note">
          <div>
            <strong>No applications yet</strong>
            <span>Apply to a few leads and your stats will start building here.</span>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>Browse leads</button>
        </div>
      ) : (
        <>
          {/* OUTCOMES — one hero metric stands out, the rest support it */}
          <section className="an-outcomes">
            <div className="an-hero">
              <span className="an-hero-eyebrow">Win rate</span>
              <div className="an-hero-num">
                {summary.winRate != null ? <>{summary.winRate}<span className="an-hero-pct">%</span></> : '—'}
              </div>
              {decided > 0 ? (
                <>
                  <div className="an-hero-split"><div style={{ width: `${Math.round((summary.won / decided) * 100)}%` }} /></div>
                  <div className="an-hero-legend">
                    <span><span className="an-dot" style={{ background: 'var(--hi)' }} />{summary.won} won</span>
                    <span><span className="an-dot" style={{ background: 'var(--coral)' }} />{summary.lost} lost</span>
                  </div>
                  {decided < 5 && (
                    <div className="an-hero-note">Based on {decided} decided deal{decided === 1 ? '' : 's'} — early days</div>
                  )}
                </>
              ) : <div className="an-hero-empty">No outcomes recorded yet</div>}
            </div>
            <div className="an-stats">
              <div className="an-stat"><span className="an-stat-num">{summary.total}</span><span className="an-stat-lbl">Applications</span></div>
              <div className="an-stat"><span className="an-stat-num">{summary.revenueWon ? `£${summary.revenueWon.toLocaleString('en-GB')}` : summary.won}</span><span className="an-stat-lbl">{summary.revenueWon ? 'Revenue won' : 'Projects won'}</span></div>
              <div className="an-stat"><span className="an-stat-num">{summary.avgBudget != null ? `£${summary.avgBudget.toLocaleString('en-GB')}` : '—'}</span><span className="an-stat-lbl">Avg budget</span></div>
            </div>
          </section>

          {/* MONEY — what's in play and how fast deals close */}
          {money && (
            <div className="an-grid-2">
              <div className="an-panel an-mini">
                <span className="an-mini-val">{money.pipelineValue > 0 ? `£${money.pipelineValue.toLocaleString('en-GB')}` : '—'}</span>
                <span className="an-mini-lbl">In play</span>
                <span className="an-mini-note">across {money.openCount} open deal{money.openCount === 1 ? '' : 's'} in your pipeline</span>
              </div>
              <div className="an-panel an-mini">
                <span className="an-mini-val">{money.avgDealCycleDays != null ? `${money.avgDealCycleDays}d` : '—'}</span>
                <span className="an-mini-lbl">Avg deal cycle</span>
                <span className="an-mini-note">from entering the pipeline to won</span>
              </div>
            </div>
          )}

          {/* REVENUE — won deals by month */}
          {money && money.revenueByMonth.some(m => m.amount > 0) && (() => {
            const max = Math.max(1, ...money.revenueByMonth.map(m => m.amount))
            const lastIdx = money.revenueByMonth.length - 1
            return (
              <section className="an-panel">
                <div className="an-panel-head"><h3>Revenue</h3><span className="an-panel-meta">won deals · last 6 months</span></div>
                <div className="an-vbars">
                  {money.revenueByMonth.map((m, i) => (
                    <div key={`${m.month}-${i}`} className="an-vbar-col" title={`${m.month}: £${m.amount.toLocaleString('en-GB')}`}>
                      <span className="an-vbar-val">{m.amount > 0 && (m.amount === max || i === lastIdx) ? moneyLabel(m.amount) : ''}</span>
                      <div className="an-vbar-track"><div className="an-vbar-fill" style={{ height: `${Math.round((m.amount / max) * 100)}%` }} /></div>
                      <span className="an-vbar-lbl">{m.month}</span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })()}

          {/* ACTIVITY — trend over time */}
          <section className="an-panel">
            <div className="an-panel-head">
              <h3>Activity</h3>
              <div className="an-panel-right">
                <span className="an-panel-meta">{weeksTotal} in 8 weeks</span>
                {weekTrend !== null && (
                  <span className={`an-trend-chip ${weekTrend >= 0 ? 'up' : 'down'}`}>
                    {weekTrend >= 0 ? '↑' : '↓'} {Math.abs(weekTrend)}% vs last wk
                  </span>
                )}
              </div>
            </div>
            <TrendChart data={weeklyActivity} />
            <div className="an-xaxis">
              <span>{weeklyActivity[0]?.week}</span>
              <span>{weeklyActivity[Math.floor(weeklyActivity.length / 2)]?.week}</span>
              <span>This week</span>
            </div>
          </section>

          {/* SOURCES */}
          {sources.length > 0 && (
            <section className="an-panel">
              <div className="an-panel-head"><h3>Top sources</h3><span className="an-panel-meta">by applications</span></div>
              <div className="an-list">
                {sources.map(s => {
                  const info = srcInfo(s.source)
                  return (
                    <div key={s.source} className="an-row">
                      <span className="an-row-lbl"><span className="an-dot" style={{ background: info.color }} />{info.label}</span>
                      <div className="an-row-track"><div className="an-row-fill" style={{ width: `${Math.round((s.count / maxSource) * 100)}%`, background: info.color }} /></div>
                      <span className="an-row-val">{s.count}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* ADVANCED — team / Pro */}
          {advanced && (() => {
            const stages = [
              { key: 'interested', lbl: 'Interested', n: advanced.stageCounts.interested, c: 'var(--slate-2)' },
              { key: 'applied', lbl: 'Applied', n: advanced.stageCounts.applied, c: 'var(--lime-deep)' },
              { key: 'in_talks', lbl: 'In talks', n: advanced.stageCounts.in_talks ?? 0, c: 'var(--mid)' },
              { key: 'hired', lbl: 'Won', n: advanced.stageCounts.hired, c: 'var(--hi)' },
              { key: 'lost', lbl: 'Lost', n: advanced.stageCounts.lost ?? 0, c: '#C9CEC6' },
            ]
            const stageTotal = Math.max(1, stages.reduce((s, x) => s + x.n, 0))
            return (
              <>
                <section className="an-panel">
                  <div className="an-panel-head"><h3>Pipeline</h3><span className="an-panel-meta">current stages</span></div>
                  <div className="an-stack">
                    {stages.filter(s => s.n > 0).map(s => (
                      <div key={s.key} className="an-stack-seg" style={{ width: `${(s.n / stageTotal) * 100}%`, background: s.c }} />
                    ))}
                  </div>
                  <div className="an-legend">
                    {stages.map(s => (
                      <span key={s.key} className="an-legend-item"><span className="an-dot" style={{ background: s.c }} />{s.lbl}<b>{s.n}</b></span>
                    ))}
                  </div>
                </section>

                {(advanced.lostReasons?.length ?? 0) > 0 && (
                  <section className="an-panel">
                    <div className="an-panel-head"><h3>Why deals were lost</h3><span className="an-panel-meta">from pipeline</span></div>
                    <div className="an-list">
                      {advanced.lostReasons!.map(r => {
                        const maxReason = Math.max(1, ...advanced.lostReasons!.map(x => x.count))
                        return (
                          <div key={r.reason} className="an-row">
                            <span className="an-row-lbl">{r.reason}</span>
                            <div className="an-row-track"><div className="an-row-fill" style={{ width: `${Math.round((r.count / maxReason) * 100)}%`, background: 'var(--coral)' }} /></div>
                            <span className="an-row-val">{r.count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}

                <div className="an-grid-2">
                  <div className="an-panel an-mini">
                    <span className="an-mini-val">{advanced.skillCoverageRate != null ? `${advanced.skillCoverageRate}%` : '—'}</span>
                    <span className="an-mini-lbl">Skill coverage</span>
                    <span className="an-mini-note">of required skills you matched</span>
                  </div>
                  <div className="an-panel an-mini">
                    <span className="an-mini-val">{advanced.avgDaysToApply != null ? `${advanced.avgDaysToApply}d` : '—'}</span>
                    <span className="an-mini-lbl">Avg time to apply</span>
                    <span className="an-mini-note">from post to application</span>
                  </div>
                </div>

                {advanced.sourceWinRates.length > 0 && (
                  <section className="an-panel">
                    <div className="an-panel-head"><h3>Win rate by source</h3></div>
                    <div className="an-list">
                      {advanced.sourceWinRates.map(s => {
                        const info = srcInfo(s.source)
                        return (
                          <div key={s.source} className="an-row">
                            <span className="an-row-lbl"><span className="an-dot" style={{ background: info.color }} />{info.label}</span>
                            <div className="an-row-track"><div className="an-row-fill" style={{ width: `${s.winRate}%`, background: 'var(--hi)' }} /></div>
                            <span className="an-row-val">{s.winRate}%</span>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )}
              </>
            )
          })()}

          {!advanced && (
            <div className="an-upsell" onClick={() => router.push('/dashboard/billing')}>
              <div>
                <strong>Unlock advanced analytics</strong>
                <span>Pipeline stages, win rate by source, skill coverage and more on Pro.</span>
              </div>
              <span className="an-upsell-cta">Upgrade →</span>
            </div>
          )}
        </>
      )}
    </>
  )
}
