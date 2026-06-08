'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    if (!res.ok) { toast.error(data.error || 'Something went wrong'); setLoading(false); return }
    setSent(true); setLoading(false)
    toast.success('Check your email for the reset link.')
  }

  if (sent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
            <i className="ti ti-mail text-lg" style={{ color: '#059669' }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>Check your email</h1>
          <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>
            We&apos;ve sent a password reset link to <strong>{email}</strong>.
          </p>
          <p className="mt-6 text-sm" style={{ color: '#9CA3AF' }}>
            Didn&apos;t receive it?{' '}
            <button onClick={() => setSent(false)} className="font-medium hover:underline" style={{ color: '#1B6B4A' }}>
              Try again
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#1B6B4A' }}>
            <span className="text-white text-sm font-bold">LF</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>Reset your password</h1>
          <p className="mt-1.5 text-sm" style={{ color: '#6B7280' }}>Enter your email and we&apos;ll send you a reset link.</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>Email</label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ borderColor: '#D1D5DB', color: '#111827', background: '#FFFFFF' }}
              placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm" style={{ color: '#6B7280' }}>
          <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: '#1B6B4A' }}>Back to login</Link>
        </p>
      </div>
    </div>
  )
}
