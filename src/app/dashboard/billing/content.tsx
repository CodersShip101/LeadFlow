'use client'

import { useEffect, useState, useCallback, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import toast from 'react-hot-toast'

const TIERS: Record<string, { name: string; m: number; a: number; blurb: string; perSeat?: boolean }> = {
  free: { name: 'Free', m: 0, a: 0, blurb: 'Try the scored feed and build a pipeline.' },
  starter: { name: 'Starter', m: 15, a: 12, blurb: 'For freelancers actively winning work.' },
  pro: { name: 'Pro', m: 49, a: 39, blurb: 'For optimising every lead and rate.' },
  team: { name: 'Team', m: 39, a: 32, blurb: 'For agencies and studios sharing a pipeline.', perSeat: true },
}

const TIER_ORDER = ['free', 'starter', 'pro', 'team']

const FEATURES: Record<string, Array<[string, boolean, boolean, boolean, boolean]>> = {
  core: [
    ['Scored lead feed', true, true, true, true],
    ['Pipeline tracking', true, true, true, true],
    ['5 applications / month', true, false, false, false],
    ['Unlimited applications', false, true, true, true],
    ['Direct source links', false, true, true, true],
  ],
  insight: [
    ['Daily email digest', false, true, true, true],
    ['Custom lead alerts', false, true, true, true],
    ['Basic analytics', false, true, true, true],
    ['CSV export', false, false, true, true],
    ['Adjustable scoring weights', false, false, true, true],
    ['Priority 3h scanning', false, false, true, true],
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
      const labels: Record<string, string> = { starter: 'Starter', pro: 'Pro', team: 'Team' }
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

          <div className="price-grid">
            {TIER_ORDER.map(key => {
              const t = TIERS[key]
              const isFree = key === 'free'
              const isTeam = key === 'team'
              const isCurrent = key === plan
              const featured = key === 'pro'
              const cls = `price-card${featured ? ' feat' : ''}${isTeam ? ' team' : ''}`

              return (
                <div key={key} className={cls}>
                  {featured && <span className="reco-pill">MOST POPULAR</span>}
                  <div className="pc-name">{t.name}</div>
                  <div className="pc-price">
                    {priceLabel(key)}
                    <span className="per">/mo</span>
                    {isTeam && <span className="per" style={{ fontSize: 11, marginLeft: 4 }}>/seat</span>}
                  </div>
                  <div className="pc-blurb">{t.blurb}</div>

                  {isTeam && (
                    <div className="seat-controls">
                      <label>Seats</label>
                      <button className="qb" onClick={() => setTeamSeats(s => Math.max(1, s - 1))}>&minus;</button>
                      <span className="qbv">{teamSeats}</span>
                      <button className="qb" onClick={() => setTeamSeats(s => Math.min(200, s + 1))}>+</button>
                    </div>
                  )}

                  <ul className="pc-feats">
                    {key === 'free' && (
                      <>
                        <li className="pc-feat"><i className="ti ti-check" />Scored lead feed</li>
                        <li className="pc-feat"><i className="ti ti-check" />Pipeline tracking</li>
                        <li className="pc-feat"><i className="ti ti-check" />5 applications / month</li>
                      </>
                    )}
                    {key === 'starter' && (
                      <>
                        <li className="pc-feat"><i className="ti ti-check" />Everything in Free</li>
                        <li className="pc-feat"><i className="ti ti-check" />Unlimited applications</li>
                        <li className="pc-feat"><i className="ti ti-check" />Direct source links</li>
                        <li className="pc-feat"><i className="ti ti-check" />Daily email digest</li>
                        <li className="pc-feat"><i className="ti ti-check" />Custom lead alerts</li>
                        <li className="pc-feat"><i className="ti ti-check" />Basic analytics</li>
                      </>
                    )}
                    {key === 'pro' && (
                      <>
                        <li className="pc-feat"><i className="ti ti-check" />Everything in Starter</li>
                        <li className="pc-feat"><i className="ti ti-check" />Adjustable scoring weights</li>
                        <li className="pc-feat"><i className="ti ti-check" />Priority 3h scanning</li>
                        <li className="pc-feat"><i className="ti ti-check" />Advanced analytics</li>
                        <li className="pc-feat"><i className="ti ti-check" />CSV export</li>
                        <li className="pc-feat"><i className="ti ti-check" />Priority support</li>
                      </>
                    )}
                    {key === 'team' && (
                      <>
                        <li className="pc-feat"><i className="ti ti-check" />Everything in Pro</li>
                        <li className="pc-feat"><i className="ti ti-check" />Shared lead pool</li>
                        <li className="pc-feat"><i className="ti ti-check" />Team pipeline</li>
                        <li className="pc-feat"><i className="ti ti-check" />Lead assignment</li>
                        <li className="pc-feat"><i className="ti ti-check" />Admin &amp; member roles</li>
                      </>
                    )}
                  </ul>

                  <button
                    className={`btn ${featured ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ width: '100%', marginTop: 'auto' }}
                    disabled={isCurrent || busy}
                    onClick={() => handleUpgrade(key)}
                  >
                    {isCurrent ? 'Current plan' : isTeam ? `Start Team — ${priceLabel(key)}/mo` : isFree ? 'Current plan' : `Upgrade — ${priceLabel(key)}/mo`}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="cmp-enterprise">
            Need SSO, API access, or 20+ seats? <a href="mailto:sales@leadflow.dev" style={{ color: 'var(--lime-deep)', fontWeight: 600, textDecoration: 'underline' }}>Contact us about Enterprise</a>.
          </div>

          <div className="cmp-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th></th>
                  {TIER_ORDER.map(k => (
                    <th key={k}>{TIERS[k].name}<span className="cmp-price">£{isAnnual ? TIERS[k].a : TIERS[k].m}{TIERS[k].perSeat ? '/seat' : ''}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map(g => (
                  <Fragment key={g.key}>
                    <tr>
                      <td className="cmp-hdr" colSpan={5}>{g.label}</td>
                    </tr>
                    {FEATURES[g.key].map(([name, ...vals]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        {vals.map((v, i) => (
                          <td key={i}>{v ? <span className="cmp-yes">&#10003;</span> : <span className="cmp-no">&mdash;</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
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
