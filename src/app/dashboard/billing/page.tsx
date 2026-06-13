'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'

const tiers = [
  {
    name: 'Starter',
    price: 0,
    priceLabel: '£0',
    features: ['Full scored feed', '5 applications / month', 'Pipeline tracking', 'Source links hidden', 'No analytics'],
    cta: 'Current plan',
    pro: false,
  },
  {
    name: 'Pro',
    price: 49,
    priceLabel: '£49',
    features: ['Everything in Starter', 'Unlimited applications', 'Direct source links', 'Pipeline analytics', 'Priority support'],
    cta: 'Upgrade — £49/mo',
    pro: true,
  },
]

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<'plans' | 'usage'>('plans')
  const [loading, setLoading] = true ? useState(true) : useState(false)
  const router = useRouter()
  const supabase = createClient()

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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center pt-16">
      <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  return (
    <div className="flex-1 dash-page max-w-3xl">
      <div className="dash-header">
        <h1>Plan & billing</h1>
      </div>

      <div className="tabs">
        {(['plans', 'usage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'on' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="price-grid">
          {tiers.map(tier => (
            <div key={tier.name} className={`price-card ${tier.pro ? 'pro' : ''}`}>
              {tier.pro && <span className="reco-pill">RECOMMENDED</span>}
              <div className="pc-name">{tier.name}</div>
              <div className="pc-price">{tier.priceLabel}<span className="per">/month</span></div>
              <ul className="pc-feats">
                {tier.features.map(f => (
                  <li key={f} className="pc-feat">
                    <i className={`ti ti-${tier.pro ? 'check' : 'check'}`} />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`btn ${tier.pro ? 'btn-primary' : 'btn-ghost'}`} style={{ width: '100%' }}
                disabled={!tier.pro && profile?.subscription_status !== 'pro'}>
                {tier.pro ? (profile?.subscription_status === 'pro' ? 'Current plan' : tier.cta) : 'Current plan'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'usage' && (
        <div className="section-card">
          <div className="dp-section-label" style={{ marginTop: 0 }}>This month&apos;s usage</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, background: 'var(--lime)',
                  width: profile?.subscription_status === 'pro' ? '100%' : '40%',
                  transition: 'width .5s'
                }} />
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
              {profile?.subscription_status === 'pro' ? 'Unlimited' : '2 / 5 applications'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
