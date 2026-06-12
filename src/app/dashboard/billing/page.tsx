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
      <div className="flex items-center gap-2" style={{ color: 'var(--slate)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--amber)' }} /> Loading...
      </div>
    </div>
  )

  return (
    <div className="flex-1 px-4 md:px-8 pt-6 pb-20 md:pb-8 max-w-3xl">
      <h1 className="text-lg font-bold" style={{ color: 'var(--cream)' }}>Billing</h1>

      <div className="flex gap-4 border-b mt-4 mb-6" style={{ borderColor: 'var(--border)' }}>
        {(['plans', 'usage'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-2 text-sm font-medium capitalize transition-all"
            style={{ color: tab === t ? 'var(--amber)' : 'var(--slate)', borderBottom: tab === t ? '2px solid var(--amber)' : '2px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'plans' && (
        <div className="grid md:grid-cols-2 gap-4">
          {tiers.map(tier => <PricingCard key={tier.name} tier={tier} />)}
        </div>
      )}

      {tab === 'usage' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Applications used</p>
              <span className="text-xs font-semibold" style={{ color: 'var(--green-score)' }}>{profile?.subscription_status === 'free' ? '0/5' : 'Unlimited'}</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: 'var(--ink-3)' }}>
              <div className="h-2 rounded-full" style={{ width: profile?.subscription_status === 'free' ? '0%' : '100%', background: 'var(--amber)', transition: 'width 0.4s ease' }} />
            </div>
          </div>
          <div className="card">
            <p className="text-sm font-medium" style={{ color: 'var(--cream)' }}>Current plan</p>
            <p className="text-xs mt-1 capitalize" style={{ color: 'var(--slate)' }}>{profile?.subscription_status || 'Free'}</p>
            {profile?.subscription_status === 'free' && (
              <button onClick={() => setTab('plans')} className="btn-p text-xs mt-3">Upgrade</button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
