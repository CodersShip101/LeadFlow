'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

function scorePassword(pw: string) {
  const len = pw.length
  const hasUpper = /[A-Z]/.test(pw)
  const hasNum = /[0-9]/.test(pw)
  const hasSym = /[^A-Za-z0-9]/.test(pw)
  let score = 0
  if (len >= 8) score++
  if (len >= 12) score++
  if (hasNum || hasUpper) score++
  if (hasSym) score++
  return score
}

const signalPool = [
  { src: 'REDDIT', c: 'rgba(255,140,66,.14)', t: '#ff9c5b', title: 'Senior UX Designer — London (Fintech)', meta: '£350–450/day · Figma · Inside IR35', score: '9.1', cls: 'score-a' },
  { src: 'WWR', c: 'rgba(110,168,212,.16)', t: '#7fb6e6', title: 'Full-Stack Developer — Remote UK', meta: '£60–75k · React, Node · ASAP', score: '8.7', cls: 'score-a' },
  { src: 'REED', c: 'rgba(176,138,219,.16)', t: '#c4a3ec', title: 'Brand Identity — 3-month contract', meta: '£40k pro rata · Branding', score: '7.4', cls: 'score-b' },
  { src: 'REMOTE OK', c: 'rgba(196,240,0,.16)', t: 'var(--lime)', title: 'DevOps Engineer — Full-time Remote', meta: '£70–90k · AWS, Terraform', score: '8.9', cls: 'score-a' },
  { src: 'REDDIT', c: 'rgba(255,140,66,.14)', t: '#ff9c5b', title: 'Content Strategist — B2B SaaS', meta: '£350/day · Notion, Writing', score: '8.5', cls: 'score-a' },
  { src: 'WWR', c: 'rgba(110,168,212,.16)', t: '#7fb6e6', title: 'Shopify Developer — E-commerce', meta: '£45–55k · Liquid, JS · Ongoing', score: '7.8', cls: 'score-b' },
  { src: 'REED', c: 'rgba(176,138,219,.16)', t: '#c4a3ec', title: 'Motion Designer — Ad Agency', meta: '£300–380/day · After Effects', score: '9.0', cls: 'score-a' },
  { src: 'REMOTE OK', c: 'rgba(196,240,0,.16)', t: 'var(--lime)', title: 'UI Designer — Healthtech Startup', meta: '£400/day · Figma · 6-week sprint', score: '9.3', cls: 'score-a' },
]

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [signals, setSignals] = useState(signalPool.slice(0, 3))
  const [paused, setPaused] = useState(false)
  const siRef = useRef(3)
  const router = useRouter()
  const supabase = createClient()

  const pwScore = scorePassword(password)

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const burst: number[] = []
    let count = 0
    const rotate = () => {
      if (paused || document.hidden) return
      const d = signalPool[siRef.current % signalPool.length]
      siRef.current++
      setSignals(prev => {
        const next = [...prev]
        next.pop()
        next.unshift(d)
        return next
      })
      count++
      if (count < 3) burst.push(window.setTimeout(rotate, 1500))
    }
    burst.push(window.setTimeout(rotate, 1000))
    const interval = window.setInterval(rotate, 4500)
    return () => {
      burst.forEach(window.clearTimeout)
      window.clearInterval(interval)
    }
  }, [paused])

  const emailRedirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback?next=/dashboard/onboarding`
    : undefined

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo },
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    setLoading(false)
    setSent(true)
  }

  const handleResend = async () => {
    setResending(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })
    setResending(false)
    if (error) { toast.error(error.message); return }
    toast.success('Confirmation email resent.')
  }

  return (
    <div className="auth-body">
      {/* LEFT: BRAND PANEL */}
      <aside className="panel-left">
        <div className="panel-bg" aria-hidden="true"></div>
        <div className="panel-glow" aria-hidden="true"></div>

        <div className="panel-content">
          <div className="auth-logo" style={{ marginBottom: 28 }}>
            <span className="auth-logo-mark"><span>fl</span></span>
            <span className="auth-logo-name">fl<span className="brand-ai">ai</span>ir</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="panel-eyebrow" style={{ marginBottom: 10 }}>AI-Scored Freelance Leads</div>
            <h2 className="panel-heading" style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', marginBottom: 10 }}>
              Stop searching.<br />Let the <span className="hl">right leads</span> find you.
            </h2>
            <p className="panel-sub" style={{ fontSize: '.88rem', marginBottom: 18, maxWidth: 300 }}>
              We scan Reddit, Reed, We Work Remotely, and Remote OK as often as every hour — scoring every post against your skills before it reaches you.
            </p>

            {/* Mini live feed */}
            <div className="auth-mini-console" style={{ marginBottom: 18 }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
              <div className="auth-mini-bar">
                <span className="radar-mini" aria-hidden="true"></span>
                <span className="auth-mini-bar-label">Your lead feed</span>
                <span className="auth-mini-live"><span className="dot"></span> live</span>
              </div>
              <div className="auth-mini-signals">
                {signals.map((s, i) => (
                  <div key={`${s.title}-${i}`} className="auth-mini-signal"
                    style={i === 0 && siRef.current > 3
                      ? { animation: 'newFlash .8s ease-out' }
                      : { animation: `sweep .6s var(--ease-spring) both`, animationDelay: `${i * 0.12}s` }
                    }>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className="auth-msig-src" style={{ background: s.c, color: s.t }}>{s.src}</span>
                        {i === 0 && siRef.current > 3 && <span className="dash-badge dash-badge-new">new</span>}
                      </div>
                      <div className="auth-msig-title">{s.title}</div>
                      <div className="auth-msig-meta">{s.meta}</div>
                    </div>
                    <div className={`auth-msig-score ${s.cls}`}><span className="v">{s.score}</span><span className="l">SCORE</span></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources strip */}
            <div className="auth-sources-section" style={{ marginBottom: 14 }}>
              <div className="auth-sources-label">Scanning now from</div>
              <div className="auth-source-pills">
                <span className="auth-source-pill"><i className="ti ti-brand-reddit" aria-hidden="true"></i> Reddit</span>
                <span className="auth-source-pill"><i className="ti ti-briefcase" aria-hidden="true"></i> Reed.co.uk</span>
                <span className="auth-source-pill"><i className="ti ti-world" aria-hidden="true"></i> We Work Remotely</span>
                <span className="auth-source-pill"><i className="ti ti-device-laptop" aria-hidden="true"></i> Remote OK</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="auth-trust-badges" style={{ gap: 5, marginBottom: 0 }}>
              <div className="auth-trust-item" style={{ fontSize: '.78rem' }}><i className="ti ti-circle-check" aria-hidden="true"></i> Free 7-day Pro trial — cancel any time</div>
              <div className="auth-trust-item" style={{ fontSize: '.78rem' }}><i className="ti ti-circle-check" aria-hidden="true"></i> First leads delivered within 1 hour of setup</div>
              <div className="auth-trust-item" style={{ fontSize: '.78rem' }}><i className="ti ti-circle-check" aria-hidden="true"></i> You apply on the original platform — zero commission</div>
            </div>
          </div>

          {/* Social proof */}
          <div className="auth-social-proof" style={{ paddingTop: 12 }}>
            <div className="auth-avatar-stack" aria-hidden="true">
              <div className="avatar" style={{ background: 'var(--lime)' }}>JK</div>
              <div className="avatar" style={{ background: 'var(--amber)' }}>SM</div>
              <div className="avatar" style={{ background: '#7fb6e6' }}>AR</div>
              <div className="avatar" style={{ background: '#c4a3ec' }}>PL</div>
            </div>
            <div className="auth-proof-text">
              <strong>340+ UK freelancers</strong>
              Finding better work, faster
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT: FORM */}
      <main className="panel-right">
        {sent ? (
          <div className="auth-sent-card">
            <div className="card">
              <div className="auth-sent-icon"><i className="ti ti-mail-fast" aria-hidden="true"></i></div>
              <h1>Check your inbox</h1>
              <p>We&apos;ve sent a confirmation link to</p>
              <p className="auth-sent-email">{email}</p>
              <p style={{ marginTop: 10 }}>Click it to verify your email and start setting up your feed. The link expires in 1 hour.</p>
              <div className="auth-sent-actions">
                <button className="btn-p" onClick={handleResend} disabled={resending}>
                  <i className="ti ti-refresh" aria-hidden="true"></i>
                  {resending ? 'Resending...' : 'Resend email'}
                </button>
                <button className="auth-magic-link" onClick={() => setSent(false)}>Use a different email</button>
              </div>
              <p className="auth-legal" style={{ marginTop: 22 }}>
                Wrong address or didn&apos;t arrive? Check spam, or <Link href="/auth/login">log in</Link> if you already confirmed.
              </p>
            </div>
          </div>
        ) : (
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">Create your account</div>
          <h1>Get started free</h1>
          <p className="auth-tagline">Just an email and password — we&apos;ll set up your feed next.</p>

          <div className="auth-trial-strip" role="note" style={{ marginBottom: 18, padding: '10px 14px' }}>
            <i className="ti ti-gift" aria-hidden="true"></i>
            <p style={{ fontSize: '.8rem' }}><strong>7-day Pro trial included.</strong> Unlimited leads, skill filtering, daily digest. Cancel any time before it ends — we&apos;ll remind you first.</p>
          </div>

          <div className="auth-step-row" style={{ marginBottom: 18 }}>
            <span className="auth-step-dot" aria-hidden="true"></span>
            <span className="auth-step-dot inactive" aria-hidden="true"></span>
            <span className="auth-step-label">Step 1 of 3 · Create account</span>
          </div>

          <form onSubmit={handleSignup}>
            <div className="auth-field" style={{ marginBottom: 14 }}>
              <label htmlFor="email">Email</label>
              <input type="email" id="email" className="auth-input" placeholder="alex@yoursite.co.uk" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="auth-field" style={{ marginBottom: 14 }}>
              <label htmlFor="password">Password</label>
              <div className="auth-pw-field">
                <input type="password" id="password" className="auth-input" placeholder="8+ characters" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="auth-pw-strength" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`auth-pw-bar${i < pwScore ? (pwScore <= 1 ? ' weak' : pwScore <= 2 ? ' medium' : ' strong') : ''}`}></div>
                ))}
              </div>
              <div className="auth-field-hint" id="pw-hint" style={{ fontSize: '.68rem' }}>
                {pwScore === 0 && 'Use 8+ characters for a stronger password'}
                {pwScore === 1 && 'Weak — try adding numbers or symbols'}
                {pwScore === 2 && 'OK — a little longer or more variety helps'}
                {pwScore === 3 && 'Good password'}
                {pwScore >= 4 && 'Strong password ✓'}
              </div>
            </div>

            <button type="submit" className="btn-p btn-full" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Creating account\u2026' : 'Create my account'}
            </button>

            <p className="auth-legal" style={{ fontSize: '.72rem', marginTop: 10 }}>
              By continuing you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>. Cancel any time before your trial ends.
            </p>
          </form>

          <div className="auth-login-link" style={{ marginTop: 12, fontSize: '.82rem' }}>Already have an account? <Link href="/auth/login">Log in</Link></div>
        </div>
        )}
      </main>
    </div>
  )
}
