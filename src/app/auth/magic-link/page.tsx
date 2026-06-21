'use client'

import { useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function MagicLinkPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const startCountdown = (seconds: number) => {
    setCountdown(seconds)
    const timer = setInterval(() => setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 }; return prev - 1 }), 1000)
  }

  const sendLink = async () => {
    const res = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 429) {
      startCountdown(data.retryAfter || 60)
      throw new Error(data.error || 'Please wait before requesting another link.')
    }
    if (!res.ok) {
      throw new Error(data.error || 'Something went wrong')
    }
    startCountdown(60)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { toast.error('Please enter your email.'); return }
    setLoading(true)
    try {
      await sendLink()
      setSent(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await sendLink()
      toast.success('Magic link resent.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setResending(false)
    }
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
            <div className="panel-eyebrow">No password needed</div>
            <h2 className="panel-heading">One link.<br />Straight to your feed.</h2>
            <p className="panel-sub">We&apos;ll email you a secure sign-in link. Click it and you&apos;re in — no password to remember.</p>
          </div>
        </div>
      </aside>

      <main className="panel-right">
        {sent ? (
          <div className="auth-sent-card">
            <div className="card">
              <div className="auth-sent-icon"><i className="ti ti-mail-fast" aria-hidden="true"></i></div>
              <h1>Check your inbox</h1>
              <p>We&apos;ve sent a magic sign-in link to</p>
              <p className="auth-sent-email">{email}</p>
              <p style={{ marginTop: 10 }}>Click the link in the email to log in. It expires in 10 minutes.</p>
              <div className="auth-sent-actions">
                <button className="btn-p" onClick={handleResend} disabled={resending || countdown > 0}>
                  <i className="ti ti-refresh" aria-hidden="true"></i>
                  {resending ? 'Resending…' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend link'}
                </button>
                <button className="auth-magic-link" onClick={() => setSent(false)}>Use a different email</button>
              </div>
              <p className="auth-legal" style={{ marginTop: 22 }}>
                Didn&apos;t arrive? Check spam, or <Link href="/auth/login">log in with a password</Link> instead.
              </p>
            </div>
          </div>
        ) : (
          <div className="auth-form-wrap">
            <div className="auth-form-eyebrow">Passwordless login</div>
            <h1>Email me a magic link</h1>
            <p className="auth-tagline">Enter your email and we&apos;ll send a one-click sign-in link.</p>

            <form onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" className="auth-input" placeholder="alex@yoursite.co.uk" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <button type="submit" className="btn-p btn-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>

            <div className="auth-signup-nudge">
              <p>Prefer a password? <Link href="/auth/login" className="auth-cta-link">Log in the usual way</Link></p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
