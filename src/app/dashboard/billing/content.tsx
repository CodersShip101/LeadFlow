'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'

const TIERS: Record<string, { name: string; m: number; a: number; blurb: string; perSeat?: boolean }> = {
  free: { name: 'Free', m: 0, a: 0, blurb: 'Try the scored feed and build a pipeline.' },
  pro: { name: 'Pro', m: 15, a: 12, blurb: 'For freelancers actively winning work.' },
  max: { name: 'Max', m: 49, a: 39, blurb: 'For optimising every lead and rate.' },
  team: { name: 'Team', m: 39, a: 32, blurb: 'For agencies and studios sharing a pipeline.', perSeat: true },
}

const TIER_ORDER = ['free', 'pro', 'max', 'team']

const FEATURES: Record<string, Array<[string, boolean, boolean, boolean, boolean]>> = {
  core: [
    ['Scored lead feed', true, true, true, true],
    ['Pipeline tracking', true, true, true, true],
    ['5 applications / month', true, false, false, false],
    ['Unlimited applications', false, true, true, true],
    ['Direct source links', false, true, true, true],
  ],
  insight: [
    ['Auto-refresh every 5h', true, false, false, false],
    ['Auto-refresh every 2h', false, true, false, false],
    ['Auto-refresh every 1h', false, false, true, true],
    ['Manual refresh (on login + on demand)', false, false, true, true],
    ['Daily email digest', false, true, true, true],
    ['Custom lead alerts', false, true, true, true],
    ['Basic analytics', false, true, true, true],
    ['CSV export', false, false, true, true],
    ['Adjustable scoring weights', false, false, true, true],
    ['Priority support', false, false, true, true],
  ],
  team: [
    ['Shared lead pool', false, false, false, true],
    ['Team pipeline visibility', false, false, false, true],
    ['Lead assignment', false, false, false, true],
    ['Admin / member roles', false, false, false, true],
    ['Centralised billing', false, false, false, true],
  ],
}

const FEATURE_GROUPS = [
  { key: 'core', label: 'Core' },
  { key: 'insight', label: 'Insight' },
  { key: 'team', label: 'Team' },
]

export default function BillingContent() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<'plans' | 'usage'>('plans')
  const [view, setView] = useState<'individuals' | 'teams'>('individuals')
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
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const plan = profile?.subscription_status ?? 'free'
  const isAnnual = cycle === 'annual'

  const price = (tier: string) => {
    const t = TIERS[tier]
    if (!t) return 0
    return isAnnual ? t.a : t.m
  }

  const priceLabel = (tier: string) => {
    const p = price(tier)
    if (tier === 'free') return '£0'
    if (tier === 'team') return `£${p * teamSeats}`
    return `£${p}`
  }

  const handleUpgrade = useCallback(async (tier: string) => {
    if (tier === 'free' || tier === plan) return
    setBusy(true)
    try {
      const body: Record<string, any> = { tier, cycle }
      if (tier === 'team') body.seats = teamSeats
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Something went wrong')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }, [cycle, teamSeats, plan])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center pt-16">
      <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  return (
    <div className="flex-1 dash-page max-w-4xl">
      <div className="dash-header">
        <h1>Plan & billing</h1>
      </div>

      <div className="tabs">
        {(['plans', 'usage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'on' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'plans' && (
        <>
          <div className="pc-toggle">
            <span style={{ opacity: isAnnual ? 0.5 : 1 }}>Monthly</span>
            <button className={`toggle ${isAnnual ? 'on' : ''}`} onClick={() => setCycle(isAnnual ? 'monthly' : 'annual')} />
            <span style={{ opacity: isAnnual ? 1 : 0.5 }}>Annual</span>
            <span className="save">&nbsp;&minus;20%</span>
          </div>

          <div className="tabs" style={{ marginBottom: 18 }}>
            <button onClick={() => setView('individuals')} className={`tab ${view === 'individuals' ? 'on' : ''}`}>
              <i className="ti ti-user" style={{ fontSize: 14, marginRight: 5 }} />For individuals
            </button>
            <button onClick={() => setView('teams')} className={`tab ${view === 'teams' ? 'on' : ''}`}>
              <i className="ti ti-users" style={{ fontSize: 14, marginRight: 5 }} />For teams
            </button>
          </div>

          {view === 'individuals' && (
            <>
              <div className="price-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {['free', 'pro', 'max'].map(key => {
                  const t = TIERS[key]
                  const isCurrent = key === plan
                  const featured = key === 'pro'
                  const cls = `price-card${featured ? ' feat' : ''}`

                  return (
                    <div key={key} className={cls}>
                      {featured && <span className="reco-pill">MOST POPULAR</span>}
                      <div className="pc-name">{t.name}</div>
                      <div className="pc-price">
                        {priceLabel(key)}
                        <span className="per">/mo</span>
                      </div>
                      <div className="pc-blurb">{t.blurb}</div>
                      <ul className="pc-feats">
                        {key === 'free' && (
                          <>
                            <li className="pc-feat"><i className="ti ti-check" />Scored lead feed</li>
                            <li className="pc-feat"><i className="ti ti-check" />Pipeline tracking</li>
                            <li className="pc-feat"><i className="ti ti-check" />5 applications / month</li>
                            <li className="pc-feat"><i className="ti ti-check" />Auto-refresh every 5h</li>
                          </>
                        )}
                        {key === 'pro' && (
                          <>
                            <li className="pc-feat"><i className="ti ti-check" />Everything in Free</li>
                            <li className="pc-feat"><i className="ti ti-check" />Unlimited applications</li>
                            <li className="pc-feat"><i className="ti ti-check" />Direct source links</li>
                            <li className="pc-feat"><i className="ti ti-check" />Auto-refresh every 2h</li>
                            <li className="pc-feat"><i className="ti ti-check" />Daily email digest</li>
                            <li className="pc-feat"><i className="ti ti-check" />Custom lead alerts</li>
                            <li className="pc-feat"><i className="ti ti-check" />Basic analytics</li>
                          </>
                        )}
                        {key === 'max' && (
                          <>
                            <li className="pc-feat"><i className="ti ti-check" />Everything in Pro</li>
                            <li className="pc-feat"><i className="ti ti-check" />Auto-refresh every 1h</li>
                            <li className="pc-feat"><i className="ti ti-check" />Manual refresh (login + on demand)</li>
                            <li className="pc-feat"><i className="ti ti-check" />Adjustable scoring weights</li>
                            <li className="pc-feat"><i className="ti ti-check" />Advanced analytics</li>
                            <li className="pc-feat"><i className="ti ti-check" />CSV export</li>
                            <li className="pc-feat"><i className="ti ti-check" />Priority support</li>
                          </>
                        )}
                      </ul>
                      <button
                        className={`btn ${featured ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ width: '100%', marginTop: 'auto' }}
                        disabled={isCurrent || busy}
                        onClick={() => handleUpgrade(key)}
                      >
                        {isCurrent ? 'Current plan' : key === 'free' ? 'Current plan' : `Upgrade — ${priceLabel(key)}/mo`}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="cmp-wrap">
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th></th>
                      {['free', 'pro', 'max'].map(k => (
                        <th key={k}>{TIERS[k].name}<span className="cmp-price">£{isAnnual ? TIERS[k].a : TIERS[k].m}</span></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {FEATURE_GROUPS.map(g => (
                      <Fragment key={g.key}>
                        <tr>
                          <td className="cmp-hdr" colSpan={4}>{g.label}</td>
                        </tr>
                        {FEATURES[g.key].map(([name, f, p, m]) => (
                          <tr key={name}>
                            <td>{name}</td>
                            <td>{f ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                            <td>{p ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                            <td>{m ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {view === 'teams' && (
            <>
              <div className="price-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {/* Team card */}
                <div className="price-card team">
                  <div className="pc-name">Team</div>
                  <div className="pc-price">
                    £{isAnnual ? TIERS.team.a : TIERS.team.m}
                    <span className="per">/mo</span>
                    <span className="per" style={{ fontSize: 11, marginLeft: 4 }}>/seat</span>
                  </div>
                  <div className="pc-blurb">{TIERS.team.blurb}</div>
                  <div className="seat-controls">
                    <label>Seats</label>
                    <button className="qb" onClick={() => setTeamSeats(s => Math.max(1, s - 1))}>&minus;</button>
                    <span className="qbv">{teamSeats}</span>
                    <button className="qb" onClick={() => setTeamSeats(s => Math.min(200, s + 1))}>+</button>
                  </div>
                  <ul className="pc-feats">
                    <li className="pc-feat"><i className="ti ti-check" />Everything in Max</li>
                    <li className="pc-feat"><i className="ti ti-check" />Auto-refresh every 1h</li>
                    <li className="pc-feat"><i className="ti ti-check" />Shared lead pool</li>
                    <li className="pc-feat"><i className="ti ti-check" />Team pipeline visibility</li>
                    <li className="pc-feat"><i className="ti ti-check" />Lead assignment</li>
                    <li className="pc-feat"><i className="ti ti-check" />Admin &amp; member roles</li>
                    <li className="pc-feat"><i className="ti ti-check" />Centralised billing</li>
                  </ul>
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 'auto' }}
                    disabled={plan === 'team' || busy}
                    onClick={() => handleUpgrade('team')}
                  >
                    {plan === 'team' ? 'Current plan' : `Start Team — £${(isAnnual ? TIERS.team.a : TIERS.team.m) * teamSeats}/mo`}
                  </button>
                </div>

                {/* Enterprise card */}
                <div className="price-card">
                  <div className="pc-name">Enterprise</div>
                  <div className="pc-price" style={{ fontSize: 22 }}>Custom</div>
                  <div className="pc-blurb">For organisations that need SSO, API access, dedicated support, and custom contracts.</div>
                  <ul className="pc-feats">
                    <li className="pc-feat"><i className="ti ti-check" />Everything in Team</li>
                    <li className="pc-feat"><i className="ti ti-check" />Single sign-on (SSO)</li>
                    <li className="pc-feat"><i className="ti ti-check" />API access</li>
                    <li className="pc-feat"><i className="ti ti-check" />Dedicated account manager</li>
                    <li className="pc-feat"><i className="ti ti-check" />Custom data retention</li>
                    <li className="pc-feat"><i className="ti ti-check" />5&ndash;150+ users</li>
                  </ul>
                  <a
                    href="mailto:sales@leadflow.dev?subject=Enterprise%20plan%20inquiry"
                    className="btn btn-ghost"
                    style={{ width: '100%', marginTop: 'auto', textAlign: 'center', textDecoration: 'none' }}
                  >
                    Contact sales
                  </a>
                </div>
              </div>

              <div className="cmp-wrap">
                <table className="cmp-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Team<span className="cmp-price">£{isAnnual ? TIERS.team.a : TIERS.team.m}/seat</span></th>
                      <th>Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="cmp-hdr" colSpan={3}>Team</td>
                    </tr>
                    {([
                      ['Shared lead pool', true, true] as [string, boolean, boolean],
                      ['Team pipeline visibility', true, true] as [string, boolean, boolean],
                      ['Lead assignment', true, true] as [string, boolean, boolean],
                      ['Admin / member roles', true, true] as [string, boolean, boolean],
                      ['Centralised billing', true, true] as [string, boolean, boolean],
                      ['Per-seat pricing', true, false] as [string, boolean, boolean],
                      ['Custom seat count (5&ndash;150+)', false, true] as [string, boolean, boolean],
                    ]).map(([name, tOK, eOK]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{tOK ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                        <td>{eOK ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="cmp-hdr" colSpan={3}>Enterprise</td>
                    </tr>
                    {([
                      ['Everything in Team', true, true] as [string, boolean, boolean],
                      ['Single sign-on (SSO)', false, true] as [string, boolean, boolean],
                      ['API access', false, true] as [string, boolean, boolean],
                      ['Dedicated account manager', false, true] as [string, boolean, boolean],
                      ['Custom data retention controls', false, true] as [string, boolean, boolean],
                      ['Audit logs & compliance', false, true] as [string, boolean, boolean],
                      ['IP allowlisting', false, true] as [string, boolean, boolean],
                    ]).map(([name, t2, e2]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td>{t2 ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                        <td>{e2 ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {tab === 'usage' && (
        <div className="section-card">
          <div className="dp-section-label" style={{ marginTop: 0 }}>This month&apos;s usage</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, background: 'var(--lime)',
                  width: plan === 'free' ? '40%' : '100%',
                  transition: 'width .5s'
                }} />
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
              {plan === 'free' ? '2 / 5 applications' : 'Unlimited'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
