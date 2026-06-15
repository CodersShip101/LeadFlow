'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Application } from '@/types'
import { PRICING, ENTITLEMENTS, type Tier } from '@/lib/tiers'
import toast from 'react-hot-toast'

// Order shown in the plan grid. Source of truth for names/prices is lib/tiers.ts.
const TIER_ORDER: Tier[] = ['free', 'pro', 'max', 'team']
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

// Full comparison grid. Columns: Free · Pro · Max · Team.
type CmpVal = boolean | string
const CMP_GROUPS: { label: string; rows: [string, CmpVal, CmpVal, CmpVal, CmpVal][] }[] = [
  {
    label: 'Lead feed',
    rows: [
      ['Scored lead feed', true, true, true, true],
      ['Applications / month', String(FREE_APP_LIMIT), '∞', '∞', '∞'],
      ['Direct source links', false, true, true, true],
      ['Auto-refresh', '5h', '2h', '1h', '1h'],
      ['Manual refresh', false, false, true, true],
    ],
  },
  {
    label: 'Insight',
    rows: [
      ['Daily email digest', false, true, true, true],
      ['Custom lead alerts', false, true, true, true],
      ['Basic analytics', false, true, true, true],
      ['Advanced analytics', false, false, true, true],
      ['CSV export', false, false, true, true],
      ['Adjustable scoring weights', false, false, true, true],
    ],
  },
  {
    label: 'Team',
    rows: [
      ['Shared lead pool', false, false, false, true],
      ['Team pipeline & assignment', false, false, false, true],
      ['Admin & member roles', false, false, false, true],
      ['Centralised billing', false, false, false, true],
    ],
  },
  {
    label: 'Support',
    rows: [
      ['Standard support', true, true, true, true],
      ['Priority support', false, false, true, true],
      ['Dedicated account manager', false, false, false, 'Enterprise'],
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
    const isTeam = t === 'team'
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
    } else if (isTeam) {
      const total = price * teamSeats
      priceBlock = (
        <>
          <div className="bpc-price-block">
            <div className="bpc-price">&pound;{price}<span className="per"> / seat{isAnnual ? ' · yr' : '/mo'}</span></div>
          </div>
          <div className="bill-seat">
            <div className="bill-seat-label">Team size</div>
            <div className="bill-seat-pick">
              <button onClick={() => setTeamSeats(s => Math.max(1, s - 1))} aria-label="Fewer seats">&minus;</button>
              <span className="bill-seat-n">{teamSeats}</span>
              <button onClick={() => setTeamSeats(s => Math.min(200, s + 1))} aria-label="More seats">+</button>
            </div>
            <div className="bill-seat-sum">Total: <b>&pound;{total}/mo</b> for {teamSeats} seat{teamSeats === 1 ? '' : 's'}</div>
          </div>
        </>
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
    } else if (isTeam) {
      cta = <button className="bill-cta bill-cta-warm" disabled={busy} onClick={() => handleUpgrade(t)}><i className="ti ti-users" /> Start Team &mdash; &pound;{price * teamSeats}/mo</button>
    } else if (featured) {
      cta = <button className="bill-cta bill-cta-warm" disabled={busy} onClick={() => handleUpgrade(t)}><i className="ti ti-crown" /> Upgrade to Pro</button>
    } else {
      cta = <button className="bill-cta bill-cta-primary" disabled={busy} onClick={() => handleUpgrade(t)}><i className="ti ti-arrow-right" /> Upgrade to {v.label}</button>
    }

    return (
      <div key={t} className={`bill-card${featured ? ' feat' : ''}${isTeam ? ' team-card' : ''}`}>
        {featured && <span className="bill-reco">MOST POPULAR</span>}
        <div className="bpc-tier">
          <span className="bpc-name">{v.label}</span>
          <span className="bpc-icon"><i className={`ti ${TIER_ICON[t]}`} /></span>
        </div>
        {priceBlock}
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
        {(featured || isTeam) && (
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

      {/* Plan cards */}
      <div className="bill-grid">
        {TIER_ORDER.map(renderCard)}
      </div>

      {/* Enterprise */}
      <div className="bill-ent">
        <div className="bill-ent-icon"><i className="ti ti-building" /></div>
        <div className="bill-ent-body">
          <h4>Need more than Team?</h4>
          <p>SSO, API access, a dedicated account manager, custom data retention, and 20&ndash;150+ seats. Quoted to fit your organisation.</p>
        </div>
        <a className="bill-ent-btn" href="mailto:sales@leadflow.dev?subject=Enterprise%20plan%20inquiry"><i className="ti ti-mail" /> Talk to us</a>
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
                <th><span className="bill-cmp-pname">Pro</span><span className="bill-cmp-pprice">&pound;{PRICING.pro.monthly}/mo</span></th>
                <th className="feat-col"><span className="bill-cmp-pname">Max</span><span className="bill-cmp-pprice">&pound;{PRICING.max.monthly}/mo</span></th>
                <th><span className="bill-cmp-pname">Team</span><span className="bill-cmp-pprice">&pound;{PRICING.team.monthly}/seat</span></th>
              </tr>
            </thead>
            <tbody>
              {CMP_GROUPS.map(g => (
                <Fragment key={g.label}>
                  <tr className="bill-cmp-grp"><td colSpan={5}>{g.label}</td></tr>
                  {g.rows.map(([label, f, p, m, tm]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{cmpCell(f)}</td>
                      <td>{cmpCell(p)}</td>
                      <td>{cmpCell(m)}</td>
                      <td>{cmpCell(tm)}</td>
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
