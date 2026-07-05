'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in both fields.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    toast.success('Welcome back!')
    router.push('/dashboard')
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
            <div className="panel-eyebrow">Your feed is live</div>
            <h2 className="panel-heading">New leads matched<br />to your skills and rate.</h2>
            <p className="panel-sub">While you&apos;ve been away, we&apos;ve been scanning and scoring. Log back in to see what&apos;s matched.</p>
            <div className="auth-sources-section">
              <div className="auth-sources-label">We scan from</div>
              <div className="auth-source-pills">
                <span className="auth-source-pill"><i className="ti ti-brand-reddit" aria-hidden="true"></i> Reddit</span>
                <span className="auth-source-pill"><i className="ti ti-briefcase" aria-hidden="true"></i> Reed.co.uk</span>
                <span className="auth-source-pill"><i className="ti ti-world" aria-hidden="true"></i> We Work Remotely</span>
                <span className="auth-source-pill"><i className="ti ti-device-laptop" aria-hidden="true"></i> Remote OK</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="panel-right">
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">Welcome back</div>
          <h1>Log in to Flaiir</h1>
          <p className="auth-tagline">Your leads are ready.</p>

          {error && (
            <div className="auth-alert-error visible" role="alert" aria-live="polite">
              <i className="ti ti-alert-circle" aria-hidden="true"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" className="auth-input" placeholder="alex@yoursite.co.uk" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="password">Password</label>
                <Link href="/auth/reset-password" className="auth-forgot-link">Forgot password?</Link>
              </div>
              <div className="auth-pw-field">
                <input type={showPw ? 'text' : 'password'} id="password" className="auth-input" placeholder="Your password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" className="auth-pw-toggle" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(!showPw)}>
                  <i className={`ti ${showPw ? 'ti-eye-off' : 'ti-eye'}`} aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <div className="auth-remember-row">
              <input type="checkbox" id="remember" defaultChecked />
              <label htmlFor="remember">Keep me logged in for 30 days</label>
            </div>
            <button type="submit" className="btn-p btn-full" disabled={loading}>
              {loading ? 'Logging in\u2026' : 'Log in to my feed'}
            </button>
          </form>

          <p className="auth-magic-line">
            Prefer no password?{' '}
            <button type="button" className="auth-magic-link" onClick={() => router.push('/auth/magic-link')}>Email me a magic link</button>
          </p>

          <div className="auth-signup-nudge">
            <p>No account? <Link href="/auth/signup" className="auth-cta-link">Sign up free</Link></p>
          </div>
        </div>
      </main>
    </div>
  )
}
