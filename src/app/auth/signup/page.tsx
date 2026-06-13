'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

const disciplineOptions = ['Design', 'Development', 'Writing', 'Marketing', 'Consulting', 'Finance', 'DevOps', 'Other']

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
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [signals, setSignals] = useState(signalPool.slice(0, 3))
  const [paused, setPaused] = useState(false)
  const siRef = useRef(3)
  const router = useRouter()
  const supabase = createClient()

  const pwScore = scorePassword(password)

  const toggleDiscipline = (d: string) => {
    setDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const fullName = `${firstName} ${lastName}`.trim()
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role: disciplines[0] || 'other' } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email: data.user.email, full_name: fullName,
        skills: disciplines.map(d => d.toLowerCase()),
        subscription_status: 'free',
      })
    }
    toast.success('Account created! Check your email for confirmation.')
    router.push('/dashboard/onboarding')
  }

  return (
    <div className="auth-body">
      <aside className="panel-left">
        <div className="panel-bg" aria-hidden="true"></div>
        <div className="panel-glow" aria-hidden="true"></div>
        <div className="panel-content">
          <div className="auth-logo" style={{ marginBottom: 28 }}>
            <span className="auth-logo-mark"><span>LF</span></span>
            <span className="auth-logo-name">LeadFlow</span>
          </div>
          <div className="panel-hero" style={{ justifyContent: 'flex-start' }}>
            <div className="panel-eyebrow" style={{ marginBottom: 10 }}>AI-Scored Freelance Leads</div>
            <h2 className="panel-heading" style={{ fontSize: 'clamp(1.4rem, 2.2vw, 1.8rem)', marginBottom: 10 }}>Stop searching.<br />Let the <span className="hl">right leads</span> find you.</h2>
            <p className="panel-sub" style={{ fontSize: '.88rem', marginBottom: 20, maxWidth: 300 }}>We scan Reddit, Reed, We Work Remotely, and Remote OK every 6 hours — scoring every post against your skills.</p>

            <div className="auth-mini-console" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
              <div className="auth-mini-bar">
                <span className="radar-mini" aria-hidden="true"></span>
                <span className="auth-mini-bar-label">Your lead feed</span>
                <span className="auth-mini-live"><span className="dot"></span> live</span>
              </div>
              <div className="feed-filters" aria-hidden="true" style={{ padding: '5px 10px 8px' }}>
                <span className="feed-chip on">All</span>
                <span className="feed-chip">Score 8+</span>
                <span className="feed-chip">Design</span>
                <span className="feed-chip">Remote</span>
                <span className="feed-chip">£300+/day</span>
              </div>
              <div className="auth-mini-signals">
                {(() => {
                  const maxScore = Math.max(...signals.map(s => parseFloat(s.score)))
                  const bestIdx = signals.findIndex(s => parseFloat(s.score) === maxScore)
                  return signals.map((s, i) => (
                    <div key={`${s.title}-${i}`} className="auth-mini-signal" style={i === 0 && siRef.current > 3 ? { animation: 'newFlash .8s ease-out' } : { animation: 'sweep .6s var(--ease-spring) both' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className="auth-msig-src" style={{ background: s.c, color: s.t }}>{s.src}</span>
                          {i === 0 && <span className="dash-badge dash-badge-new">new</span>}
                          {i === bestIdx && i !== 0 && <span className="dash-badge dash-badge-rec"><i className="ti ti-star-filled" style={{ fontSize: 9 }} aria-hidden="true"></i> recommended</span>}
                        </div>
                        <div className="auth-msig-title">{s.title}</div>
                        <div className="auth-msig-meta">{s.meta}</div>
                      </div>
                      <div className={`auth-msig-score ${s.cls}`}><span className="v">{s.score}</span><span className="l">SCORE</span></div>
                    </div>
                  ))
                })()}
              </div>
            </div>

            <div className="auth-trust-badges" style={{ marginTop: 14, gap: 6 }}>
              <div className="auth-trust-item" style={{ fontSize: '.8rem' }}><i className="ti ti-circle-check" aria-hidden="true"></i> No card required — free forever plan available</div>
              <div className="auth-trust-item" style={{ fontSize: '.8rem' }}><i className="ti ti-circle-check" aria-hidden="true"></i> First leads delivered within 1 hour of setup</div>
              <div className="auth-trust-item" style={{ fontSize: '.8rem' }}><i className="ti ti-circle-check" aria-hidden="true"></i> You apply on the original platform — zero commission</div>
            </div>
          </div>

          <div className="auth-social-proof" style={{ paddingTop: 14 }}>
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

      <main className="panel-right">
        <div className="auth-form-wrap">
          <div className="auth-form-eyebrow">Create your account</div>
          <h1>Get started free</h1>
          <p className="auth-tagline">Set up in 2 minutes. First leads within the hour.</p>

          <div className="auth-trial-strip" role="note" style={{ marginBottom: 18, padding: '10px 14px' }}>
            <i className="ti ti-gift" aria-hidden="true"></i>
            <p style={{ fontSize: '.8rem' }}><strong>7-day Pro trial included.</strong> Unlimited leads, skill filtering, daily digest. No card needed — ever.</p>
          </div>

          <div className="auth-step-row" style={{ marginBottom: 18 }}>
            <span className="auth-step-dot" aria-hidden="true"></span>
            <span className="auth-step-dot inactive" aria-hidden="true"></span>
            <span className="auth-step-label">Step 1 of 2 · Account details</span>
          </div>

          <form onSubmit={handleSignup}>
            <div className="auth-field-row">
              <div className="auth-field" style={{ marginBottom: 12 }}>
                <label htmlFor="first-name">First name</label>
                <input type="text" id="first-name" className="auth-input" placeholder="Alex" autoComplete="given-name" required value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="auth-field" style={{ marginBottom: 12 }}>
                <label htmlFor="last-name">Last name</label>
                <input type="text" id="last-name" className="auth-input" placeholder="Morgan" autoComplete="family-name" required value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="auth-field" style={{ marginBottom: 12 }}>
              <label htmlFor="email">Work email</label>
              <input type="email" id="email" className="auth-input" placeholder="alex@yoursite.co.uk" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="auth-field" style={{ marginBottom: 12 }}>
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

            <div className="auth-field" style={{ marginBottom: 12 }}>
              <label>What do you do? <span style={{ fontWeight: 400, color: 'var(--slate-500)' }}>(pick all that apply)</span></label>
              <div className="auth-skills-grid" role="group" aria-label="Select your disciplines">
                {disciplineOptions.map(d => (
                  <button key={d} type="button" className={`auth-skill-pill${disciplines.includes(d) ? ' selected' : ''}`} onClick={() => toggleDiscipline(d)}>{d}</button>
                ))}
              </div>
              <div className="auth-field-hint" style={{ fontSize: '.68rem' }}>These power your AI score — leads are ranked against your discipline</div>
            </div>

            <button type="submit" className="btn-p btn-full" disabled={loading} style={{ marginTop: 4 }}>
              <i className="ti ti-arrow-right" aria-hidden="true"></i>
              {loading ? 'Creating account\u2026' : 'Create my account \u2192'}
            </button>

            <p className="auth-legal" style={{ fontSize: '.72rem', marginTop: 10 }}>
              By continuing you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>. No card needed. Cancel any time.
            </p>
          </form>

          <div className="auth-login-link" style={{ marginTop: 12, fontSize: '.82rem' }}>Already have an account? <Link href="/auth/login">Log in →</Link></div>
        </div>
      </main>
    </div>
  )
}
