'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

type Tab = 'plans' | 'usage'

const plans = [
  { id: 'free', name: 'Free', price: 0, desc: '3 leads per week. Basic matching.', features: ['3 leads/week', 'Basic matching', 'UK leads', 'Email alerts'] },
  { id: 'pro', name: 'Pro', price: 29, desc: 'Unlimited leads. Priority AI matching.', features: ['Unlimited leads', 'Priority AI matching', 'Advanced filters', 'Pipeline management', 'Analytics', 'Email + Slack'], popular: true },
  { id: 'growth', name: 'Growth', price: 49, desc: 'For teams. Up to 5 seats.', features: ['Everything in Pro', '5 team seats', 'Shared pipeline', 'API access', 'Dedicated support'] },
]

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [tab, setTab] = useState<Tab>('plans')
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

  const handleUpgrade = async (priceId: string) => {
    setProcessing(true)
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price_id: priceId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else { toast.error('Something went wrong'); setProcessing(false) }
  }

  const usagePercent = 3
  const weeklyUsed = 3

  if (loading) return (
    <div className="pb-20 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="px-4 md:px-8 pt-6 space-y-3">
        <div className="h-7 w-28 skel" /><div className="h-4 w-40 skel" />
      </div>
    </div>
  )

  return (
    <div className="flex-1 pb-24 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm mb-4">
          <i className="ti ti-arrow-left" /> Feed
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Billing</h1>
        <p className="text-xs mt-1 mb-6" style={{ color: '#9CA3AF' }}>Manage your subscription and usage.</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 card p-1" style={{ maxWidth: '200px' }}>
          {(['plans', 'usage'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 text-xs font-medium py-1.5 px-4 rounded-lg transition-all ${
                tab === t ? 'bg-[#1B6B4A] text-white' : 'text-[#6B7280] hover:text-[#111827]'
              }`}>
              {t === 'plans' ? 'Plans' : 'Usage'}
            </button>
          ))}
        </div>

        {tab === 'plans' ? (
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map(plan => {
              const isCurrent = (plan.id === 'free' && profile?.subscription_status === 'free') ||
                (plan.id === 'pro' && profile?.subscription_status === 'pro')
              return (
                <div key={plan.id} className={`card p-5 flex flex-col ${plan.popular ? 'border-2' : ''}`}
                  style={{ borderColor: plan.popular ? '#1B6B4A' : '#E5E7EB' }}>
                  {plan.popular && (
                    <div className="self-start px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider text-white mb-3" style={{ background: '#1B6B4A' }}>
                      POPULAR
                    </div>
                  )}
                  <h3 className="text-base font-semibold" style={{ color: '#111827' }}>{plan.name}</h3>
                  <p className="mt-2">
                    <span className="text-3xl font-bold" style={{ color: '#111827' }}>
                      {plan.price === 0 ? 'Free' : `£${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>/mo</span>}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{plan.desc}</p>
                  <ul className="mt-4 space-y-2 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs" style={{ color: '#6B7280' }}>
                        <i className="ti ti-circle-check" style={{ fontSize: '13px', color: '#059669' }} />{f}
                      </li>
                    ))}
                  </ul>
                  {isCurrent ? (
                    <div className="text-xs font-semibold text-center py-2.5 mt-4 rounded-lg" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                      Current plan
                    </div>
                  ) : (
                    <button onClick={() => handleUpgrade(plan.id)}
                      disabled={processing}
                      className={plan.popular ? 'btn-primary w-full justify-center mt-4' : 'btn-secondary w-full justify-center mt-4'}>
                      {processing ? 'Processing...' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#111827' }}>This week</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold" style={{ color: '#111827' }}>{weeklyUsed}</span>
              <span className="text-sm mb-1" style={{ color: '#9CA3AF' }}>of {profile?.subscription_status === 'pro' ? '∞' : '3'} leads used</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ background: '#1B6B4A', width: `${Math.min(usagePercent, 100)}%` }} />
            </div>
            {profile?.subscription_status === 'free' && (
              <button onClick={() => handleUpgrade('pro')} disabled={processing}
                className="btn-primary-sm mt-4">
                Upgrade to unlimited
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
