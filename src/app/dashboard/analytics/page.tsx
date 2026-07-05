'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { sourceMeta } from '@/lib/sources'

// Brand label + colour per source (groups Reddit subs; direct/unknown → neutral).
function srcInfo(s: string): { label: string; color: string } {
  const id = (s || '').toLowerCase()
  if (!id || id === 'unknown' || id === 'direct') return { label: 'Other', color: '#9AA398' }
  return sourceMeta(id.startsWith('reddit') ? 'reddit' : id)
}

// Compact money label: £850, £4.2k, £12k
function moneyLabel(n: number): string {
  if (n >= 1000) return `£${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return `£${n}`
}

interface Analytics {
  plan: string
  range: number
  lifetimeTotal: number
  roi: null | { revenue12m: number; annualCost: number; multiple: number }
  market: null | { medianRate: number; sampleSize: number }
  summary: {
    applications: number; won: number; lost: number; winRate: number | null
    revenueWon: number; pipelineValue: number; openCount: number; avgDealCycleDays: number | null
  }
  prev: { applications: number; winRate: number | null; revenueWon: number }
  activity: { label: string; count: number }[]
  revenueByMonth: { month: string; amount: number }[]
  sources: { source: string; count: number; won: number; revenue: number }[]
  advanced: null | {
    stageCounts: { interested: number; applied: number; in_talks: number; hired: number; lost: number }
    lostReasons: { reason: string; count: number }[]
    skillCoverageRate: number | null
  }
}

// Delta vs the previous equal period. counts/money → %, rates → points.
function DeltaChip({ cur, prev, kind }: { cur: number | null; prev: number | null; kind: 'pct' | 'pts' }) {
  if (cur == null || prev == null) return null
  if (kind === 'pts') {
    const d = cur - prev
    if (d === 0) return <span className="an-delta flat">±0pts</span>
    return <span className={`an-delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}pts</span>
  }
  if (prev === 0 && cur === 0) return null
  if (prev === 0) return <span className="an-delta up">new</span>
  const d = Math.round(((cur - prev) / prev) * 100)
  if (d === 0) return <span className="an-delta flat">±0%</span>
  return <span className={`an-delta ${d > 0 ? 'up' : 'down'}`}>{d > 0 ? '▲' : '▼'} {Math.abs(d)}%</span>
}

// Continuous data over time → line/area chart.
function TrendChart({ data }: { data: { label: string; count: number }[] }) {
  const W = 600, H = 150, P = 10
  const max = Math.max(1, ...data.map(d => d.count))
  const n = data.length
  const x = (i: number) => P + (n <= 1 ? 0 : (i / (n - 1)) * (W - 2 * P))
  const y = (v: number) => H - P - (v / max) * (H - 2 * P)
  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1).toFixed(1)} ${H - P} L${x(0).toFixed(1)} ${H - P} Z`
  const last = data[n - 1]
  return (
    <svg className="an-area" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Applications over time">
      <defs>
        <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--lime)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--lime)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={P} y1={H - P} x2={W - P} y2={H - P} stroke="var(--line)" strokeWidth="1" />
      <path d={area} fill="url(#anGrad)" />
      <path d={line} fill="none" stroke="var(--lime-deep)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {last && <circle cx={x(n - 1)} cy={y(last.count)} r="4" fill="var(--lime-deep)" stroke="var(--card)" strokeWidth="2.5" />}
    </svg>
  )
}

const RANGES = [
  { v: 30, label: '30d' },
  { v: 90, label: '90d' },
  { v: 365, label: '12m' },
]

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [range, setRange] = useState(90)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      try {
        const res = await fetch(`/api/analytics?range=${range}`)
        if (cancelled) return
        if (res.status === 403) { setLocked(true); setLoading(false); return }
        if (res.ok) setData(await res.json())
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [supabase, router, range])

  if (loading && !data) return (
    <>
      <div className="an-head"><div className="skel" style={{ height: 26, width: 180, borderRadius: 7 }} /></div>
      <div className="an-kpis2">
        {[0, 1, 2, 3, 4].map(i => <div key={i} className="an-kpi2"><div className="skel" style={{ height: 40, width: '80%', borderRadius: 6 }} /></div>)}
      </div>
      <div className="an-grid2">
        {[0, 1, 2, 3].map(i => <div key={i} className="an-panel" style={{ marginBottom: 0 }}><div className="skel" style={{ height: 150, width: '100%', borderRadius: 8 }} /></div>)}
      </div>
    </>
  )

  if (locked) return (
    <div className="empty">
      <div className="empty-icon"><i className="ti ti-chart-bar" /></div>
      <h3>Analytics is a Starter feature</h3>
      <p>Track your win rate, revenue and best sources. Upgrade to unlock your numbers.</p>
      <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard/billing')}>See plans</button>
    </div>
  )

  if (!data) return null

  const { summary, prev, activity, revenueByMonth, sources, advanced } = data
  const decided = summary.won + summary.lost
  const hasRevenue = revenueByMonth.some(m => m.amount > 0)
  const revMax = Math.max(1, ...revenueByMonth.map(m => m.amount))
  const revLastIdx = revenueByMonth.length - 1

  if (data.lifetimeTotal === 0) return (
    <>
      <div className="an-head"><div><h1 className="an-h1">Performance</h1><p className="an-sub">Your pipeline performance, measured.</p></div></div>
      <div className="an-empty-note">
        <div>
          <strong>No applications yet</strong>
          <span>Apply to a few leads and your numbers will start building here.</span>
        </div>
        <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>Browse leads</button>
      </div>
    </>
  )

  return (
    <>
      <div className="an-head">
        <div>
          <h1 className="an-h1">Performance</h1>
          <p className="an-sub">vs previous {range === 365 ? '12 months' : `${range} days`}</p>
        </div>
        <div className="an-range" role="tablist" aria-label="Time range">
          {RANGES.map(r => (
            <button key={r.v} role="tab" aria-selected={range === r.v} className={range === r.v ? 'on' : ''} onClick={() => setRange(r.v)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI STRIP ── */}
      <div className="an-kpis2">
        <div className="an-kpi2">
          <span className="an-kpi2-lbl tip" data-tip="Leads you moved into your pipeline in this period">Applications</span>
          <span className="an-kpi2-val">{summary.applications}</span>
          <DeltaChip cur={summary.applications} prev={prev.applications} kind="pct" />
        </div>
        <div className="an-kpi2">
          <span className="an-kpi2-lbl tip" data-tip="Won ÷ decided deals (won + lost) in this period">Win rate</span>
          <span className="an-kpi2-val">{summary.winRate != null ? `${summary.winRate}%` : '—'}</span>
          {decided > 0 && decided < 5
            ? <span className="an-kpi2-note">{decided} decided deal{decided === 1 ? '' : 's'}</span>
            : <DeltaChip cur={summary.winRate} prev={prev.winRate} kind="pts" />}
        </div>
        <div className="an-kpi2">
          <span className="an-kpi2-lbl tip" data-tip="Confirmed value of deals you won in this period">Revenue won</span>
          <span className="an-kpi2-val">{summary.revenueWon > 0 ? moneyLabel(summary.revenueWon) : '—'}</span>
          <DeltaChip cur={summary.revenueWon} prev={prev.revenueWon} kind="pct" />
        </div>
        <div className="an-kpi2">
          <span className="an-kpi2-lbl tip" data-tip="Total listed budget across your open (not yet won/lost) deals right now">In play</span>
          <span className="an-kpi2-val">{summary.pipelineValue > 0 ? moneyLabel(summary.pipelineValue) : '—'}</span>
          <span className="an-kpi2-note">{summary.openCount} open deal{summary.openCount === 1 ? '' : 's'}</span>
        </div>
        <div className="an-kpi2">
          <span className="an-kpi2-lbl tip" data-tip="Average days from entering the pipeline to marking a deal won">Deal cycle</span>
          <span className="an-kpi2-val">{summary.avgDealCycleDays != null ? `${summary.avgDealCycleDays}d` : '—'}</span>
          <span className="an-kpi2-note">entry → won</span>
        </div>
      </div>

      {/* ── ROI — the sentence that justifies the subscription ── */}
      {data.roi && data.roi.multiple >= 1 && (
        <div className="an-roi">
          <b>£{data.roi.revenue12m.toLocaleString('en-GB')}</b> won through your pipeline in the last 12 months —
          <b> {data.roi.multiple >= 10 ? Math.round(data.roi.multiple) : data.roi.multiple.toFixed(1)}×</b> what Flaiir costs you a year.
        </div>
      )}

      {/* ── GRID ── */}
      <div className="an-grid2">
        <section className="an-panel">
          <div className="an-panel-head"><h3>Activity</h3><span className="an-panel-meta">applications · {range === 365 ? 'monthly' : 'weekly'}</span></div>
          <TrendChart data={activity} />
          <div className="an-xaxis">
            <span>{activity[0]?.label}</span>
            <span>{activity[Math.floor(activity.length / 2)]?.label}</span>
            <span>{activity[activity.length - 1]?.label}</span>
          </div>
        </section>

        <section className="an-panel">
          <div className="an-panel-head"><h3>Revenue</h3><span className="an-panel-meta">won deals · last 6 months</span></div>
          {hasRevenue ? (
            <>
              <div className="an-vbars">
                {revenueByMonth.map((m, i) => (
                  <div key={`${m.month}-${i}`} className="an-vbar-col" title={`${m.month}: £${m.amount.toLocaleString('en-GB')}`}>
                    <span className="an-vbar-val">{m.amount > 0 && (m.amount === revMax || i === revLastIdx) ? moneyLabel(m.amount) : ''}</span>
                    <div className="an-vbar-track"><div className="an-vbar-fill" style={{ height: `${Math.round((m.amount / revMax) * 100)}%` }} /></div>
                    <span className="an-vbar-lbl">{m.month}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="an-panel-empty">No won deals with a value yet. Confirm a deal value when you mark a lead won and revenue shows up here.</div>
          )}
        </section>

        <section className="an-panel">
          <div className="an-panel-head"><h3>Sources</h3><span className="an-panel-meta">where your applications go</span></div>
          {sources.length > 0 ? (
            <table className="an-tbl">
              <thead>
                <tr><th>Source</th><th>Apps</th><th>Won</th><th>Win rate</th><th>Revenue</th></tr>
              </thead>
              <tbody>
                {sources.slice(0, 6).map(s => {
                  const info = srcInfo(s.source)
                  const dec = s.won // wins over apps in window — decided data is thin per source
                  return (
                    <tr key={s.source}>
                      <td><span className="an-dot" style={{ background: info.color }} />{info.label}</td>
                      <td>{s.count}</td>
                      <td>{dec}</td>
                      <td>{s.count > 0 ? `${Math.round((s.won / s.count) * 100)}%` : '—'}</td>
                      <td>{s.revenue > 0 ? moneyLabel(s.revenue) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="an-panel-empty">No applications in this period.</div>
          )}
        </section>

        {advanced ? (
          <section className="an-panel">
            <div className="an-panel-head"><h3>Pipeline</h3><span className="an-panel-meta">current stages</span></div>
            {(() => {
              const stages = [
                { key: 'interested', lbl: 'Interested', n: advanced.stageCounts.interested, c: 'var(--slate-2)' },
                { key: 'applied', lbl: 'Applied', n: advanced.stageCounts.applied, c: 'var(--lime-deep)' },
                { key: 'in_talks', lbl: 'In talks', n: advanced.stageCounts.in_talks, c: 'var(--mid)' },
                { key: 'hired', lbl: 'Won', n: advanced.stageCounts.hired, c: 'var(--hi)' },
                { key: 'lost', lbl: 'Lost', n: advanced.stageCounts.lost, c: '#C9CEC6' },
              ]
              const total = Math.max(1, stages.reduce((s, x) => s + x.n, 0))
              return (
                <>
                  <div className="an-stack">
                    {stages.filter(s => s.n > 0).map(s => (
                      <div key={s.key} className="an-stack-seg" style={{ width: `${(s.n / total) * 100}%`, background: s.c }} />
                    ))}
                  </div>
                  <div className="an-legend">
                    {stages.map(s => (
                      <span key={s.key} className="an-legend-item"><span className="an-dot" style={{ background: s.c }} />{s.lbl}<b>{s.n}</b></span>
                    ))}
                  </div>
                </>
              )
            })()}
          </section>
        ) : (
          <section className="an-panel an-upsell-panel" onClick={() => router.push('/dashboard/billing')}>
            <div className="an-panel-head"><h3>Pipeline &amp; loss analysis</h3></div>
            <div className="an-panel-empty">Stage distribution, why deals are lost, and skill coverage are on the Max plan. <span className="an-upsell-link">Upgrade →</span></div>
          </section>
        )}

        {advanced && advanced.lostReasons.length > 0 && (
          <section className="an-panel">
            <div className="an-panel-head"><h3>Why deals were lost</h3><span className="an-panel-meta">from pipeline</span></div>
            <div className="an-list">
              {advanced.lostReasons.map(r => {
                const maxReason = Math.max(1, ...advanced.lostReasons.map(x => x.count))
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

        {data.market && (
          <section className="an-panel an-mini">
            <span className="an-mini-val">£{data.market.medianRate.toLocaleString('en-GB')}<span className="an-mini-unit">/day</span></span>
            <span className="an-mini-lbl">Market rate</span>
            <span className="an-mini-note">median across {data.market.sampleSize} day-rate leads matching your skills · last 30 days</span>
          </section>
        )}

        {advanced && (
          <section className="an-panel an-mini">
            <span className="an-mini-val">{advanced.skillCoverageRate != null ? `${advanced.skillCoverageRate}%` : '—'}</span>
            <span className="an-mini-lbl">Skill coverage</span>
            <span className="an-mini-note">of required skills across the leads you applied to</span>
          </section>
        )}
      </div>
    </>
  )
}
