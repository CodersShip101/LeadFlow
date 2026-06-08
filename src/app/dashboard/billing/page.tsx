'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'
import { Check, Lock, Loader2, ArrowLeft } from 'lucide-react'

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const justPaid = params.get('success') === 'true'

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      if (justPaid) {
        setProcessing(true)
        let tries = 0
        while (tries < 15) {
          await new Promise(r => setTimeout(r, 2000))
          const { data } = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
          if (data?.subscription_status === 'pro') {
            setProcessing(false)
            toast.success('Welcome to Pro!')
            router.replace('/dashboard/billing')
            return
          }
          tries++
        }
        setProcessing(false)
        toast.error('Subscription update is taking longer. Refresh the page.')
      }

      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', { method: 'POST' })
      const data = await response.json()
      if (data.url) router.push(data.url)
      else toast.error('Something went wrong.')
    } catch { toast.error('Failed to initiate checkout.') }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="animate-spin h-8 w-8 border-4 rounded-full" style={{ borderColor: '#1B6B4A', borderTopColor: 'transparent' }} />
    </div>
  )

  if (processing) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="text-center">
        <Loader2 size={28} className="animate-spin mx-auto" style={{ color: '#1B6B4A' }} />
        <p className="mt-3 text-sm" style={{ color: '#6B7280' }}>Processing your payment...</p>
      </div>
    </div>
  )

  const isPro = profile?.subscription_status === 'pro'

  const plans = [
    {
      name: 'Free',
      price: '£0',
      period: 'forever',
      description: 'Try before you commit. See what we offer.',
      features: [
        { text: '3 leads per week', included: true },
        { text: 'Basic lead details', included: true },
        { text: 'Email notifications', included: true },
        { text: 'Full lead details & source URLs', included: false },
        { text: 'Skill-based filtering', included: false },
        { text: 'Early access to new leads', included: false },
        { text: 'Priority matching', included: false },
      ],
      cta: isPro ? 'Current plan' : 'Get Started Free',
      highlighted: false,
      onClick: () => {},
    },
    {
      name: 'Pro',
      price: '£49',
      period: '/month',
      description: 'For serious freelancers who want consistent work.',
      features: [
        { text: 'Unlimited leads', included: true },
        { text: 'Full lead details & source URLs', included: true },
        { text: 'Email notifications', included: true },
        { text: 'Skill-based filtering', included: true },
        { text: 'Early access to new leads', included: true },
        { text: 'Priority matching', included: true },
        { text: 'Cancel anytime', included: true },
      ],
      cta: isPro ? 'Current plan' : 'Upgrade to Pro',
      highlighted: true,
      onClick: isPro ? () => {} : handleUpgrade,
    },
  ]

  return (
    <div className="min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-medium mb-5 transition-colors hover:opacity-80"
          style={{ color: '#6B7280' }}>
          <ArrowLeft size={13} /> Dashboard
        </button>

        <h1 className="text-lg font-bold mb-6" style={{ color: '#1A1D23' }}>Billing</h1>

        <div className="grid md:grid-cols-2 gap-4">
          {plans.map(plan => (
            <div key={plan.name}
              className="bg-white rounded-xl p-6 flex flex-col"
              style={{
                border: plan.highlighted ? '1px solid #1B6B4A' : '1px solid #ECEEF2',
                background: plan.highlighted ? '#F0FDF7' : '#FFFFFF',
              }}>
              <h3 className="text-base font-bold" style={{ color: '#1A1D23' }}>{plan.name}</h3>
              <div className="mt-2">
                <span className="text-2xl font-bold" style={{ color: '#1A1D23' }}>{plan.price}</span>
                <span className="text-xs ml-1" style={{ color: '#9CA3AF' }}>{plan.period}</span>
              </div>
              <p className="text-xs mt-1 flex-1" style={{ color: '#6B7280' }}>{plan.description}</p>
              <ul className="mt-4 space-y-2">
                {plan.features.map(f => (
                  <li key={f.text} className="flex items-center gap-2 text-xs" style={{ color: f.included ? '#4B5563' : '#AAB0BB' }}>
                    {f.included ? (
                      <Check size={13} style={{ color: '#1B6B4A' }} />
                    ) : (
                      <Lock size={11} style={{ color: '#D0D4DE' }} />
                    )}
                    {f.text}
                  </li>
                ))}
              </ul>
              <button onClick={plan.onClick}
                disabled={isPro && plan.highlighted}
                className="w-full mt-5 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{
                  background: plan.highlighted ? '#1B6B4A' : '#F5F5F7',
                  color: plan.highlighted ? 'white' : '#6B7280',
                }}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
