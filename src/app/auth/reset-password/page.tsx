'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'sent' | 'reset'>('email')
  const [countdown, setCountdown] = useState(60)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash : ''
    if (hash.includes('access_token') || hash.includes('type=recovery')) {
      setStep('reset')
    }
  }, [])

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Something went wrong'); setLoading(false); return }
    setStep('sent')
    setLoading(false)
    toast.success('Check your email for the reset link.')
    const timer = setInterval(() => setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 }; return prev - 1 }), 1000)
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Password updated!')
    router.push('/auth/login')
  }

  if (step === 'sent') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="card p-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 animate-scale-in" style={{ background: 'var(--amber-pale)' }}>
              <i className="ti ti-mail text-xl" style={{ color: 'var(--amber)' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--cream)' }}>Check your inbox</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--slate)' }}>We sent a link to <strong style={{ color: 'var(--cream)' }}>{email}</strong></p>
            <p className="text-xs mt-6" style={{ color: 'var(--slate-2)' }}>
              Didn&apos;t receive it?{' '}
              {countdown > 0 ? (
                <span>Resend in {countdown}s</span>
              ) : (
                <button onClick={handleSendEmail} className="font-medium hover:underline" style={{ color: 'var(--amber)' }}>Resend email</button>
              )}
            </p>
            <Link href="/auth/login" className="btn-s mt-6 justify-center w-full">Back to sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'reset') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="card p-8">
            <h1 className="text-xl font-bold text-center" style={{ color: 'var(--cream)' }}>Set new password</h1>
            <p className="text-sm text-center mt-2" style={{ color: 'var(--slate)' }}>Enter your new password below.</p>
            <form onSubmit={handleReset} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--slate-2)' }}>New password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  className="input" placeholder="At least 6 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--slate-2)' }}>Confirm password</label>
                <input type="password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)}
                  className="input" placeholder="Repeat password" />
              </div>
              <button type="submit" disabled={loading} className="btn-p w-full justify-center">
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--amber)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>LF</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--cream)' }}>Reset your password</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--slate)' }}>Enter your email and we'll send a reset link.</p>
          </div>
          <form onSubmit={handleSendEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--slate-2)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-p w-full justify-center">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <Link href="/auth/login" className="btn-s mt-4 justify-center w-full">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
