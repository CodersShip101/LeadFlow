'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const faqs = [
  { q: 'How does LeadFlow find leads?', a: 'We scan Reddit (r/forhire, r/freelance, r/hiring), Reed.co.uk, and We Work Remotely every 6 hours. Every lead is then processed by our AI scoring model before appearing in your feed.' },
  { q: 'How does the quality score work?', a: 'Scores are based on budget clarity, scope specificity, response rate signals, and how well the lead matches your profile. A 9+ lead typically has a clear brief, a stated budget, and a hiring decision within two weeks.' },
  { q: 'Can I apply directly, or does LeadFlow intermediate?', a: 'We never intermediate. Every lead includes a direct link to the original post. You apply on the client\'s terms, on their platform.' },
  { q: 'How is this different from job boards?', a: 'Job boards surface everything. LeadFlow only surfaces what matches your profile, with quality scores so you can prioritise. Ten minutes on the best leads instead of an hour trawling noise.' },
  { q: 'What happens when my trial ends?', a: 'You move to the Free plan (3 leads/week) unless you upgrade. We\'ll remind you 48 hours before. No card required to start.' },
  { q: 'Can I cancel at any time?', a: 'Always. Cancel from your account settings at any time. You keep access until the end of your billing period. No fees, no friction.' },
  { q: 'What kinds of freelancers does LeadFlow work for?', a: 'Design, development, copywriting, marketing, and consulting. Our scoring model is tuned specifically for UK and remote freelance markets.' },
  { q: 'Is my profile data shared with clients?', a: 'Never. Your profile is used only to filter and score leads. Clients on other platforms cannot see your LeadFlow profile.' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [showSticky, setShowSticky] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, height: '58px',
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(13,15,20,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{ width: '100%', maxWidth: '1140px', margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'var(--cream)', fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em' }}>
            <div style={{ width: '28px', height: '28px', background: 'var(--amber)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>LF</div>
            LeadFlow
          </Link>
          <ul style={{ display: 'flex', alignItems: 'center', gap: '2px', listStyle: 'none', margin: 0 }}>
            {['How it works', 'Features', 'Pricing'].map(item => (
              <li key={item}>
                <a href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  style={{ color: 'var(--slate)', textDecoration: 'none', fontSize: '13.5px', fontWeight: 500, padding: '6px 14px', borderRadius: '4px', transition: 'color 0.15s, background 0.15s' }}
                  className="hover-target">{item}</a>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link href="/auth/login" className="btn-ghost-sm">Log in</Link>
            <Link href="/auth/signup" className="btn-amber">Start free trial →</Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} aria-label="Open menu" aria-expanded={menuOpen}
            style={{ display: 'none', background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', padding: '6px' }}
            className="md-hamburger">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div style={{ display: 'none', background: 'var(--ink-2)', borderBottom: '1px solid var(--border)', padding: '16px 32px 20px', flexDirection: 'column', gap: '4px' }} className="md-mobile-menu">
          {['How it works', 'Features', 'Pricing'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMenuOpen(false)}
              style={{ color: 'var(--slate)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>{item}</a>
          ))}
          <Link href="/auth/login" style={{ color: 'var(--slate)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 0', borderBottom: '1px solid var(--border)' }} onClick={() => setMenuOpen(false)}>Log in</Link>
          <Link href="/auth/signup" style={{ color: 'var(--amber)', textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '10px 0' }} onClick={() => setMenuOpen(false)}>Start free trial →</Link>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ position: 'relative', padding: '120px 0 100px', overflow: 'hidden', borderBottom: '1px solid var(--border)' }}>
        <div style={{ position: 'absolute', top: '-200px', right: '-100px', width: '600px', height: '600px', background: 'radial-gradient(ellipse, rgba(245,166,35,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
        <div className="noise-overlay" style={{ position: 'relative', zIndex: 1, maxWidth: '1140px', margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--amber-pale)', border: '1px solid rgba(245,166,35,0.20)', borderRadius: '100px', padding: '5px 14px 5px 8px', fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--amber)', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '28px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber)', animation: 'pulse 2s infinite' }} />
              340 UK freelancers already inside · beta
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 5.5vw, 74px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.03em', color: 'var(--cream)', marginBottom: '24px' }}>
              Stop trawling.<br />Start choosing<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>the right work.</em>
            </h1>
            <p style={{ fontSize: '17px', lineHeight: 1.65, color: 'var(--slate)', marginBottom: '40px', maxWidth: '400px' }}>
              You're a UK freelancer. You shouldn't be spending hours digging through job boards hoping something decent shows up. LeadFlow delivers pre-scored leads matched to your skills and rate — every 6 hours, while you're busy doing actual work.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
              <Link href="/auth/signup" className="btn-primary">Start my free trial →</Link>
              <a href="#how-it-works" className="btn-secondary">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                See how it works
              </a>
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', marginBottom: '20px', letterSpacing: '0.04em' }}>Set up in 2 minutes · No card required · First leads in under an hour</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { text: '3 leads on the free plan, always' },
                { text: 'We remind you before any charge' },
                { text: 'Cancel in one click, anytime' },
              ].map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--slate-2)' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(61,219,122,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="9" height="9" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#3DDB7A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  {t.text}
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="hero-visual-wrap">
            <div className="hero-accent-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Leads this week</span>
                <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--amber)' }}>47</span>
              </div>
              <svg width="100%" height="40" viewBox="0 0 168 40" fill="none" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="sG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F5A623" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#F5A623" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,34 C12,30 20,32 36,26 C52,20 60,24 84,16 C108,8 116,12 132,7 C148,2 156,4 168,2 L168,40 L0,40 Z" fill="url(#sG)" />
                <path d="M0,34 C12,30 20,32 36,26 C52,20 60,24 84,16 C108,8 116,12 132,7 C148,2 156,4 168,2" stroke="var(--amber)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <circle cx="168" cy="2" r="3" fill="var(--amber)" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px' }}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <span key={d} style={{ fontSize: '9.5px', fontFamily: 'var(--font-mono)', color: i === 6 ? 'var(--amber)' : 'var(--slate-3)' }}>{d}</span>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--amber), transparent)', opacity: 0.4 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--ink-3)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#FF5F57' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#FEBC2E' }} />
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#28C840' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--slate-2)', letterSpacing: '0.05em' }}>leadflow — your feed</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10.5px', fontFamily: 'var(--font-mono)', color: 'var(--green-score)' }}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green-score)', animation: 'pulse 1.5s infinite' }} />
                  LIVE
                </div>
              </div>
              <div style={{ padding: '14px 14px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11.5px', color: 'var(--slate)', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>UPDATED 8 MIN AGO</span>
                  <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 500, background: 'rgba(61,219,122,0.12)', color: 'var(--green-score)', padding: '3px 8px', borderRadius: '100px', border: '1px solid rgba(61,219,122,0.20)' }}>● 12 new today</span>
                </div>
                <div className="feed-filters">
                  {['All', 'Score 8+', { l: 'Design', f: true }, { l: 'Remote', f: true }, '£300+/day'].map((f, i) => (
                    <button key={i} className={`feed-filter ${i === 0 ? 'active' : ''}`}>
                      {typeof f === 'object' && f.f ? (
                        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                      ) : null}
                      {typeof f === 'string' ? f : f.l}
                    </button>
                  ))}
                </div>
                {[
                  { src: 'Reddit', cls: 'badge-src-reddit', title: 'Senior UX Designer — London (Fintech)', meta: '£350–450/day · Figma, Design Systems · IR35', score: '9.1', sc: 'score-hi' },
                  { src: 'Reed', cls: 'badge-src-reed', title: 'Motion Designer — Advertising Agency', meta: '£300–380/day · After Effects · Inside IR35', score: '9.0', sc: 'score-hi' },
                  { src: 'Reddit', cls: 'badge-src-reddit', title: 'Content Strategist — B2B SaaS, Remote', meta: '£350/day · Notion, Writing · 2-month contract', score: '8.5', sc: 'score-good' },
                  { src: 'WWR', cls: 'badge-src-wwr', title: 'Full-Stack Developer — Remote UK', meta: '£60–75k · React, Node.js · Starts ASAP', score: '8.7', sc: 'score-good' },
                  { src: 'WWR', cls: 'badge-src-wwr', title: 'Shopify Developer — E-commerce, Part-time', meta: '£45–55k · Liquid, JS · Ongoing', score: '7.8', sc: 'score-md' },
                  { src: 'Remote OK', cls: 'badge-src-reed', title: 'DevOps Engineer — Full-time Remote', meta: '£70–90k · AWS, Terraform, K8s', score: '8.9', sc: 'score-good' },
                ].map((lead, i) => (
                  <div key={i} style={{
                    background: 'var(--ink-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px',
                    marginBottom: i < 5 ? '6px' : '0',
                    display: 'flex', alignItems: 'center', gap: '12px', transition: 'border-color 0.2s, transform 0.2s',
                  }}>
                    <span style={{
                      fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase',
                      letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '3px', flexShrink: 0, minWidth: '44px', textAlign: 'center',
                    }} className={lead.cls}>{lead.src}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>{lead.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--slate-2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.meta}</div>
                    </div>
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, flexShrink: 0,
                    }} className={lead.sc}>{lead.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS ── */}
      <section className="reveal" style={{ borderBottom: '1px solid var(--border)', padding: '60px 0', position: 'relative' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            {
              num: '2,400', suf: '+', label: 'Leads processed weekly',
              spark: <svg width="80" height="24" viewBox="0 0 80 24" fill="none"><polyline points="0,20 10,17 20,18 30,14 40,12 50,10 60,8 70,5 80,3" stroke="var(--amber)" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" /><polyline points="0,20 10,17 20,18 30,14 40,12 50,10 60,8 70,5 80,3" stroke="var(--amber)" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.15" style={{ filter: 'blur(4px)' }} /></svg>,
            },
            {
              num: '340', suf: '+', label: 'Freelancers in beta',
              spark: <svg width="80" height="24" viewBox="0 0 80 24" fill="none"><polyline points="0,22 10,19 20,20 30,16 40,15 50,12 60,9 70,7 80,4" stroke="var(--green-score)" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.5" /></svg>,
            },
            {
              label: 'Refresh cycle — faster than your competition', num2: '6', suf: 'hr',
              spark: <div style={{ marginTop: '10px', display: 'flex', gap: '4px', alignItems: 'flex-end', height: '24px' }}>
                {[8,12,10,16,14,20,18,24].map((h, i) => (
                  <div key={i} style={{ width: '6px', height: `${h}px`, background: i === 7 ? 'var(--amber)' : `rgba(245,166,35,${0.2 + i * 0.05})`, borderRadius: '2px' }} />
                ))}
              </div>,
            },
            {
              num: '9.1', suf: '', label: 'Avg quality score of delivered leads',
              spark: <div style={{ marginTop: '10px' }}>
                <svg width="48" height="24" viewBox="0 0 48 24" fill="none">
                  <rect x="0" y="16" width="48" height="4" rx="2" fill="rgba(255,255,255,0.06)" />
                  <rect x="0" y="16" width="43.7" height="4" rx="2" fill="var(--green-score)" opacity="0.6" />
                </svg>
              </div>,
            },
          ].map((m, i) => (
            <div key={i} style={{ padding: '24px 32px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', position: 'relative' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.03em' }}>
                {m.num2 ? <span style={{ color: 'var(--amber)' }}>{m.num2}</span> : m.num}
                {m.suf && <span style={{ color: 'var(--amber)' }}>{m.suf}</span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--slate)', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: '8px' }}>{m.label}</div>
              {m.spark}
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="reveal section" style={{ padding: '72px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--amber)', opacity: 0.6 }} />
            From the beta
          </div>
          <div className="testimonial-grid">
            {[
              { initials: 'JM', name: 'Jamie M.', role: 'Freelance UX Designer · London', quote: 'I used to spend Monday mornings trawling boards. Now I open LeadFlow, check the top-scored leads in 10 minutes, and get back to the work I\'m actually paid to do.' },
              { initials: 'SR', name: 'Sarah R.', role: 'Freelance Copywriter · Remote UK', quote: 'The score system is the thing. I ignored anything under 8 for a week and ended up applying to fewer leads — and landing two conversations. That ratio has never happened on job boards.' },
              { initials: 'DK', name: 'Dan K.', role: 'Freelance Full-Stack Dev · Manchester', quote: 'First day on the Pro trial I had 14 leads that matched my rate. That\'s more in one morning than I\'d found in a week of doing it manually.' },
            ].map(t => (
              <div key={t.initials} className="testimonial-card">
                <div className="testimonial-quote">{t.quote}</div>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.initials}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="reveal section" style={{ borderBottom: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '820px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--amber)', opacity: 0.6 }} />
            Sound familiar?
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '36px' }}>
            An hour of searching.<br />One lead that <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>almost</em> fits.<br />Every single day.
          </h2>
          <div className="problem-grid">
            {[
              { svg: <><path d="M5 22h14M5 2h14M17 22v-4.172a2 2 0 00-.586-1.414L12 12l-4.414 4.414A2 2 0 007 17.828V22M17 2v4.172a2 2 0 01-.586 1.414L12 12 7.586 7.586A2 2 0 017 6.172V2" /></>, text: <><strong style={{ color: 'var(--cream)', fontWeight: 500 }}>You lose an hour every morning</strong> checking Reddit, Reed, and job boards — just to find one lead that's close to relevant. Most aren't.</> },
              { svg: <><line x1="1" y1="1" x2="23" y2="23" /><path d="M15.5 8.5A4 4 0 008 12v0a4 4 0 003 3.87M10 17H17M10 13H7" /></>, text: <><strong style={{ color: 'var(--cream)', fontWeight: 500 }}>You write a tailored proposal</strong> and then find out the budget was never listed anywhere. It was never going to match your rate.</> },
              { svg: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></>, text: <><strong style={{ color: 'var(--cream)', fontWeight: 500 }}>You finish a contract and surface</strong> to an empty pipeline. Then the whole cycle starts again — from zero, under pressure.</> },
            ].map((item, i) => (
              <div key={i} className="problem-item">
                <div className="problem-icon">
                  <svg width="18" height="18" fill="none" stroke="var(--slate-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">{item.svg}</svg>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--slate)', lineHeight: 1.65 }}>{item.text}</p>
              </div>
            ))}
          </div>
          <div className="problem-resolution-wrap">
            <div className="problem-resolution-icon">
              <svg width="18" height="18" fill="none" stroke="var(--amber)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div>
              <div className="problem-resolution-lead">Here's the fix</div>
              <div className="problem-resolution-punch">LeadFlow doesn't replace your ability to<em>win work</em>. It just stops you wasting it on the <em>wrong leads</em>.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="reveal section">
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--amber)', opacity: 0.6 }} />
            How it works
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1, letterSpacing: '-0.025em' }}>
            Two minutes to set up.<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Better leads by tonight.</em>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '80px', alignItems: 'start', marginTop: '64px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { num: '01', title: 'Tell us what good work looks like for you', desc: 'Your discipline, your day rate, the skills you want to be hired for. It takes about 2 minutes. That\'s how long it takes to never see an irrelevant lead again.' },
                { num: '02', title: 'We trawl four platforms so you don\'t have to', desc: 'Reddit, Reed, We Work Remotely, and more — checked every 6 hours. Every lead is scored 1–10 on budget clarity, scope fit, and rate match. Anything below your threshold doesn\'t make it through.' },
                { num: '03', title: 'Open 10 leads. Apply to the 3 worth your time', desc: 'Your feed shows scores at a glance. Every lead links directly to the original post — no platform in the way, no gatekeeping. You apply on the client\'s terms, as you always would.' },
              ].map((s, i) => (
                <div key={s.num} onClick={() => setActiveStep(i)}
                  style={{
                    padding: '28px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    display: 'flex', gap: '24px', cursor: 'pointer', transition: 'all 0.2s',
                    opacity: activeStep === i ? 1 : 0.6,
                  }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: activeStep === i ? 'var(--amber)' : 'var(--slate-2)', paddingTop: '3px', letterSpacing: '0.05em', flexShrink: 0, width: '28px', transition: 'color 0.2s' }}>{s.num}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: activeStep === i ? 'var(--cream)' : 'var(--slate)', marginBottom: '8px', transition: 'color 0.2s' }}>{s.title}</div>
                    <div style={{ fontSize: '13.5px', color: 'var(--slate-2)', lineHeight: 1.65 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--ink-2)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', minHeight: '300px', position: 'sticky', top: '80px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 16px', background: 'var(--ink-3)' }}>
                {['Profile', 'Scoring', 'Feed'].map((tab, i) => (
                  <button key={tab} onClick={() => setActiveStep(i)}
                    style={{
                      fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: activeStep === i ? 'var(--amber)' : 'var(--slate-2)',
                      padding: '11px 14px', borderBottom: activeStep === i ? '2px solid var(--amber)' : '2px solid transparent',
                      cursor: 'pointer', transition: 'color 0.15s', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                    }}>
                    {tab}
                  </button>
                ))}
              </div>
              <div style={{ padding: '20px', flex: 1 }}>
                {activeStep === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div className="form-label">Discipline</div>
                      <div style={{ background: 'var(--ink-3)', border: '1px solid var(--border-card)', borderRadius: '4px', padding: '8px 12px', fontSize: '12.5px', color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>UX / Product Design</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div className="form-label">Day rate (£)</div>
                      <div style={{ background: 'var(--ink-3)', border: '1px solid var(--border-card)', borderRadius: '4px', padding: '8px 12px', fontSize: '12.5px', color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>350 – 500</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div className="form-label">Skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                        {['Figma', 'Design Systems', 'Prototyping', 'User Research', 'Fintech'].map(s => (
                          <span key={s} className="skill-tag">{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div className="form-label">Work type</div>
                      <div style={{ background: 'var(--ink-3)', border: '1px solid var(--border-card)', borderRadius: '4px', padding: '8px 12px', fontSize: '12.5px', color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>Contract · Remote / London</div>
                    </div>
                  </div>
                )}
                {activeStep === 1 && (
                  <div>
                    <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate)' }}>Senior UX Designer — Fintech</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 500, color: 'var(--green-score)' }}>9.1</span>
                    </div>
                    <div className="score-breakdown">
                      {[
                        { label: 'Budget clarity', w: '95%', v: '9.5' },
                        { label: 'Scope detail', w: '88%', v: '8.8' },
                        { label: 'Skill match', w: '100%', v: '10' },
                        { label: 'Timeline clarity', w: '82%', v: '8.2' },
                        { label: 'Rate signal', w: '90%', v: '9.0' },
                      ].map(r => (
                        <div key={r.label} className="score-row">
                          <span className="score-row-label">{r.label}</span>
                          <div className="score-bar-track"><div className="score-bar-fill" style={{ width: r.w }} /></div>
                          <span className="score-row-val">{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {activeStep === 2 && (
                  <div>
                    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', marginBottom: '12px' }}>SHOWING 4 OF 16 LEADS · SORTED BY SCORE</div>
                    {[
                      { src: 'Reddit', cls: 'badge-src-reddit', title: 'Senior UX Designer — London', meta: '£350–450/day', score: '9.1', scls: 'score-hi' },
                      { src: 'WWR', cls: 'badge-src-wwr', title: 'Product Designer — Fully Remote', meta: '£55–65k', score: '8.3', scls: 'score-hi' },
                      { src: 'Reed', cls: 'badge-src-reed', title: 'Brand Identity — 3-month contract', meta: '£40k pro rata', score: '7.4', scls: 'score-md' },
                    ].map((l, i) => (
                      <div key={i} className="lead-item" style={{ marginBottom: i < 2 ? '6px' : '0' }}>
                        <span className={`src-badge ${l.cls}`} style={{
                          fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase',
                          letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '3px', flexShrink: 0, minWidth: '44px', textAlign: 'center',
                        } as React.CSSProperties}>{l.src}</span>
                        <div className="lead-text">
                          <div className="lead-title" style={{ fontSize: '12px' }}>{l.title}</div>
                          <div className="lead-meta">{l.meta}</div>
                        </div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, flexShrink: 0 }} className={l.scls}>{l.score}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="reveal section">
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--amber)', opacity: 0.6 }} />
            Why freelancers switch to LeadFlow
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1, letterSpacing: '-0.025em', marginBottom: '0' }}>
            You already know how to<br />win the work. <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>We find it.</em>
          </h2>
          <div className="features-grid">
            {[
              { icon: 'star', title: 'A score before you even open it', desc: 'Every lead is rated 1–10 before it reaches your feed — on budget clarity, scope detail, and how well it matches your skills and rate. You prioritise in seconds, not after reading four paragraphs.' },
              { icon: 'clock', title: 'Leads hours old, not days old', desc: 'We check every 6 hours. By the time you open your feed, you\'re still near the front of the queue — not buried under 40 applications from people who saw it two days before you.' },
              { icon: 'filter', title: 'Every lead you see was put there for you', desc: 'If it doesn\'t match your skills or rate, it never reaches your feed. No scrolling past listings for roles you can\'t fill. Every item is there deliberately — filtered against your profile, not a generic algorithm.' },
              { icon: 'pound', title: 'See the budget before you write a word', desc: 'Leads without a stated budget get scored down automatically. Real numbers are always visible. Stop spending an hour on a proposal that was never going to pay your rate — because you couldn\'t see the number until the end.' },
              { icon: 'link', title: 'Apply directly — we\'re never in the way', desc: 'Every lead links straight to the original post on the client\'s platform. You deal with them directly. LeadFlow is a filter, not a middleman. No platform commission, no mediated conversation, no gatekeeping.' },
              { icon: 'grid', title: 'Nothing promising slips through the cracks', desc: 'Track everything from first look to won contract — one clean pipeline view, no spreadsheet, no "wait, did I reply to that one?" Every application has a clear status. Nothing gets lost.' },
            ].map((f, i) => (
              <div key={i} className="feature-cell" data-num={String(i + 1).padStart(2, '0')}>
                <div className="feature-icon">
                  <svg width="28" height="28" fill="none" stroke="var(--amber)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    {f.icon === 'star' && <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" />}
                    {f.icon === 'clock' && <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14.5" /></>}
                    {f.icon === 'filter' && <><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>}
                    {f.icon === 'pound' && <><path d="M8 16h9M7 20h10M10 16v-5a3 3 0 016 0v1M10 11a3 3 0 01-3 3H7" /></>}
                    {f.icon === 'link' && <><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>}
                    {f.icon === 'grid' && <><rect x="2" y="3" width="5" height="18" rx="1" /><rect x="9.5" y="3" width="5" height="12" rx="1" /><rect x="17" y="3" width="5" height="7" rx="1" /></>}
                  </svg>
                </div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="reveal section">
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--amber)', opacity: 0.6 }} />
            Pricing
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1, letterSpacing: '-0.025em' }}>
            No hidden steps. Here's<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>exactly</em> what happens.
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--slate)', marginTop: '12px', maxWidth: '480px', lineHeight: 1.65 }}>
            Start with the full Pro feed today — no card, no commitment. We'll tell you before anything changes.
          </p>

          <div className="trial-timeline" style={{ margin: '40px 0 48px' }}>
            {[
              { day: 'Today', amber: true, desc: '<strong>You unlock the full Pro feed.</strong> Unlimited leads, AI scores, skill filtering — everything, immediately. No card needed.' },
              { day: 'Day 5', amber: false, desc: '<strong>We email you a heads-up.</strong> Two days before anything happens, we\'ll remind you the trial is ending — so you can decide without pressure.' },
              { day: 'Day 7', amber: false, desc: '<strong>Your first charge, if you stay.</strong> Cancel any time before then and you pay nothing. One click in your account settings.' },
            ].map((t, i) => (
              <div key={t.day} className="trial-step" style={{ borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div className="trial-day" style={{ color: t.amber ? 'var(--amber)' : 'var(--amber)' }}>{t.day}</div>
                <div className="trial-connector">
                  <div className={`trial-dot ${t.amber ? 'trial-dot-amber' : ''}`} />
                  {i < 2 && <div className="trial-line" />}
                </div>
                <div className="trial-desc" dangerouslySetInnerHTML={{ __html: t.desc }} />
              </div>
            ))}
          </div>

          <div className="pricing-toggle-row">
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--slate)' }}>Choose a plan</span>
            <div className="pricing-toggle">
              <span className="toggle-label active" style={{ color: annual ? 'var(--slate)' : 'var(--cream)' }}>Monthly</span>
              <button onClick={() => setAnnual(!annual)}
                className={`toggle-switch ${annual ? 'on' : ''}`}
                role="switch" aria-checked={annual}>
                <div className="toggle-knob" />
              </button>
              <span className="toggle-label" style={{ color: annual ? 'var(--cream)' : 'var(--slate)' }}>Annual</span>
              <span className="annual-badge" style={{ opacity: annual ? 1 : 0.4 }}>Save 2 months</span>
            </div>
          </div>

          <div className="pricing-grid-2">
            <div className="pricing-card-2">
              <div className="plan-tier">Free</div>
              <div className="plan-cost-row">
                <div className="plan-big-price">£0</div>
                <div className="plan-cost-meta">forever · no expiry</div>
              </div>
              <div className="plan-desc-2">For exploring. 3 leads a week to see if the quality is worth it — no deadline, no catch.</div>
              <Link href="/auth/signup" className="plan-btn plan-btn-secondary" style={{ marginBottom: '24px', display: 'block', width: '100%', textAlign: 'center', padding: '12px', borderRadius: 'var(--radius)', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)', transition: 'all 0.15s', background: 'transparent', color: 'var(--slate)', border: '1px solid var(--border-card)' }}>Start with free plan</Link>
              <div className="plan-feat-group">
                <div className="plan-feat-label">What's included</div>
                {['3 leads per week', 'AI quality scores visible', 'Direct links to original posts'].map(f => (
                  <div key={f} className="plan-feat-row">
                    <svg width="14" height="14" fill="none" stroke="var(--green-score)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                    {f}
                  </div>
                ))}
              </div>
              <div className="plan-upgrade-hint">
                <svg width="13" height="13" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                Upgrade to Pro for unlimited leads + skill filtering
              </div>
            </div>

            <div className="pricing-card-2 pricing-card-featured">
              <div className="plan-badge-2">
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21 12 17.77 5.82 21 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                Most popular · 7-day free trial
              </div>
              <div className="plan-tier">Pro</div>
              <div className="plan-cost-row">
                <div className="plan-big-price">£{annual ? '24' : '29'}</div>
                <div className="plan-cost-meta" style={{ color: 'var(--slate-2)' }}>{annual ? 'per month, billed annually' : 'per month · cancel any time'}</div>
              </div>
              {annual && <div className="plan-saving">You save £70 vs monthly — 2 months free</div>}
              <div className="plan-desc-2">For freelancers who want a steady pipeline without the daily grind of job board trawling.</div>
              <Link href="/auth/signup" className="plan-btn plan-btn-primary" style={{ marginBottom: '12px', display: 'block', width: '100%', textAlign: 'center', padding: '12px', borderRadius: 'var(--radius)', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)', transition: 'all 0.15s', background: 'var(--amber)', color: 'var(--ink)', border: 'none' }}>Start my 7-day free trial</Link>
              <div className="plan-guarantee" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.02em' }}>
                <svg width="13" height="13" fill="none" stroke="var(--green-score)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                First charge on day 7. We remind you on day 5.
              </div>
              <div className="plan-feat-group">
                <div className="plan-feat-label">Everything in Free, plus</div>
                {[
                  'Unlimited leads, every 6 hours',
                  'Skill + rate filtering',
                  'Daily email digest',
                  'Pipeline tracking',
                  'Custom lead alerts',
                  'Analytics dashboard + CSV export',
                  'Priority support + onboarding call',
                ].map(f => (
                  <div key={f} className="plan-feat-row">
                    <svg width="14" height="14" fill="none" stroke="var(--amber)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" /></svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="reveal section">
        <div style={{ maxWidth: '780px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'inline-block', width: '20px', height: '1px', background: 'var(--amber)', opacity: 0.6 }} />
            FAQ
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 3.5vw, 46px)', fontWeight: 700, color: 'var(--cream)', lineHeight: 1.1, letterSpacing: '-0.025em' }}>
            Questions worth asking<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>before you start.</em>
          </h2>
          <div className="faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className="faq-item">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="faq-btn" aria-expanded={openFaq === i}>
                  {faq.q}
                  <span className="faq-icon" style={{ transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)', color: openFaq === i ? 'var(--amber)' : 'var(--slate-2)' }}>+</span>
                </button>
                <div className="faq-answer" style={{ maxHeight: openFaq === i ? '200px' : '0' }}>
                  <div className="faq-answer-inner">{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section reveal">
        <div className="cta-inner">
          <div className="eyebrow" style={{ justifyContent: 'center' }}>Get started</div>
          <h2>Your next client lead<br />arrives in <em>under an hour.</em></h2>
          <p>Set up your profile in 2 minutes. We'll scan the boards and push your first matched, scored leads before you've finished your next coffee. No card. We remind you on day 5 before anything gets charged.</p>
          <div className="cta-btns">
            <Link href="/auth/signup" className="btn-primary">Start my free trial →</Link>
            <Link href="/auth/login" className="btn-secondary">Log in</Link>
          </div>
          <div style={{ marginTop: '20px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.03em' }}>
            7-day trial · reminder on day 5 · cancel in one click
          </div>
        </div>
      </section>

      {/* ── STICKY BAR ── */}
      <div className={`sticky-bar ${showSticky ? 'visible' : ''}`}>
        <p><span style={{ color: 'var(--cream)' }}>7-day free trial</span> · Full Pro feed from day one · We remind you on day 5 · Cancel any time</p>
        <Link href="/auth/signup" className="btn-amber">Start my free trial →</Link>
      </div>

      {/* ── FOOTER ── */}
      <footer>
        <div className="footer-inner">
          <div className="footer-grid">
            <div className="footer-brand">
              <Link href="/" className="logo" style={{ marginBottom: '4px' }}>
                <div className="logo-mark">LF</div>
                LeadFlow
              </Link>
              <p>Quality freelance leads, scored by AI, delivered every 6 hours. Stop hunting, start choosing.</p>
            </div>
            <div className="footer-col">
              <h5>Product</h5>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="/blog">Blog</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
                <li><a href="/careers">Careers</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Legal</h5>
              <ul>
                <li><a href="/privacy">Privacy policy</a></li>
                <li><a href="/terms">Terms of service</a></li>
                <li><a href="/cookies">Cookie policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span className="footer-copy">&copy; {new Date().getFullYear()} LeadFlow. All rights reserved.</span>
            <div className="footer-links">
              <a href="/privacy">Privacy</a>
              <a href="/terms">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
