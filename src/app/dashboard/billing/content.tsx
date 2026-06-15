'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Application } from '@/types'
import { PRICING, ENTITLEMENTS, type Tier } from '@/lib/tiers'
import toast from 'react-hot-toast'

// Order shown in the plan grid. Source of truth for names/prices is lib/tiers.ts.
const TIER_ORDER: Tier[] = ['free', 'pro', 'max']
const TIER_ICON: Record<string, string> = { free: 'ti-radar-2', pro: 'ti-bolt', max: 'ti-crown', team: 'ti-users' }
const FREE_APP_LIMIT = ENTITLEMENTS.free.applicationsPerMonth as number

// Per-card feature lists — mirror the entitlements in lib/tiers.ts.
type Feat = { txt: string; muted?: boolean }
const FEATURES: Record<string, Feat[]> = {
  free: [
    { txt: 'Scored lead feed (all sources)' },
    { txt: `${FREE_APP_LIMIT} applications / month` },
    { txt: 'Pipeline tracking' },
    { txt: `Auto-refresh every ${ENTITLEMENTS.free.scanIntervalHours}h` },
    { txt: 'Source links hidden', muted: true },
    { txt: 'No analytics', muted: true },
  ],
  pro: [
    { txt: 'Everything in Free' },
    { txt: 'Unlimited applications' },
    { txt: 'Direct source links' },
    { txt: `Auto-refresh every ${ENTITLEMENTS.pro.scanIntervalHours}h` },
    { txt: 'Daily email digest' },
    { txt: 'Custom lead alerts' },
    { txt: 'Basic analytics' },
  ],
  max: [
    { txt: 'Everything in Pro' },
    { txt: `Auto-refresh every ${ENTITLEMENTS.max.scanIntervalHours}h` },
    { txt: 'Manual refresh on demand' },
    { txt: 'Adjustable scoring weights' },
    { txt: 'Advanced analytics + CSV export' },
    { txt: 'Priority support' },
  ],
  team: [
    { txt: 'Everything in Max' },
    { txt: 'Shared team lead pool' },
    { txt: 'Team pipeline & assignment' },
    { txt: 'Admin & member roles' },
    { txt: 'Centralised billing' },
  ],
}

// Full comparison grid. Columns: Free · Pro · Max
type CmpVal = boolean | string
const CMP_GROUPS: { label: string; rows: [string, CmpVal, CmpVal, CmpVal][] }[] = [
  {
    label: 'Lead feed',
    rows: [
      ['Scored lead feed', true, true, true],
      ['Applications / month', String(FREE_APP_LIMIT), '∞', '∞'],
      ['Direct source links', false, true, true],
      ['Auto-refresh', '5h', '2h', '1h'],
      ['Manual refresh', false, false, true],
    ],
  },
  {
    label: 'Insight',
    rows: [
      ['Daily email digest', false, true, true],
      ['Custom lead alerts', false, true, true],
      ['Basic analytics', false, true, true],
      ['Advanced analytics', false, false, true],
      ['CSV export', false, false, true],
      ['Adjustable scoring weights', false, false, true],
    ],
  },
  {
    label: 'Support',
    rows: [
      ['Standard support', true, true, true],
      ['Priority support', false, false, true],
    ],
  },
]

export default function BillingContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appsUsed, setAppsUsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [teamSeats, setTeamSeats] = useState(3)
  const [busy, setBusy] = useState(false)
  const router = useRouter()
  const sp = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const upgraded = sp.get('upgraded')
    if (upgraded) {
      const labels: Record<string, string> = { pro: 'Pro', max: 'Max', team: 'Team' }
      toast.success(`Welcome to ${labels[upgraded] || upgraded}!`)
    }
  }, [sp])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      try {
        const res = await fetch('/api/applications')
        const apps: Application[] = res.ok ? await res.json() : []
        setAppsUsed(apps.filter(a => a.status !== 'saved').length)
      } catch { /* ignore — usage just shows 0 */ }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const plan = (profile?.subscription_status ?? 'free') as Tier
  const isAnnual = cycle === 'annual'
  const teamPrice = PRICING.team.monthly ?? 15

  const priceOf = useCallback((t: Tier) => {
    const p = PRICING[t]
    return (isAnnual ? p.annual : p.monthly) ?? 0
  }, [isAnnual])

  const handleUpgrade = useCallback(async (t: Tier) => {
    if (t === 'free' || t === plan || busy) return
    setBusy(true)
    try {
      const body: Record<string, unknown> = { tier: t, cycle }
      if (t === 'team') body.seats = teamSeats
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else toast.error(data.error || 'Something went wrong')
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }, [cycle, teamSeats, plan, busy])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center pt-16">
      <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  const curName = PRICING[plan]?.label || 'Free'
  const curIdx = TIER_ORDER.indexOf(plan)

  // Usage figures
  const isFree = plan === 'free'
  const appPct = isFree ? Math.min(100, Math.round((appsUsed / FREE_APP_LIMIT) * 100)) : 100
  const atLimit = isFree && appsUsed >= FREE_APP_LIMIT
  const nearLimit = isFree && appsUsed >= FREE_APP_LIMIT - 1 && !atLimit
  const appFillCls = atLimit ? 'crit' : nearLimit ? 'warn' : ''
  const scanHours = ENTITLEMENTS[plan]?.scanIntervalHours ?? 5
  const scanFill = scanHours <= 1 ? 100 : scanHours <= 2 ? 66 : 33
  const reset = new Date()
  const resetLabel = new Date(reset.getFullYear(), reset.getMonth() + 1, 1)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  const cmpCell = (v: CmpVal) =>
    v === true ? <span className="bill-cmp-yes">&#10003;</span>
      : v === false ? <span className="bill-cmp-no">&mdash;</span>
      : <span className="bill-cmp-val">{v}</span>

  const renderCard = (t: Tier) => {
    const v = PRICING[t]
    const isCurrent = plan === t
    const featured = t === 'pro'
    const idx = TIER_ORDER.indexOf(t)
    const isDowngrade = idx < curIdx
    const price = priceOf(t)
    const wasPrice = isAnnual ? v.monthly : null

    // Price block
    let priceBlock
    if (t === 'free') {
      priceBlock = (
        <div className="bpc-price-block">
          <div className="bpc-price">&pound;0<span className="per"> / month</span></div>
        </div>
      )
    } else {
      priceBlock = (
        <div className="bpc-price-block">
          <div className="bpc-price">
            &pound;{price}{wasPrice ? <span className="was">&pound;{wasPrice}</span> : null}
            <span className="per">{isAnnual ? ' / mo · billed yr' : ' / month'}</span>
          </div>
        </div>
      )
    }

    // CTA
    let cta
    if (isCurrent) {
      cta = <div className="bill-cta bill-cta-current"><i className="ti ti-circle-check" /> Your current plan</div>
    } else if (t === 'free') {
      cta = <button className="bill-cta bill-cta-ghost" disabled>Base plan</button>
    } else if (isDowngrade) {
      cta = <button className="bill-cta bill-cta-ghost" disabled={busy} onClick={() => handleUpgrade(t)}>Switch to {v.label}</button>
    } else if (featured) {
      cta = <button className="bill-cta bill-cta-warm" disabled={busy} onClick={() => handleUpgrade(t)}><i className="ti ti-crown" /> Upgrade to Pro</button>
    } else {
      cta = <button className="bill-cta bill-cta-primary" disabled={busy} onClick={() => handleUpgrade(t)}><i className="ti ti-arrow-right" /> Upgrade to {v.label}</button>
    }

    const refreshLine = t === 'free' ? { icon: 'ti-refresh', text: `Auto-refresh every ${ENTITLEMENTS.free.scanIntervalHours}h`, cls: '' }
      : t === 'pro' ? { icon: 'ti-refresh', text: `Auto-refresh every ${ENTITLEMENTS.pro.scanIntervalHours}h`, cls: '' }
      : { icon: 'ti-bolt', text: 'Refresh on demand', cls: 'on-demand' }

    return (
      <div key={t} className={`bill-card${featured ? ' feat' : ''}`}>
        {featured && <span className="bill-reco">MOST POPULAR</span>}
        <div className="bpc-tier">
          <span className="bpc-name">{v.label}</span>
          <span className="bpc-icon"><i className={`ti ${TIER_ICON[t]}`} /></span>
        </div>
        {priceBlock}
        <div className={`refresh-line ${refreshLine.cls}`}>
          <i className={`ti ${refreshLine.icon}`}></i>
          {refreshLine.text}
        </div>
        <p className="bpc-blurb">{v.blurb}</p>
        <div className="bpc-divider" />
        <ul className="bpc-feats">
          {FEATURES[t].map(f => (
            <li key={f.txt} className={`bpc-feat${f.muted ? ' muted' : ''}`}>
              <span className="bpc-fi"><i className={`ti ${f.muted ? 'ti-minus' : 'ti-check'}`} /></span>
              <span>{f.txt}</span>
            </li>
          ))}
        </ul>
        {cta}
        {(featured) && (
          <div className="bill-reassure">
            <span><i className="ti ti-shield-check" />Cancel anytime</span>
            <span><i className="ti ti-gift" />7 days free</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 dash-page bill-page">
      <div className="bill-header">
        <h1>Plan &amp; billing</h1>
        <p>
          You&apos;re on <span className="hl">{curName}</span>.{' '}
          <span style={{ color: 'var(--slate)' }}>Join <span className="hl">340+ UK freelancers</span> on a paid plan.</span>
        </p>
      </div>

      {/* Billing cycle */}
      <div className="cycle-row">
        <div className="bill-toggle">
          <button className={isAnnual ? '' : 'on'} onClick={() => setCycle('monthly')}>Monthly</button>
          <button className={isAnnual ? 'on' : ''} onClick={() => setCycle('annual')}>Annual</button>
        </div>
        <span className="save-badge" style={{ opacity: isAnnual ? 1 : 0.45 }}>
          <i className="ti ti-tag" />Save 20% &mdash; pay yearly
        </span>
      </div>

      {/* Plan cards — individual plans */}
      <div className="bill-grid bill-grid-3">
        {TIER_ORDER.map(renderCard)}
      </div>

      {/* Team section — plans that grow with you */}
      <div className="team-band">
        <div className="team-head">
          <div>
            <h3 className="display" style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Plans that grow with you</h3>
            <p style={{ color: 'var(--slate)', fontSize: 13.5 }}>Questions? <span onClick={() => toast('Chat with our team (demo)')} style={{ color: 'var(--lime-ink)', fontWeight: 600, cursor: 'pointer' }}>Chat with our team &rarr;</span></p>
          </div>
          <div className="seat-controls">
            <span style={{ fontSize: 12.5, color: 'var(--slate)', fontWeight: 500 }}>Seats</span>
            <div className="seat-pick light">
              <button onClick={() => setTeamSeats(Math.max(5, teamSeats - 1))}>&minus;</button>
              <span className="seat-n">{teamSeats}</span>
              <button onClick={() => setTeamSeats(Math.min(150, teamSeats + 1))}>+</button>
            </div>
            <span style={{ fontSize: 11.5, color: 'var(--slate-2)' }}>5–150 users</span>
          </div>
        </div>

        <div className="team-grid">
          {/* Standard seat */}
          <div className="team-card">
            <div className="tc-tag">Team</div>
            <div className="tc-name">Standard seat</div>
            <div className="tc-price">£{teamPrice}<span>/seat/mo</span></div>
            <div className="tc-sub">Predictable usage per seat &middot; £{teamPrice * teamSeats}/mo for {teamSeats} seats</div>
            <ul className="tc-feats">
              <li><i className="ti ti-check"></i>All Pro features per seat</li>
              <li><i className="ti ti-check"></i>Auto-refresh every 2h</li>
              <li><i className="ti ti-check"></i>Shared team lead pool</li>
              <li><i className="ti ti-check"></i>Team pipeline &amp; roles</li>
              <li><i className="ti ti-check"></i>Central billing &amp; admin</li>
            </ul>
            <button className={`btn ${plan === 'team' ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%' }} disabled={plan === 'team'} onClick={() => handleUpgrade('team')}>
              {plan === 'team' ? 'Current plan' : `Start Team — £${teamPrice * teamSeats}/mo`}
            </button>
          </div>

          {/* Premium seat */}
          {(() => {
            const premPrice = isAnnual ? 32 : 39
            const premTotal = premPrice * teamSeats
            return (
              <div className="team-card prem">
                <div className="tc-tag">Team</div>
                <div className="tc-name">Premium seat</div>
                <div className="tc-price">£{premPrice}<span>/seat/mo</span></div>
                <div className="tc-sub">Max power per seat &middot; £{premTotal}/mo for {teamSeats} seats</div>
                <ul className="tc-feats">
                  <li><i className="ti ti-check"></i>Everything in Standard</li>
                  <li><i className="ti ti-check"></i>On-demand refresh button</li>
                  <li><i className="ti ti-check"></i>Advanced analytics + CSV</li>
                  <li><i className="ti ti-check"></i>Adjustable scoring weights</li>
                  <li><i className="ti ti-check"></i>Lead assignment &amp; admin controls</li>
                </ul>
                <button className="btn btn-warm" style={{ width: '100%' }} onClick={() => toast('Premium seat coming soon (demo)')}>
                  Start Premium — £{premTotal}/mo
                </button>
              </div>
            )
          })()}

          {/* Enterprise */}
          <div className="team-card ent">
            <div className="tc-tag" style={{ color: 'var(--lime)' }}>20+ users</div>
            <div className="tc-name" style={{ color: '#fff' }}>Enterprise</div>
            <div className="tc-price" style={{ color: '#fff' }}>Custom<span style={{ color: '#A9B5AC' }}> pricing</span></div>
            <div className="tc-sub" style={{ color: '#A9B5AC' }}>Flexible pooled usage across your org</div>
            <ul className="tc-feats ent-feats">
              <li><i className="ti ti-check"></i>Everything in Team, plus:</li>
              <li><i className="ti ti-check"></i>Pooled billing &amp; spend limits</li>
              <li><i className="ti ti-check"></i>SSO &amp; SCIM provisioning</li>
              <li><i className="ti ti-check"></i>Audit logs &amp; API access</li>
              <li><i className="ti ti-check"></i>Dedicated account manager</li>
            </ul>
            <button className="btn btn-light" style={{ width: '100%' }} onClick={() => toast('Routing to sales (demo)')}>Contact sales</button>
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="bill-usage">
        <div className="bill-usage-head">
          <h3>This month&apos;s usage</h3>
          <span className="bill-usage-cycle">Resets {resetLabel}</span>
        </div>
        <div className="bill-usage-bars">
          <div>
            <div className="bill-usage-meta">
              <span className="bill-usage-label">Applications</span>
              <span className="bill-usage-val" style={{ color: atLimit ? 'var(--coral)' : nearLimit ? 'var(--mid)' : 'var(--ink)' }}>
                {isFree ? `${appsUsed} / ${FREE_APP_LIMIT}` : 'Unlimited'}
              </span>
            </div>
            <div className="bill-usage-track"><div className={`bill-usage-fill ${appFillCls}`} style={{ width: `${appPct}%` }} /></div>
            {atLimit ? (
              <div className="bill-usage-note crit"><i className="ti ti-alert-circle" /> Limit reached &mdash; upgrade to keep applying this month</div>
            ) : nearLimit ? (
              <div className="bill-usage-note warn"><i className="ti ti-alert-triangle" /> {FREE_APP_LIMIT - appsUsed} application{FREE_APP_LIMIT - appsUsed === 1 ? '' : 's'} remaining this month</div>
            ) : null}
          </div>
          <div>
            <div className="bill-usage-meta">
              <span className="bill-usage-label">Scan frequency</span>
              <span className="bill-usage-val">Every {scanHours}h</span>
            </div>
            <div className="bill-usage-track"><div className="bill-usage-fill" style={{ width: `${scanFill}%` }} /></div>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="bill-cmp">
        <div className="bill-cmp-head">
          <h3>Compare all plans</h3>
          <p>Every feature, side by side.</p>
        </div>
        <div className="bill-cmp-scroll">
          <table>
            <thead>
              <tr>
                <th>Feature</th>
                <th><span className="bill-cmp-pname">Free</span><span className="bill-cmp-pprice">&pound;0</span></th>
                <th className="feat-col"><span className="bill-cmp-pname">Pro</span><span className="bill-cmp-pprice">&pound;{PRICING.pro.monthly}/mo</span></th>
                <th><span className="bill-cmp-pname">Max</span><span className="bill-cmp-pprice">&pound;{PRICING.max.monthly}/mo</span></th>
              </tr>
            </thead>
            <tbody>
              {CMP_GROUPS.map(g => (
                <Fragment key={g.label}>
                  <tr className="bill-cmp-grp"><td colSpan={4}>{g.label}</td></tr>
                  {g.rows.map(([label, ...vals]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      {vals.map((v, i) => <td key={i}>{cmpCell(v)}</td>)}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
