'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: '' } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email: data.user.email, subscription_status: 'free',
      })
    }
    toast.success('Account created! Check your email for confirmation.')
    router.push('/dashboard/onboarding')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#1B6B4A' }}>
            <span className="text-white text-sm font-bold">LF</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>Create your account</h1>
          <p className="mt-1.5 text-sm" style={{ color: '#6B7280' }}>Start getting quality freelance leads.</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email</label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ borderColor: '#D1D5DB', color: '#111827', background: '#FFFFFF' }}
              placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Password</label>
            <input id="password" type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ borderColor: '#D1D5DB', color: '#111827', background: '#FFFFFF' }}
              placeholder="At least 6 characters" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm" style={{ color: '#6B7280' }}>
          Already have an account?{' '}
          <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: '#1B6B4A' }}>Login</Link>
        </p>
      </div>
    </div>
  )
}
