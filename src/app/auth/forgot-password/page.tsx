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
    setSent(true)
    setLoading(false)
    toast.success('Check your email for the reset link.')
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--base-100)' }}>
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="card p-8">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 animate-scale-in" style={{ background: 'var(--green-100)' }}>
              <i className="ti ti-mail text-xl" style={{ color: 'var(--green-600)' }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--base-900)' }}>Check your inbox</h1>
            <p className="text-sm mt-2" style={{ color: 'var(--base-600)' }}>We sent a link to <strong>{email}</strong></p>
            <p className="text-xs mt-6" style={{ color: 'var(--base-500)' }}>
              Didn&apos;t receive it?{' '}
              <button onClick={() => setSent(false)} className="font-medium hover:underline" style={{ color: 'var(--green-500)' }}>Try again</button>
            </p>
            <Link href="/auth/login" className="btn-g mt-6 justify-center w-full">Back to sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--base-100)' }}>
      <div className="w-full max-w-sm animate-fade-in">
        <div className="card p-8">
          <div className="text-center mb-6">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--green-600)' }}>
              <span className="text-white text-sm font-bold">LF</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--base-900)' }}>Reset your password</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--base-600)' }}>Enter your email and we'll send a reset link.</p>
          </div>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--base-700)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-p w-full justify-center">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <Link href="/auth/login" className="btn-g mt-4 justify-center w-full">Back to sign in</Link>
        </div>
      </div>
    </div>
  )
}
