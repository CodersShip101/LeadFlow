'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import PricingCard from '@/components/PricingCard'

const tiers = [
  {
    name: 'Starter',
    price: 0,
    priceLabel: 'Free',
    description: 'For freelancers just getting started.',
    features: ['5 applications/month', 'Basic lead matching', 'Email support'],
    cta: 'Get started free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: 49,
    priceLabel: '£49/month',
    description: 'For serious freelancers ready to scale.',
    features: ['Unlimited applications', 'Advanced matching', 'Priority support', 'Source URLs revealed', 'Analytics dashboard'],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
]

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<'plans' | 'usage'>('plans')
  const [loading, setLoading] = useState(true)
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
      <div className="flex items-center gap-3" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  return (
    <div className="flex-1 dash-page">
      <div className="dash-header">
        <h1>Billing</h1>
      </div>

      <div className="flex gap-4 border-b mb-6" style={{ borderColor: 'var(--slate-200)' }}>
        {(['plans', 'usage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-2 text-sm font-medium capitalize transition-all"
            style={{ color: tab === t ? 'var(--lime-deep)' : 'var(--slate-500)', borderBottom: tab === t ? '2px solid var(--lime-deep)' : '2px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="grid md:grid-cols-2 gap-5 max-w-2xl">
          {tiers.map(tier => <PricingCard key={tier.name} tier={tier} />)}
        </div>
      )}

      {tab === 'usage' && (
        <div className="space-y-4 max-w-lg">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>Applications used</p>
              <span className="dash-badge-status" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>
                {profile?.subscription_status === 'free' ? '0/5' : 'Unlimited'}
              </span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--slate-200)' }}>
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: profile?.subscription_status === 'free' ? '0%' : '100%', background: 'var(--lime)' }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>Current plan</p>
            <p className="text-xs mt-1 capitalize" style={{ color: 'var(--slate-500)' }}>{profile?.subscription_status || 'Free'}</p>
            {profile?.subscription_status === 'free' && (
              <button onClick={() => setTab('plans')} className="btn-p btn-sm mt-3">Upgrade</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
