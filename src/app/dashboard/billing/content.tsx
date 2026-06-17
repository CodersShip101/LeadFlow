'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile, Application } from '@/types'
import { PRICING, ENTITLEMENTS, TIER_ICONS, planFeatures, type Tier } from '@/lib/tiers'
import SeatControl from '@/components/SeatControl'
import toast from 'react-hot-toast'

const TIER_ORDER: Tier[] = ['free', 'pro', 'max', 'team']
const FREE_APP_LIMIT = ENTITLEMENTS.free.applicationsPerMonth as number

type CmpVal = boolean | string
const CMP_GROUPS: { label: string; rows: [string, CmpVal, CmpVal, CmpVal, CmpVal][] }[] = [
  { label: 'Lead feed', rows: [
    ['Scored lead feed', true, true, true, true],
    ['Applications / month', String(FREE_APP_LIMIT), '∞', '∞', '∞'],
    ['Direct source links', false, true, true, true],
    ['Scan frequency', '5h', '2h', '1h', '1h'],
    ['Manual refresh', false, false, true, true],
  ]},
  { label: 'Insight', rows: [
    ['Daily email digest', false, true, true, true],
    ['Custom lead alerts', false, true, true, true],
    ['Basic analytics', false, true, true, true],
    ['Advanced analytics', false, false, true, true],
    ['CSV export', false, false, true, true],
    ['Adjustable scoring weights', false, false, true, true],
  ]},
  { label: 'Team', rows: [
    ['Shared lead pool', false, false, false, true],
    ['Team pipeline & assignment', false, false, false, true],
    ['Admin & member roles', false, false, false, true],
    ['Centralised billing', false, false, false, true],
  ]},
  { label: 'Support', rows: [
    ['Standard support', true, true, true, true],
    ['Priority support', false, false, true, true],
    ['Dedicated account manager', false, false, false, 'Enterprise'],
  ]},
]

const FAQS = [
  { q: 'Can I cancel before Day 7?', a: 'Yes — one click in account settings. You pay nothing and keep access until the trial ends.' },
  { q: 'What payment methods do you accept?', a: 'All major cards via Stripe. No PayPal, no invoicing on paid plans (enterprise excepted).' },
  { q: 'What if I don\'t use it much?', a: 'Downgrade or cancel any time. There\'s no minimum term on monthly plans.' },
]

export default function BillingContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appsUsed, setAppsUsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<'monthly' | 'annual'>('monthly')
  const [teamSeats, setTeamSeats] = useState(2)
  const [busy, setBusy] = useState(false)
  const [cmpOpen, setCmpOpen] = useState(false)
  const router = useRouter()
  const sp = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const upgraded = sp.get('upgraded')
    if (upgraded) {
      const label = PRICING[upgraded as Tier]?.label || upgraded
      toast.success(`Welcome to ${label}!`)
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
      } catch { /* ignore */ }
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
    } catch { toast.error('Network error') }
    finally { setBusy(false) }
  }, [cycle, teamSeats, plan, busy])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 14 }}>Loading&hellip;</span>
    </div>
  )

  const curName = PRICING[plan]?.label || 'Free'
  const curIdx = TIER_ORDER.indexOf(plan)
  const isFree = plan === 'free'
  const appsLeft = FREE_APP_LIMIT - appsUsed
  const atLimit = isFree && appsUsed >= FREE_APP_LIMIT
  const nearLimit = isFree && appsLeft <= 1 && !atLimit
  const appPct = isFree ? Math.min(100, Math.round((appsUsed / FREE_APP_LIMIT) * 100)) : 100
  const appFillCls = atLimit ? 'crit' : nearLimit ? 'warn' : ''
  const scanHours = ENTITLEMENTS[plan]?.scanIntervalHours ?? 5
  const scanFill = scanHours <= 1 ? 100 : scanHours <= 2 ? 66 : 33
  const resetLabel = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  // Annual savings in £ for the featured plan
  const proMonthly = PRICING.max.monthly ?? 0
  const proAnnual = PRICING.max.annual ?? 0
  const annualSaving = (proMonthly - proAnnual) * 12

  const cmpCell = (v: CmpVal) =>
    v === true ? <span className="bill-cmp-yes">&#10003;</span>
      : v === false ? <span className="bill-cmp-no">&mdash;</span>
      : <span className="bill-cmp-val">{v}</span>

  const renderCard = (t: Tier) => {
    const v = PRICING[t]
    const isCurrent = plan === t
    const featured = t === 'max'
    const isTeam = t === 'team'
    const idx = TIER_ORDER.indexOf(t)
    const isDowngrade = idx < curIdx
    const price = priceOf(t)
    const wasPrice = isAnnual ? v.monthly : null
    const savePct = isAnnual && wasPrice ? Math.round((1 - price / wasPrice) * 100) : null

    let priceBlock
    if (t === 'free') {
      priceBlock = <div className="bpc-price-block"><div className="bpc-price">&pound;0<span className="per"> / month</span></div></div>
    } else if (isTeam) {
      priceBlock = (
        <>
          <div className="bpc-price-block">
            <div className="bpc-price">&pound;{price}<span className="per"> / seat{isAnnual ? ' · yr' : '/mo'}</span></div>
          </div>
          <SeatControl seats={teamSeats} setSeats={setTeamSeats} price={price} />
        </>
      )
    } else {
      priceBlock = (
        <div className="bpc-price-block">
          <div className="bpc-price-row">
            {wasPrice && <span className="bpc-was">&pound;{wasPrice}</span>}
            <div className="bpc-price">&pound;{price}<span className="per">/mo</span></div>
            {savePct && <span className="bpc-save-badge">–{savePct}%</span>}
          </div>
          {isAnnual && <div className="bpc-annual-note">billed annually</div>}
        </div>
      )
    }

    let cta
    if (isCurrent) {
      cta = <div className="bill-cta bill-cta-current"><i className="ti ti-circle-check" /> Your current plan</div>
    } else if (t === 'free') {
      cta = <button className="bill-cta bill-cta-ghost" disabled>Base plan</button>
    } else if (isDowngrade) {
      cta = <button className="bill-cta bill-cta-ghost" disabled={busy} onClick={() => handleUpgrade(t)}>Switch to {v.label}</button>
    } else {
      const isWarm = featured || isTeam
      cta = (
        <div className="bill-cta-stack">
          <button className={`bill-cta ${isWarm ? 'bill-cta-warm' : 'bill-cta-primary'}`} disabled={busy} onClick={() => handleUpgrade(t)}>
            <i className={`ti ${isTeam ? 'ti-users' : featured ? 'ti-bolt' : 'ti-arrow-right'}`} /> Start my free trial
          </button>
          <span className="bill-cta-sub">2 steps · &pound;{isTeam ? price * teamSeats : price}/mo after Day 7</span>
        </div>
      )
    }

    return (
      <div key={t} className={`bill-card${featured ? ' feat' : ''}${isTeam ? ' team-card' : ''}`}>
        {featured && <span className="bill-reco">MOST POPULAR</span>}
        <div className="bpc-tier">
          <span className="bpc-name">{v.label}</span>
          <span className="bpc-icon"><i className={`ti ${TIER_ICONS[t]}`} /></span>
        </div>
        {priceBlock}
        <p className="bpc-blurb">{v.blurb}</p>
        <div className="bpc-divider" />
        <ul className="bpc-feats">
          {planFeatures(t).map(f => (
            <li key={f.txt} className={`bpc-feat${f.muted ? ' muted' : ''}`}>
              <span className="bpc-fi"><i className={`ti ${f.muted ? 'ti-minus' : 'ti-check'}`} /></span>
              <span>{f.txt}</span>
            </li>
          ))}
        </ul>
        {cta}
        {!isCurrent && t !== 'free' && !isDowngrade && (
          <div className="bill-social-proof">
            <i className="ti ti-users" /> Join 340+ UK freelancers on a paid plan
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex-1 dash-page bill-page">

      {/* ── HEADER with context nudge ── */}
      <div className="bill-header">
        <div>
          <h1>Plan &amp; billing</h1>
          <p>You&apos;re on <span className="hl">{curName}</span>.</p>
        </div>
        {/* Context nudge — shows what's happening right now */}
        {isFree && (
          <div className={`bill-nudge ${atLimit ? 'crit' : nearLimit ? 'warn' : ''}`}>
            {atLimit
              ? <><i className="ti ti-alert-circle" /> You&apos;ve used all {FREE_APP_LIMIT} applications this month — upgrade to keep going.</>
              : nearLimit
              ? <><i className="ti ti-alert-triangle" /> Only {appsLeft} application left this month. Upgrade for unlimited.</>
              : <><i className="ti ti-info-circle" /> You have {appsLeft} of {FREE_APP_LIMIT} applications left this month.</>}
          </div>
        )}
      </div>

      {/* ── CYCLE TOGGLE with specific saving ── */}
      <div className="cycle-row">
        <div className="bill-toggle">
          <button className={isAnnual ? '' : 'on'} onClick={() => setCycle('monthly')}>Monthly</button>
          <button className={isAnnual ? 'on' : ''} onClick={() => setCycle('annual')}>Annual</button>
        </div>
        <span className="save-badge" style={{ opacity: isAnnual ? 1 : 0.45 }}>
          <i className="ti ti-tag" />Save &pound;{annualSaving}/yr on Pro &mdash; pay annually
        </span>
      </div>

      {/* ── PLAN CARDS ── */}
      <div className="tier-ladder">
        {TIER_ORDER.map(renderCard)}
      </div>

      {/* ── TRIAL TIMELINE ── */}
      <aside className="bill-trial-aside">
        <h3 className="bill-trial-aside-title">How your free trial works</h3>
        <div className="trial-timeline">
          <div className="trial-step">
            <div className="trial-day">Today</div>
            <div className="trial-rail" aria-hidden="true"><span className="trial-dot amber" /><span className="trial-line" /></div>
            <p className="trial-desc"><strong>You unlock your plan in full.</strong> Unlimited leads, direct source links, skill filtering — all of it, the moment you sign up.</p>
          </div>
          <div className="trial-step">
            <div className="trial-day">Day 5</div>
            <div className="trial-rail" aria-hidden="true"><span className="trial-dot lime" /><span className="trial-line" /></div>
            <p className="trial-desc hl"><strong>We email you a reminder — before any charge.</strong> Two full days before the trial ends, so you can decide on your own terms. We&apos;d rather remind you than surprise you.</p>
          </div>
          <div className="trial-step">
            <div className="trial-day">Day 7</div>
            <div className="trial-rail" aria-hidden="true"><span className="trial-dot" /></div>
            <p className="trial-desc"><strong>Your first charge, only if you stay.</strong> Cancel any time before then and you pay nothing. One click in your account settings.</p>
          </div>
        </div>
        <div className="bill-trial-shield">
          <i className="ti ti-shield-check" /> No surprises. We will always warn you before charging.
        </div>
      </aside>

      {/* ── FAQ ── */}
      <div className="bill-faq">
        <h3 className="bill-faq-title">Common questions</h3>
        <div className="bill-faq-list">
          {FAQS.map(f => (
            <div key={f.q} className="bill-faq-row">
              <p className="bill-faq-q"><i className="ti ti-help-circle" />{f.q}</p>
              <p className="bill-faq-a">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ENTERPRISE ── */}
      <div className="bill-ent">
        <div className="bill-ent-icon"><i className="ti ti-building" /></div>
        <div className="bill-ent-body">
          <h4>Need more than Team?</h4>
          <p>SSO, API access, a dedicated account manager, custom data retention, and 20&ndash;150+ seats. Quoted to fit your organisation.</p>
        </div>
        <a className="bill-ent-btn" href="mailto:sales@leadflow.dev?subject=Enterprise%20plan%20inquiry"><i className="ti ti-mail" /> Talk to us</a>
      </div>

      {/* ── USAGE ── */}
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
            {atLimit && <div className="bill-usage-note crit"><i className="ti ti-alert-circle" /> Limit reached — upgrade to keep applying this month</div>}
            {nearLimit && <div className="bill-usage-note warn"><i className="ti ti-alert-triangle" /> {appsLeft} application{appsLeft === 1 ? '' : 's'} remaining</div>}
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

      {/* ── COMPARISON TABLE (collapsible) ── */}
      <div className="bill-cmp">
        <button className="bill-cmp-toggle" onClick={() => setCmpOpen(v => !v)}>
          <span>Compare all plans in detail</span>
          <i className={`ti ${cmpOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
        </button>
        {cmpOpen && (
          <div className="bill-cmp-scroll">
            <table>
              <thead>
                <tr>
                  <th>Feature</th>
                  <th><span className="bill-cmp-pname">{PRICING.free.label}</span><span className="bill-cmp-pprice">&pound;0</span></th>
                  <th><span className="bill-cmp-pname">{PRICING.pro.label}</span><span className="bill-cmp-pprice">&pound;{PRICING.pro.monthly}/mo</span></th>
                  <th className="feat-col"><span className="bill-cmp-pname">{PRICING.max.label}</span><span className="bill-cmp-pprice">&pound;{PRICING.max.monthly}/mo</span></th>
                  <th><span className="bill-cmp-pname">{PRICING.team.label}</span><span className="bill-cmp-pprice">&pound;{PRICING.team.monthly}/seat</span></th>
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
        )}
      </div>

    </div>
  )
}
