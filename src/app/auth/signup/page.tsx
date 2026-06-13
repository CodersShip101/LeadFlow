'use client'

import { useState } from 'react'
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

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [dayRate, setDayRate] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const pwScore = scorePassword(password)

  const toggleDiscipline = (d: string) => {
    setDisciplines(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

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
        skills: disciplines.map(d => d.toLowerCase()), hourly_rate: dayRate ? parseInt(dayRate) : null,
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
          <div className="auth-logo">
            <span className="auth-logo-mark"><span>LF</span></span>
            <span className="auth-logo-name">LeadFlow</span>
          </div>
          <div>
            <div className="panel-eyebrow">AI-Scored Freelance Leads</div>
            <h2 className="panel-heading">Stop searching.<br />Let the <span className="hl">right leads</span><br />find you.</h2>
            <p className="panel-sub">We scan Reddit, Reed, We Work Remotely, and Remote OK every 6 hours — scoring every post against your skills before it reaches you.</p>

            <div className="auth-mini-console" role="img" aria-label="Example of the live lead feed">
              <div className="auth-mini-bar">
                <span className="radar-mini" aria-hidden="true"></span>
                <span className="auth-mini-bar-label">Your lead feed</span>
                <span className="auth-mini-live"><span className="dot"></span> live</span>
              </div>
              <div className="auth-mini-signals">
                <div className="auth-mini-signal" style={{ animationDelay: '.05s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 4 }}><span className="auth-msig-src" style={{ background: 'rgba(255,140,66,.14)', color: '#ff9c5b' }}>REDDIT</span></div>
                    <div className="auth-msig-title">Senior UX Designer — Fintech</div>
                    <div className="auth-msig-meta">£350–450/day · Figma · IR35</div>
                  </div>
                  <div className="auth-msig-score score-a"><span className="v">9.1</span><span className="l">SCORE</span></div>
                </div>
                <div className="auth-mini-signal" style={{ animationDelay: '.18s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 4 }}><span className="auth-msig-src" style={{ background: 'rgba(196,240,0,.16)', color: 'var(--lime)' }}>REMOTE OK</span></div>
                    <div className="auth-msig-title">Full-Stack Dev — Remote UK</div>
                    <div className="auth-msig-meta">£60–75k · React, Node · ASAP</div>
                  </div>
                  <div className="auth-msig-score score-a"><span className="v">8.7</span><span className="l">SCORE</span></div>
                </div>
                <div className="auth-mini-signal" style={{ animationDelay: '.31s' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 4 }}><span className="auth-msig-src" style={{ background: 'rgba(176,138,219,.16)', color: '#c4a3ec' }}>REED</span></div>
                    <div className="auth-msig-title">Brand Identity — 3-month</div>
                    <div className="auth-msig-meta">£40k pro rata · Branding</div>
                  </div>
                  <div className="auth-msig-score score-b"><span className="v">7.4</span><span className="l">SCORE</span></div>
                </div>
              </div>
            </div>

            <div className="auth-trust-badges">
              <div className="auth-trust-item"><i className="ti ti-circle-check" aria-hidden="true"></i> No card required — free forever plan available</div>
              <div className="auth-trust-item"><i className="ti ti-circle-check" aria-hidden="true"></i> First leads delivered within 1 hour of setup</div>
              <div className="auth-trust-item"><i className="ti ti-circle-check" aria-hidden="true"></i> You apply on the original platform — zero commission</div>
            </div>
          </div>

          <div className="auth-social-proof">
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

          <div className="auth-trial-strip" role="note">
            <i className="ti ti-gift" aria-hidden="true"></i>
            <p><strong>7-day Pro trial included.</strong> Unlimited leads, skill filtering, daily digest. No card needed — ever.</p>
          </div>

          <div className="auth-step-row" aria-label="Step 1 of 2: Account details">
            <span className="auth-step-dot" aria-hidden="true"></span>
            <span className="auth-step-dot inactive" aria-hidden="true"></span>
            <span className="auth-step-label">Step 1 of 2 · Account details</span>
          </div>

          <form onSubmit={handleSignup}>
            <div className="auth-field-row">
              <div className="auth-field">
                <label htmlFor="first-name">First name</label>
                <input type="text" id="first-name" className="auth-input" placeholder="Alex" autoComplete="given-name" required value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div className="auth-field">
                <label htmlFor="last-name">Last name</label>
                <input type="text" id="last-name" className="auth-input" placeholder="Morgan" autoComplete="family-name" required value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="email">Work email</label>
              <input type="email" id="email" className="auth-input" placeholder="alex@yoursite.co.uk" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Password</label>
              <div className="auth-pw-field">
                <input type="password" id="password" className="auth-input" placeholder="8+ characters" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="auth-pw-strength" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`auth-pw-bar${i < pwScore ? (pwScore <= 1 ? ' weak' : pwScore <= 2 ? ' medium' : ' strong') : ''}`}></div>
                ))}
              </div>
              <div className="auth-field-hint" id="pw-hint">
                {pwScore === 0 && 'Use 8+ characters for a stronger password'}
                {pwScore === 1 && 'Weak \u2014 try adding numbers or symbols'}
                {pwScore === 2 && 'OK \u2014 a little longer or more variety helps'}
                {pwScore === 3 && 'Good password'}
                {pwScore >= 4 && 'Strong password \u2713'}
              </div>
            </div>

            <div className="auth-field">
              <label>What do you do? <span style={{ fontWeight: 400, color: 'var(--slate-500)' }}>(pick all that apply)</span></label>
              <div className="auth-skills-grid" role="group" aria-label="Select your disciplines">
                {disciplineOptions.map(d => (
                  <button key={d} type="button" className={`auth-skill-pill${disciplines.includes(d) ? ' selected' : ''}`} onClick={() => toggleDiscipline(d)}>{d}</button>
                ))}
              </div>
              <div className="auth-field-hint">These power your AI score — leads are ranked against your discipline</div>
            </div>

            <div className="auth-field">
              <label htmlFor="day-rate">Your day rate (optional)</label>
              <div className="auth-input-prefix">
                <span className="auth-prefix-symbol">£</span>
                <input type="text" id="day-rate" className="auth-input" placeholder="350" inputMode="numeric" value={dayRate} onChange={e => setDayRate(e.target.value)} />
              </div>
              <div className="auth-field-hint">Used to filter out leads below your rate. Skip if you&apos;re flexible.</div>
            </div>

            <button type="submit" className="btn-p btn-full" disabled={loading}>
              <i className="ti ti-arrow-right" aria-hidden="true"></i>
              {loading ? 'Creating account\u2026' : 'Create my account \u2192'}
            </button>

            <p className="auth-legal">
              By continuing you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>. No card needed. Cancel any time.
            </p>
          </form>

          <div className="auth-login-link">Already have an account? <Link href="/auth/login">Log in →</Link></div>
        </div>
      </main>
    </div>
  )
}
