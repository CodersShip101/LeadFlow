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
      <div className="auth-body">
        <aside className="panel-left">
          <div className="panel-bg" aria-hidden="true"></div>
          <div className="panel-glow" aria-hidden="true"></div>
          <div className="panel-content">
            <div className="auth-logo">
              <span className="auth-logo-name">fl<span className="brand-ai">ai</span>ir</span>
            </div>
            <div className="panel-hero">
              <div className="panel-eyebrow">Check your inbox</div>
              <h2 className="panel-heading">We&apos;ve sent the link.<br />One click and you&apos;re back.</h2>
              <p className="panel-sub">The reset link expires in 1 hour. If you don&apos;t see it, check your spam folder or try again.</p>
            </div>
          </div>
        </aside>
        <main className="panel-right">
          <div className="auth-sent-card">
            <div className="card">
              <div className="auth-sent-icon">
                <i className="ti ti-mail" aria-hidden="true"></i>
              </div>
              <h1>Check your inbox</h1>
              <p>We sent a reset link to</p>
              <p className="auth-sent-email">{email}</p>
              <div className="auth-sent-actions">
                <button className="btn-p" onClick={() => setSent(false)}>
                  <i className="ti ti-arrow-left" aria-hidden="true"></i>
                  Try a different email
                </button>
                <Link href="/auth/login" className="auth-cta-link">Back to sign in</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="auth-body">
      <aside className="panel-left">
        <div className="panel-bg" aria-hidden="true"></div>
        <div className="panel-glow" aria-hidden="true"></div>
        <div className="panel-content">
          <div className="auth-logo">
            <span className="auth-logo-name">fl<span className="brand-ai">ai</span>ir</span>
          </div>
          <div className="panel-hero">
            <div className="panel-eyebrow">Forgot your password?</div>
            <h2 className="panel-heading">No problem.<br />We&apos;ll get you back in.</h2>
            <p className="panel-sub">Enter the email you use for Flaiir and we&apos;ll send a reset link. Takes 10 seconds.</p>
          </div>
        </div>
      </aside>
      <main className="panel-right">
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">Reset password</div>
          <h1>Find your account</h1>
          <p className="auth-tagline">Enter your email and we&apos;ll send a reset link.</p>
          <form onSubmit={handleReset}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" className="auth-input" placeholder="alex@yoursite.co.uk" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn-p btn-full" disabled={loading}>
              {loading ? 'Sending\u2026' : 'Send reset link'}
            </button>
          </form>
          <div className="auth-signup-nudge">
            <Link href="/auth/login" className="auth-cta-link">Back to sign in</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
