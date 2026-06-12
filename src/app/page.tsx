'use client'

import { useState, useEffect, useRef } from 'react'
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

const newLeads = [
  { src: 'Reddit', srcClass: 'badge-src-reddit', title: 'Content Strategist — B2B SaaS, Remote', meta: '£350/day · Notion, Writing · 2-month contract', score: '8.5', scoreClass: 'score-hi' },
  { src: 'WWR', srcClass: 'badge-src-wwr', title: 'Shopify Developer — E-commerce, Part-time', meta: '£45–55k · Liquid, JS · Ongoing', score: '7.8', scoreClass: 'score-hi' },
  { src: 'Reed', srcClass: 'badge-src-reed', title: 'Motion Designer — Advertising Agency', meta: '£300–380/day · After Effects · Inside IR35', score: '9.0', scoreClass: 'score-hi' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const [showSticky, setShowSticky] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [leads, setLeads] = useState([
    { src: 'Reddit', srcClass: 'badge-src-reddit', title: 'Senior UX Designer — London (Fintech)', meta: '£350–450/day · Figma, Design Systems · IR35', score: '9.1', scoreClass: 'score-hi' },
    { src: 'WWR', srcClass: 'badge-src-wwr', title: 'Full-Stack Developer — Remote UK', meta: '£60–75k · React, Node.js · Starts ASAP', score: '8.7', scoreClass: 'score-hi' },
    { src: 'Reed', srcClass: 'badge-src-reed', title: 'Brand Identity — 3-month contract', meta: '£40k pro rata · Branding, Illustrator', score: '7.4', scoreClass: 'score-md' },
    { src: 'Remote OK', srcClass: 'badge-src-reed', title: 'DevOps Engineer — Full-time Remote', meta: '£70–90k · AWS, Terraform, K8s', score: '8.9', scoreClass: 'score-hi' },
  ])

  const leadIndex = useRef(0)

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

  useEffect(() => {
    const interval = setInterval(() => {
      const lead = newLeads[leadIndex.current % newLeads.length]
      leadIndex.current++
      setLeads(prev => {
        const next = [...prev]
        next.pop()
        const el = {
          ...lead,
          className: 'score-hi',
          scoreClass: lead.scoreClass,
          srcClass: lead.srcClass,
        }
        return [el, ...next]
      })
    }, 4500)
    return () => clearInterval(interval)
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
              340 UK freelancers already inside
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 5.5vw, 74px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.03em', color: 'var(--cream)', marginBottom: '24px' }}>
              The right clients<br />are out there.<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>Find them in minutes.</em>
            </h1>
            <p style={{ fontSize: '17px', lineHeight: 1.65, color: 'var(--slate)', marginBottom: '40px', maxWidth: '400px' }}>
              If you're a UK freelancer spending hours trawling job boards for decent work, LeadFlow fixes that. We surface the leads that match your skills and rate — scored, filtered, and waiting for you every 6 hours.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
              <Link href="/auth/signup" className="btn-primary">Start my free trial →</Link>
              <a href="#how-it-works" className="btn-secondary">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                See how it works
              </a>
            </div>
            <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', marginBottom: '20px', letterSpacing: '0.04em' }}>Takes 2 minutes. No card needed.</div>
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

          {/* Feed card */}
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
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--slate)', fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>UPDATED 8 MIN AGO</span>
                <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 500, background: 'rgba(61,219,122,0.12)', color: 'var(--green-score)', padding: '3px 8px', borderRadius: '100px', border: '1px solid rgba(61,219,122,0.20)' }}>● 12 new today</span>
              </div>
              {leads.map((lead, i) => (
                <div key={i} style={{
                  background: 'var(--ink-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px',
                  marginBottom: i < leads.length - 1 ? '8px' : '0',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  transition: 'border-color 0.2s, transform 0.2s',
                }}>
                  <span style={{
                    fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase',
                    letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '3px', flexShrink: 0, minWidth: '44px', textAlign: 'center',
                  }} className={lead.srcClass}>{lead.src}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>{lead.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--slate-2)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.meta}</div>
                  </div>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 500, flexShrink: 0,
                  }} className={lead.scoreClass}>{lead.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── METRICS ── */}
      <section className="reveal" style={{ borderBottom: '1px solid var(--border)', padding: '60px 0', position: 'relative' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {[
            { num: '2,400', suf: '+', label: 'Leads processed' },
            { num: '340', suf: '+', label: 'Freelancers in beta' },
            { num: '', suf: '6hr', label: 'Refresh cycle', num2: '6' },
            { num: '9.1', suf: '', label: 'Avg quality score' },
          ].map((m, i) => (
            <div key={i} style={{ padding: '24px 32px', borderRight: i < 3 ? '1px solid var(--border)' : 'none', position: 'relative' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1, marginBottom: '6px', letterSpacing: '-0.03em' }}>
                {m.num2 ? <span style={{ color: 'var(--amber)' }}>{m.num2}</span> : m.num}
                {m.suf && <span style={{ color: 'var(--amber)' }}>{m.suf}</span>}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--slate)', fontFamily: 'var(--font-mono)', letterSpacing: '0.03em', textTransform: 'uppercase' }}>{m.label}</div>
            </div>
          ))}
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
            Most freelancers spend<br />more time <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>looking for work</em><br />than doing it.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '36px' }}>
            {[
              'You check Reddit, Reed, and job boards every day — and spend an hour finding one lead that\'s even close to relevant.',
              'You write a tailored proposal, then find out the budget was never going to work — because it wasn\'t listed anywhere.',
              'You land a contract and go heads-down — then surface weeks later with an empty pipeline and start the whole search again.',
            ].map((text, i) => (
              <div key={i} style={{ background: 'var(--ink-2)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" fill="none" stroke="var(--slate-2)" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <p style={{ fontSize: '14px', color: 'var(--slate)', lineHeight: 1.65 }}>{text}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '16px', color: 'var(--cream)', fontWeight: 500, lineHeight: 1.55, paddingTop: '28px', borderTop: '1px solid var(--border)', maxWidth: '560px' }}>
            LeadFlow doesn't replace your ability to win work. It just stops you wasting it on the wrong leads.
          </p>
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
            You tell us what you're<br />worth. <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>We find the work.</em>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '80px', alignItems: 'start', marginTop: '64px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { num: '01', title: 'Tell us what good work looks like for you', desc: 'Your skills, your day rate, the kind of contracts you actually want. Two minutes. That\'s how long it takes to stop seeing irrelevant leads forever.' },
                { num: '02', title: 'We do the trawling so you don\'t have to', desc: 'Reddit, Reed, and We Work Remotely — checked every 6 hours. Every lead is scored 1–10 on budget clarity, scope, and fit. Bad leads don\'t make it through.' },
                { num: '03', title: 'Spend 10 minutes on the ones worth your time', desc: 'Open your feed. Every lead links directly to the original post — no middleman, no gatekeeping. You apply on the client\'s platform with nothing in the way.' },
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
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Discipline</div>
                      <div style={{ background: 'var(--ink-3)', border: '1px solid var(--border-card)', borderRadius: '4px', padding: '8px 12px', fontSize: '12.5px', color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>UX / Product Design</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Day rate (£)</div>
                      <div style={{ background: 'var(--ink-3)', border: '1px solid var(--border-card)', borderRadius: '4px', padding: '8px 12px', fontSize: '12.5px', color: 'var(--cream)', fontFamily: 'var(--font-mono)' }}>350 – 500</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Skills</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '4px' }}>
                        {['Figma', 'Design Systems', 'Prototyping', 'User Research', 'Fintech'].map(s => (
                          <span key={s} style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', background: 'var(--amber-pale)', color: 'var(--amber)', border: '1px solid rgba(245,166,35,0.18)', borderRadius: '3px', padding: '3px 8px', letterSpacing: '0.04em' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Work type</div>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {[
                        { label: 'Budget clarity', w: '95%', v: '9.5' },
                        { label: 'Scope detail', w: '88%', v: '8.8' },
                        { label: 'Skill match', w: '100%', v: '10' },
                        { label: 'Timeline clarity', w: '82%', v: '8.2' },
                        { label: 'Rate signal', w: '90%', v: '9.0' },
                      ].map(r => (
                        <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--slate)', minWidth: '100px' }}>{r.label}</span>
                          <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', borderRadius: '2px', background: 'var(--green-score)', width: r.w, transition: 'width 1s ease' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--slate)', minWidth: '28px', textAlign: 'right' }}>{r.v}</span>
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
                      <div key={i} style={{ background: 'var(--ink-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: i < 2 ? '6px' : '0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 7px', borderRadius: '3px', flexShrink: 0, minWidth: '44px', textAlign: 'center' }} className={l.cls}>{l.src}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}>{l.title}</div>
                          <div style={{ fontSize: '11px', color: 'var(--slate-2)', fontFamily: 'var(--font-mono)' }}>{l.meta}</div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginTop: '64px' }}>
            {[
              { icon: 'star', title: 'Know which leads are worth opening', desc: 'Every lead is scored 1–10 before you see it. Budget clarity, scope detail, skill match — you prioritise in seconds, not after 20 minutes of digging.' },
              { icon: 'clock', title: 'Never miss work posted this morning', desc: 'We check every 6 hours. By the time you open your feed, the best leads are hours old — not days. You\'re never competing from the back of the queue.' },
              { icon: 'user', title: 'Only see leads that are actually for you', desc: 'Leads that don\'t match your skills or rate never reach your feed. No scrolling past irrelevant listings. Every item you see was put there deliberately.' },
              { icon: 'cash', title: 'Stop applying blind — see the budget first', desc: 'Real numbers, always visible. Leads without stated budgets are scored down automatically. No more writing proposals for work that was never going to pay your rate.' },
              { icon: 'link', title: 'Apply directly — we never get in the way', desc: 'Every lead links straight to the original post. You deal with the client directly, on their platform, on their terms. We\'re a filter, not a middleman.' },
              { icon: 'grid', title: 'Always know where each application stands', desc: 'Track everything from first look to won contract. No spreadsheet, no memory required — just a clear pipeline so nothing promising slips through.' },
            ].map((f, i) => (
              <div key={i} style={{ background: 'var(--ink-2)', padding: '32px 28px', transition: 'background 0.2s', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '20px', right: '20px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--slate-3)', letterSpacing: '0.06em' }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ width: '36px', height: '36px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="22" height="22" fill="none" stroke="var(--amber)" strokeWidth="1.6" viewBox="0 0 24 24">
                    {f.icon === 'star' && <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z" />}
                    {f.icon === 'clock' && <><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></>}
                    {f.icon === 'user' && <><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></>}
                    {f.icon === 'cash' && <><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>}
                    {f.icon === 'link' && <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07L11 5.93" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07L12.9 19" /></>}
                    {f.icon === 'grid' && <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 17.5h7M17.5 14v7" /></>}
                  </svg>
                </div>
                <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--cream)', marginBottom: '8px' }}>{f.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--slate)', lineHeight: 1.65 }}>{f.desc}</div>
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
            How your free trial works.
          </h2>
          <p style={{ fontSize: '15px', color: 'var(--slate)', marginTop: '12px', maxWidth: '480px', lineHeight: 1.65 }}>
            No pressure. Here's exactly what happens — we think you should know before you start.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, margin: '40px 0 48px', maxWidth: '560px', background: 'var(--ink-2)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {[
              { day: 'Today', amber: true, desc: '<strong>You unlock the full Pro feed.</strong> Unlimited leads, AI scores, skill filtering — everything, immediately. No card needed.' },
              { day: 'Day 5', amber: false, desc: '<strong>We email you a heads-up.</strong> Two days before anything happens, we\'ll remind you the trial is ending — so you can decide without pressure.' },
              { day: 'Day 7', amber: false, desc: '<strong>Your first charge, if you stay.</strong> Cancel any time before then and you pay nothing. One click in your account settings.' },
            ].map((t, i) => (
              <div key={t.day} style={{ display: 'grid', gridTemplateColumns: '64px 28px 1fr', padding: '20px 24px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: t.amber ? 'var(--amber)' : 'var(--slate-2)', letterSpacing: '0.08em', textTransform: 'uppercase', paddingTop: '2px', fontWeight: 500 }}>{t.day}</div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '4px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: t.amber ? 'var(--amber)' : 'var(--slate-3)', border: t.amber ? '1px solid var(--amber)' : '1px solid var(--border-card)', flexShrink: 0, zIndex: 1 }} />
                  {i < 2 && <div style={{ width: '1px', flex: 1, background: 'var(--border-card)', marginTop: '6px', minHeight: '24px' }} />}
                </div>
                <div style={{ fontSize: '13.5px', color: 'var(--slate)', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: t.desc }} />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '40px', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--slate)' }}>Choose a plan</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: annual ? 'var(--slate)' : 'var(--cream)' }}>Monthly</span>
              <button onClick={() => setAnnual(!annual)}
                style={{ width: '42px', height: '24px', borderRadius: '100px', background: annual ? 'var(--amber)' : 'var(--slate-3)', position: 'relative', cursor: 'pointer', border: 'none', transition: 'background 0.2s' }}
                role="switch" aria-checked={annual}>
                <div style={{ position: 'absolute', top: '3px', left: '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: annual ? 'translateX(18px)' : 'translateX(0)' }} />
              </button>
              <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: annual ? 'var(--cream)' : 'var(--slate)' }}>Annual</span>
              <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', background: 'var(--amber-pale)', color: 'var(--amber)', border: '1px solid rgba(245,166,35,0.20)', padding: '3px 9px', borderRadius: '100px', letterSpacing: '0.04em', opacity: annual ? 1 : 0.4 }}>Save 2 months</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '56px' }}>
            {[
              {
                tier: 'Free', price: '0', cadence: 'forever — no expiry', desc: 'Good if you\'re exploring. 3 leads a week, always — no trial, no deadline, no catch.',
                features: ['3 leads per week', 'AI quality scores visible', 'Direct links to original posts'],
                featured: false, btnText: 'Start with free plan', btnClass: 'plan-btn-secondary',
              },
              {
                tier: 'Pro', price: annual ? '24' : '29', cadence: 'per month · cancel any time', desc: 'For freelancers who want a steady pipeline. Unlimited leads, filtered to your skills and rate.',
                features: ['Unlimited leads', 'Skill + rate filtering', 'Daily email digest', 'Pipeline tracking', 'Priority support'],
                featured: true, badge: 'Most popular', btnText: 'Start my 7-day free trial', btnClass: 'plan-btn-primary',
                guarantee: true,
              },
              {
                tier: 'Growth', price: annual ? '40' : '49', cadence: 'per month · cancel any time', desc: 'For freelancers who want every edge — alerts, analytics, and a dedicated onboarding call.',
                features: ['Everything in Pro', 'Custom lead alerts', 'Analytics dashboard', 'CSV export', 'Dedicated onboarding call'],
                featured: false, btnText: 'Start my 7-day free trial', btnClass: 'plan-btn-secondary',
                guarantee: true,
              },
            ].map(p => (
              <div key={p.tier} style={{
                background: p.featured ? 'linear-gradient(160deg, var(--ink-3), var(--ink-2))' : 'var(--ink-2)',
                border: p.featured ? `1px solid var(--amber)` : '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)', padding: '32px', position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: p.featured ? '0 0 0 1px rgba(245,166,35,0.15), 0 12px 40px rgba(245,166,35,0.08)' : 'none',
              }}>
                {p.badge && (
                  <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontFamily: 'var(--font-mono)', fontWeight: 500, background: 'var(--amber)', color: 'var(--ink)', padding: '4px 14px', borderRadius: '100px', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {p.badge}
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: '12px' }}>{p.tier}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 900, color: 'var(--cream)', lineHeight: 1, letterSpacing: '-0.03em', marginBottom: '4px' }}>
                  <sup style={{ fontSize: '22px', fontFamily: 'var(--font-body)', fontWeight: 600, verticalAlign: 'top', marginTop: '10px', display: 'inline-block' }}>£</sup>{p.price}
                </div>
                <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', marginBottom: '8px' }}>{p.cadence}</div>
                <div style={{ fontSize: '13px', color: 'var(--slate)', lineHeight: 1.55, marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>{p.desc}</div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px', padding: 0 }}>
                  {p.features.map(f => (
                    <li key={f} style={{ fontSize: '13px', color: 'var(--slate)', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>→</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" style={{
                  display: 'block', width: '100%', textAlign: 'center', padding: '12px', borderRadius: 'var(--radius)',
                  fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', fontFamily: 'var(--font-body)',
                  transition: 'all 0.15s',
                  ...(p.featured
                    ? { background: 'var(--amber)', color: 'var(--ink)', border: 'none' }
                    : { background: 'transparent', color: 'var(--slate)', border: '1px solid var(--border-card)' }
                  ),
                }}
                  className={p.featured ? '' : ''}
                  onMouseEnter={e => { if (!p.featured) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.20)'; e.currentTarget.style.color = 'var(--cream)' }}}
                  onMouseLeave={e => { if (!p.featured) { e.currentTarget.style.borderColor = 'var(--border-card)'; e.currentTarget.style.color = 'var(--slate)' }}}>
                  {p.btnText}
                </Link>
                {p.guarantee && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', fontSize: '11.5px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.02em' }}>
                    <svg width="13" height="13" fill="none" stroke="var(--green-score)" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    First charge on day 7. We remind you on day 5.
                  </div>
                )}
              </div>
            ))}
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
            Things worth knowing<br />before you start.
          </h2>
          <div style={{ marginTop: '56px', borderTop: '1px solid var(--border)' }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14.5px', fontWeight: 500, color: 'var(--cream)', textAlign: 'left', gap: '24px', fontFamily: 'var(--font-body)' }}>
                  {faq.q}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: openFaq === i ? 'var(--amber)' : 'var(--slate-2)', flexShrink: 0, transition: 'transform 0.25s, color 0.15s', width: '20px', textAlign: 'center', transform: openFaq === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
                </button>
                <div style={{ maxHeight: openFaq === i ? '200px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease, padding 0.35s ease' }}>
                  <div style={{ paddingBottom: '22px', fontSize: '14px', color: 'var(--slate)', lineHeight: 1.7, maxWidth: '680px' }}>{faq.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="reveal" style={{ padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(245,166,35,0.06) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--amber)', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            Get started
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 900, color: 'var(--cream)', lineHeight: 1.06, letterSpacing: '-0.03em', marginBottom: '20px' }}>
            Your first leads are<br /><em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>4 minutes away.</em>
          </h2>
          <p style={{ fontSize: '16px', color: 'var(--slate)', marginBottom: '40px', lineHeight: 1.6 }}>
            Build your profile, see your matched leads instantly. No card. We'll remind you before anything gets charged.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/signup" className="btn-primary">Start my free trial →</Link>
            <Link href="/auth/login" className="btn-secondary">Log in</Link>
          </div>
          <div style={{ marginTop: '20px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', letterSpacing: '0.03em' }}>
            7-day trial · reminder on day 5 · cancel in one click
          </div>
        </div>
      </section>

      {/* ── STICKY BAR ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 99,
        background: 'rgba(22,26,35,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border-card)',
        padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        transform: showSticky ? 'translateY(0)' : 'translateY(100%)',
        opacity: showSticky ? 1 : 0,
        transition: 'transform 0.35s ease, opacity 0.35s ease',
      }}>
        <p style={{ fontSize: '13.5px', color: 'var(--slate)' }}>
          <span style={{ color: 'var(--cream)' }}>Free trial, 7 days</span> · We remind you before day 7 · No card to start
        </p>
        <Link href="/auth/signup" className="btn-amber">Start my free trial →</Link>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '60px 0 40px' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', padding: '0 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: '48px', marginBottom: '48px' }}>
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '4px', color: 'var(--cream)' }}>
                <div style={{ width: '28px', height: '28px', background: 'var(--amber)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>LF</div>
                LeadFlow
              </Link>
              <p style={{ fontSize: '12.5px', color: 'var(--slate-2)', lineHeight: 1.6, marginTop: '12px', maxWidth: '220px' }}>Quality freelance leads, scored by AI, delivered every 6 hours. Stop hunting, start choosing.</p>
            </div>
            {[
              { title: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }, { label: 'Blog', href: '/blog' }] },
              { title: 'Company', links: [{ label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }, { label: 'Careers', href: '/careers' }] },
              { title: 'Legal', links: [{ label: 'Privacy policy', href: '/privacy' }, { label: 'Terms of service', href: '/terms' }, { label: 'Cookie policy', href: '/cookies' }] },
            ].map(col => (
              <div key={col.title}>
                <h5 style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--slate-2)', marginBottom: '16px', margin: '0 0 16px 0', fontWeight: 400 }}>{col.title}</h5>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0, margin: 0 }}>
                  {col.links.map(link => (
                    <li key={link.label}>
                      <a href={link.href} style={{ fontSize: '13px', color: 'var(--slate-2)', textDecoration: 'none', transition: 'color 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--cream)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--slate-2)'}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: '28px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)' }}>&copy; {new Date().getFullYear()} LeadFlow. All rights reserved.</span>
            <div style={{ display: 'flex', gap: '20px' }}>
              <a href="/privacy" style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--cream)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--slate-2)'}>Privacy</a>
              <a href="/terms" style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--slate-2)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--cream)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--slate-2)'}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
