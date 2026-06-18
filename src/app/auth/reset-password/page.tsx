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

  const sentPanel = () => (
    <div className="auth-body">
      <aside className="panel-left">
        <div className="panel-bg" aria-hidden="true"></div>
        <div className="panel-glow" aria-hidden="true"></div>
        <div className="panel-content">
          <div className="auth-logo">
            <span className="auth-logo-mark"><span>LF</span></span>
            <span className="auth-logo-name">LeadFlow</span>
          </div>
          <div className="panel-hero">
            <div className="panel-eyebrow">Check your inbox</div>
            <h2 className="panel-heading">We&apos;ve sent the link.<br />One click and you&apos;re back.</h2>
            <p className="panel-sub">The reset link expires in 1 hour. If you don&apos;t see it, check your spam folder or try again.</p>
          </div>
          <div className="auth-testimonial">
            <p>Best decision I made for my freelance business. The quality of leads is unmatched.</p>
            <div className="auth-testimonial-author">
              <div className="auth-author-av" aria-hidden="true">SM</div>
              <div className="auth-author-info">
                <div className="auth-author-name">Sarah M.</div>
                <div className="auth-author-role">Freelance Copywriter · Manchester</div>
              </div>
            </div>
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
              {countdown > 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.78rem', color: 'var(--slate-500)' }}>Resend in {countdown}s</p>
              ) : (
                <button className="btn-p" onClick={handleSendEmail}>
                  Resend email
                </button>
              )}
              <Link href="/auth/login" className="auth-cta-link">Back to sign in</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )

  const resetPanel = () => (
    <div className="auth-body">
      <aside className="panel-left">
        <div className="panel-bg" aria-hidden="true"></div>
        <div className="panel-glow" aria-hidden="true"></div>
        <div className="panel-content">
          <div className="auth-logo">
            <span className="auth-logo-mark"><span>LF</span></span>
            <span className="auth-logo-name">LeadFlow</span>
          </div>
          <div className="panel-hero">
            <div className="panel-eyebrow">Almost there</div>
            <h2 className="panel-heading">Set your new password.<br />Then get back to winning.</h2>
            <p className="panel-sub">Make it strong — you&apos;ll use this to access your lead feed from now on.</p>
          </div>
          <div className="auth-testimonial">
            <p>Had a mini panic when I couldn&apos;t log in, but the reset took less than a minute. Solid experience.</p>
            <div className="auth-testimonial-author">
              <div className="auth-author-av" aria-hidden="true">TP</div>
              <div className="auth-author-info">
                <div className="auth-author-name">Tom P.</div>
                <div className="auth-author-role">Freelance Developer · Bristol</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main className="panel-right">
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">New password</div>
          <h1>Set new password</h1>
          <p className="auth-tagline">Enter your new password below.</p>
          <form onSubmit={handleReset}>
            <div className="auth-field">
              <label htmlFor="password">New password</label>
              <div className="auth-pw-field">
                <input type="password" id="password" className="auth-input" placeholder="At least 6 characters" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <div className="auth-field">
              <label htmlFor="confirm">Confirm password</label>
              <div className="auth-pw-field">
                <input type="password" id="confirm" className="auth-input" placeholder="Repeat password" autoComplete="new-password" required minLength={6} value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn-p btn-full" disabled={loading}>
              {loading ? 'Updating\u2026' : 'Update password'}
            </button>
          </form>
          <div className="auth-signup-nudge">
            <Link href="/auth/login" className="auth-cta-link">Back to sign in</Link>
          </div>
        </div>
      </main>
    </div>
  )

  if (step === 'sent') return sentPanel()
  if (step === 'reset') return resetPanel()

  return (
    <div className="auth-body">
      <aside className="panel-left">
        <div className="panel-bg" aria-hidden="true"></div>
        <div className="panel-glow" aria-hidden="true"></div>
        <div className="panel-content">
          <div className="auth-logo">
            <span className="auth-logo-mark"><span>LF</span></span>
            <span className="auth-logo-name">LeadFlow</span>
          </div>
          <div className="panel-hero">
            <div className="panel-eyebrow">Forgot your password?</div>
            <h2 className="panel-heading">No problem.<br />We&apos;ll get you back in.</h2>
            <p className="panel-sub">Enter the email you use for LeadFlow and we&apos;ll send a reset link. Takes 10 seconds.</p>
            <div className="auth-stats-row">
              <div className="auth-stat-item">
                <span className="auth-stat-num"><span>2,400+</span></span>
                <span className="auth-stat-label">Active freelancers</span>
              </div>
              <div className="auth-stat-item">
                <span className="auth-stat-num"><span>98%</span></span>
                <span className="auth-stat-label">Reset success rate</span>
              </div>
            </div>
          </div>
          <div className="auth-testimonial">
            <p>Had a mini panic when I couldn&apos;t log in, but the reset took less than a minute. Solid experience.</p>
            <div className="auth-testimonial-author">
              <div className="auth-author-av" aria-hidden="true">TP</div>
              <div className="auth-author-info">
                <div className="auth-author-name">Tom P.</div>
                <div className="auth-author-role">Freelance Developer · Bristol</div>
              </div>
            </div>
          </div>
        </div>
      </aside>
      <main className="panel-right">
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">Reset password</div>
          <h1>Find your account</h1>
          <p className="auth-tagline">Enter your email and we&apos;ll send a reset link.</p>
          <form onSubmit={handleSendEmail}>
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
