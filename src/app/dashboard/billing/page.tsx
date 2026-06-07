'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { getStripePublishableKey } from '@/lib/stripe'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

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
      if (!user) {
        router.push('/auth/login')
        return
      }

      if (justPaid) {
        setProcessing(true)
        let tries = 0
        while (tries < 15) {
          await new Promise(r => setTimeout(r, 2000))
          const { data } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single()
          if (data?.subscription_status === 'pro') {
            setProcessing(false)
            toast.success('Welcome to Pro!')
            router.replace('/dashboard/billing')
            return
          }
          tries++
        }
        setProcessing(false)
        toast.error('Subscription update is taking longer than expected. Refresh the page.')
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }

    load()
  }, [supabase, router])

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.url) {
        router.push(data.url)
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Failed to initiate checkout.')
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse h-8 bg-gray-200 rounded w-48" />
      </div>
    )
  }

  if (processing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Processing your payment...</p>
      </div>
    )
  }

  const isPro = profile?.subscription_status === 'pro'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Billing</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isPro ? 'You are on the Pro plan' : 'You are on the Free plan'}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPro ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {isPro ? 'Pro' : 'Free'}
          </span>
        </div>

        {isPro ? (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              You have full access to all leads, filtering, and priority matching.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <div className="rounded-xl border-2 border-blue-600 p-6 bg-blue-50">
              <h3 className="text-lg font-semibold text-gray-900">Upgrade to Pro</h3>
              <p className="mt-2 text-sm text-gray-600">
                Get unlimited leads, skill filtering, early access, and priority matching.
              </p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-gray-900">£49</span>
                <span className="text-gray-500 ml-1">/month</span>
              </p>
              <ul className="mt-4 space-y-2">
                {[
                  'Unlimited leads',
                  'Full lead details & source URLs',
                  'Skill-based filtering',
                  'Early access to new leads',
                  'Priority matching',
                  'Cancel anytime',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleUpgrade}
                className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                Upgrade to Pro — £49/month
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
