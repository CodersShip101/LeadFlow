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

  const strength = getPasswordStrength(password)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token_hash')
    const type = params.get('type')
    const hash = window.location.hash

    if (tokenHash && type === 'recovery') {
      // Exchange the emailed token for a recovery session, then show the form.
      supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash }).then(({ error }) => {
        if (error) {
          toast.error('That reset link is invalid or expired. Request a new one.')
          return
        }
        setStep('reset')
        window.history.replaceState({}, '', '/auth/reset-password')
      })
    } else if (hash.includes('access_token') || hash.includes('type=recovery')) {
      setStep('reset')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startCountdown = (seconds: number) => {
    setCountdown(seconds)
    const timer = setInterval(() => setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0 }; return prev - 1 }), 1000)
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (res.status === 429) {
      // Server cooldown still active — keep them on the sent screen and sync the timer.
      setStep('sent')
      startCountdown(data.retryAfter || 60)
      toast.error(data.error || 'Please wait before requesting another email.')
      return
    }
    if (!res.ok) { toast.error(data.error || 'Something went wrong'); return }
    setStep('sent')
    toast.success('Check your email for the reset link.')
    startCountdown(60)
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
            <span className="auth-logo-name">fl<span className="brand-ai">ai</span>ir</span>
          </div>
          <div className="panel-hero">
            <div className="panel-eyebrow">Check your inbox</div>
            <h2 className="panel-heading">We&apos;ve sent the link.<br />One click and you&apos;re back.</h2>
            <p className="panel-sub">The reset link expires in 10 minutes. If you don&apos;t see it, check your spam folder or try again.</p>
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
            <span className="auth-logo-name">fl<span className="brand-ai">ai</span>ir</span>
          </div>
          <div className="panel-hero">
            <div className="panel-eyebrow">Almost there</div>
            <h2 className="panel-heading">Set your new password.<br />Then get back to winning.</h2>
            <p className="panel-sub">Make it strong — you&apos;ll use this to access your lead feed from now on.</p>
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
                <input type="password" id="password" className="auth-input" placeholder="At least 8 characters" autoComplete="new-password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              {password && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2, 3].map(i => (
                      <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i < strength.score ? strength.color : 'var(--slate-200, #E5E7EB)', transition: 'background .2s' }} />
                    ))}
                  </div>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.72rem', margin: '6px 0 0', color: strength.color }}>{strength.label}</p>
                </div>
              )}
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
            <span className="auth-logo-name">fl<span className="brand-ai">ai</span>ir</span>
          </div>
          <div className="panel-hero">
            <div className="panel-eyebrow">Forgot your password?</div>
            <h2 className="panel-heading">Happens to everyone.<br />We&apos;ll get you back in.</h2>
            <p className="panel-sub">Enter your email and we&apos;ll send a secure reset link. Your leads will be right where you left them.</p>
            <ul className="auth-step-list">
              <li><span className="auth-step-n">1</span> Enter your email address</li>
              <li><span className="auth-step-n">2</span> Open the reset link we send you</li>
              <li><span className="auth-step-n">3</span> Set a new password and you&apos;re in</li>
            </ul>
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

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '#E5E7EB' }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  // Cap to a 0–4 scale for the four bars.
  score = Math.min(4, score)
  if (pw.length < 8) score = Math.min(score, 1)
  const meta = [
    { label: 'Too weak', color: '#DC2626' },
    { label: 'Weak', color: '#DC2626' },
    { label: 'Fair', color: '#D97706' },
    { label: 'Good', color: '#5E8F00' },
    { label: 'Strong', color: '#1B6B4A' },
  ][score]
  return { score, label: meta.label, color: meta.color }
}
