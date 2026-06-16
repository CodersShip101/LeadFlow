'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { PRICING, TIER_ICONS, planFeatures } from '@/lib/tiers'
import SeatControl from '@/components/SeatControl'

const incomingSignals = [
  { src: 'REDDIT', c: 'rgba(255,140,66,.14)', t: '#ff9c5b', title: 'Content Strategist — B2B SaaS, Remote', meta: '£350/day · Notion, Writing · 2-month', score: '8.5', cls: 'score-a' },
  { src: 'WWR', c: 'rgba(110,168,212,.16)', t: '#7fb6e6', title: 'Shopify Developer — E-commerce', meta: '£45–55k · Liquid, JS · Ongoing', score: '7.8', cls: 'score-b' },
  { src: 'REED', c: 'rgba(176,138,219,.16)', t: '#c4a3ec', title: 'Motion Designer — Ad Agency', meta: '£300–380/day · After Effects · IR35', score: '9.0', cls: 'score-a' },
  { src: 'REMOTE OK', c: 'rgba(196,240,0,.16)', t: 'var(--lime)', title: 'UI Designer — Healthtech Startup', meta: '£400/day · Figma · 6-week sprint', score: '9.3', cls: 'score-a' },
]

const incomingDashboard = [
  { src: 'REDDIT', c: 'rgba(255,140,66,.14)', t: '#ff9c5b', title: 'Senior UX Designer — London', meta: '£350–450/day · Figma', score: '9.2', cls: 'score-a', dot: 'var(--lime)' },
  { src: 'WWR', c: 'rgba(110,168,212,.16)', t: '#7fb6e6', title: 'Full-Stack Developer — Remote', meta: '£500–700/day · React', score: '8.4', cls: 'score-a', dot: 'var(--lime)' },
  { src: 'REED', c: 'rgba(176,138,219,.16)', t: '#c4a3ec', title: 'Brand Identity — Contract', meta: '£2,800/mo · Branding', score: '8.1', cls: 'score-b', dot: 'var(--amber)' },
  { src: 'REMOTE OK', c: 'rgba(196,240,0,.16)', t: 'var(--lime)', title: 'DevOps Engineer — Full-time', meta: '£70–90k · AWS, Terraform', score: '9.0', cls: 'score-a', dot: 'var(--lime)' },
  { src: 'REDDIT', c: 'rgba(255,140,66,.14)', t: '#ff9c5b', title: 'Freelance Copywriter — Fintech', meta: '£200–280/day · Content', score: '8.7', cls: 'score-a', dot: 'var(--lime)' },
  { src: 'REED', c: 'rgba(176,138,219,.16)', t: '#c4a3ec', title: 'Product Designer — EdTech', meta: '£300–400/day · Figma', score: '7.9', cls: 'score-b', dot: 'var(--amber)' },
  { src: 'WWR', c: 'rgba(110,168,212,.16)', t: '#7fb6e6', title: 'UI/UX Designer — Healthcare', meta: '£350–450/day · Prototyping', score: '9.4', cls: 'score-a', dot: 'var(--lime)' },
  { src: 'REMOTE OK', c: 'rgba(196,240,0,.16)', t: 'var(--lime)', title: 'Front-End Dev — SaaS Startup', meta: '£400–550/day · Vue, TS', score: '8.6', cls: 'score-a', dot: 'var(--lime)' },
]

const initialSignals = [
  { src: 'REDDIT', c: 'rgba(255,140,66,.14)', t: '#ff9c5b', title: 'Senior UX Designer — London (Fintech)', meta: '£350–450/day · Figma · Inside IR35', score: '9.1', cls: 'score-a' },
  { src: 'WWR', c: 'rgba(110,168,212,.16)', t: '#7fb6e6', title: 'Full-Stack Developer — Remote UK', meta: '£60–75k · React, Node · ASAP', score: '8.7', cls: 'score-a' },
  { src: 'REED', c: 'rgba(176,138,219,.16)', t: '#c4a3ec', title: 'Brand Identity — 3-month contract', meta: '£40k pro rata · Branding', score: '7.4', cls: 'score-b' },
  { src: 'REMOTE OK', c: 'rgba(196,240,0,.16)', t: 'var(--lime)', title: 'DevOps Engineer — Full-time Remote', meta: '£70–90k · AWS, Terraform, K8s', score: '8.9', cls: 'score-a' },
]

const faqData = [
  { q: 'Where does LeadFlow find leads?', a: 'We continuously monitor Reddit (r/forhire, r/freelance, r/hiring), Reed.co.uk, and We Work Remotely. Everything is scored by our AI model before it reaches your feed — so you only see what\'s worth your time.' },
  { q: 'What does the 1–10 score mean?', a: 'The score weighs budget clarity, scope detail, response-rate signals, and how well a lead matches your profile. A 9+ usually has a clear brief, a stated budget, and a hiring decision within two weeks.' },
  { q: 'Do you take a cut of my contract?', a: 'Never. Every lead links straight to the original post. You apply on the client\'s terms, on the original platform. No middleman, no markup, no commission.' },
  { q: 'How is this different from a job board?', a: 'Job boards show you everything. LeadFlow shows you only what fits your profile, ranked by score, so you act on the best leads in minutes instead of searching for an hour.' },
  { q: 'What happens when my trial ends?', a: 'On day 7 your plan continues automatically — but only if you stay. We email you 48 hours before, so you are never charged by surprise. Cancel any time before then in one click and you pay nothing.' },
  { q: 'Can I cancel whenever I want?', a: 'Yes. Cancel from settings anytime and keep access until your billing period ends. No fees, no friction.' },
  { q: 'Which freelancers is this built for?', a: 'Designers, developers, writers, marketers and consultants. The scoring model is tuned for UK and remote markets.' },
  { q: 'Is my profile shared with clients?', a: 'No. Your profile only powers filtering and scoring. Clients never see your LeadFlow profile.' },
]

function SignalCard({ s, flash }: { s: typeof initialSignals[0], flash?: boolean }) {
  return (
    <div className={`signal${flash ? ' flash' : ''}`}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 5 }}><span className="sig-src" style={{ background: s.c, color: s.t }}>{s.src}</span></div>
        <div className="sig-title">{s.title}</div>
        <div className="sig-meta">{s.meta}</div>
      </div>
      <div className={`sig-score ${s.cls}`}><span className="v">{s.score}</span><span className="l">SCORE</span></div>
    </div>
  )
}

function Sparkline() {
  return (
    <svg width="100%" height="38" viewBox="0 0 156 38" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C4F000" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#C4F000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0,32 C11,28 19,30 33,24 C48,18 56,22 78,15 C100,8 108,11 122,6 C138,2 146,4 156,2 L156,38 L0,38 Z" fill="url(#spark)" />
      <path d="M0,32 C11,28 19,30 33,24 C48,18 56,22 78,15 C100,8 108,11 122,6 C138,2 146,4 156,2" stroke="#C4F000" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <circle cx="156" cy="2" r="3" fill="#C4F000" />
    </svg>
  )
}

function Chevron() {
  return (
    <svg className="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="21" height="21" rx="7" fill="rgba(196,240,0,.16)" />
      <path d="M7 11l3 3 5-5" stroke="#C4F000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FaqCheck() {
  return (
    <li className="pf"><i className="ti ti-check" aria-hidden="true"></i></li>
  )
}

// Counts up from 0 → target the first time it scrolls into view. The value is
// parsed from its display string ("2,400+", "9.1", "1h") so the prefix/suffix
// and decimal/grouping formatting are preserved while only the number animates.
function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const m = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/)
    if (!m) { setDisplay(value); return }
    const [, prefix, numStr, suffix] = m
    const grouped = numStr.includes(',')
    const decimals = numStr.includes('.') ? numStr.split('.')[1].length : 0
    const target = parseFloat(numStr.replace(/,/g, ''))
    const fmt = (n: number) => {
      const s = grouped
        ? n.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : n.toFixed(decimals)
      return `${prefix}${s}${suffix}`
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplay(fmt(target)); return }

    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.unobserve(el)
      const t0 = performance.now()
      const dur = 1500
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        setDisplay(fmt(target * (1 - Math.pow(1 - p, 3))))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [value])

  return <span ref={ref}>{display}</span>
}

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signals, setSignals] = useState(initialSignals)
  const [paused, setPaused] = useState(false)
  const [dashboardRows, setDashboardRows] = useState([
    { src: 'REDDIT', c: 'rgba(255,140,66,.14)', t: '#ff9c5b', title: 'Senior UX Designer — London', meta: '£350–450/day · Figma', score: '9.2', cls: 'score-a', dot: 'var(--lime)' },
    { src: 'WWR', c: 'rgba(110,168,212,.16)', t: '#7fb6e6', title: 'Full-Stack Developer — Remote', meta: '£500–700/day · React', score: '8.4', cls: 'score-a', dot: 'var(--lime)' },
    { src: 'REED', c: 'rgba(176,138,219,.16)', t: '#c4a3ec', title: 'Brand Identity — Contract', meta: '£2,800/mo · Branding', score: '8.1', cls: 'score-b', dot: 'var(--amber)' },
  ])
  const dbRef = useRef(0)
  const [annual, setAnnual] = useState(false)
  const [teamSeats, setTeamSeats] = useState(2)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [stickyVisible, setStickyVisible] = useState(false)
  const fiRef = useRef(0)
  const obsRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
      setStickyVisible(window.scrollY > 620)
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    obsRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            obsRef.current?.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.sr').forEach(el => obsRef.current?.observe(el))
    return () => obsRef.current?.disconnect()
  }, [])

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const interval = setInterval(() => {
      if (paused || document.hidden) return
      const d = incomingSignals[fiRef.current % incomingSignals.length]
      fiRef.current++
      setSignals(prev => {
        const next = [...prev]
        next.pop()
        next.unshift(d)
        return next
      })
    }, 4200)
    return () => clearInterval(interval)
  }, [paused])

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const burstTimers: number[] = []
    let count = 0
    const rotate = () => {
      if (document.hidden) return
      const d = incomingDashboard[dbRef.current % incomingDashboard.length]
      dbRef.current++
      setDashboardRows(prev => {
        const next = [...prev]
        next.pop()
        next.unshift(d)
        return next
      })
      count++
      if (count < 3) burstTimers.push(window.setTimeout(rotate, 1500))
    }
    burstTimers.push(window.setTimeout(rotate, 1000))
    const interval = window.setInterval(rotate, 4500)
    return () => {
      burstTimers.forEach(window.clearTimeout)
      window.clearInterval(interval)
    }
  }, [])

  return (
    <>
      <Script id="ld-json-app" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "LeadFlow",
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "description": "LeadFlow finds and scores freelance leads, then delivers the best matches to your inbox as often as every hour.",
          "url": "https://lead-flow-gpyj.vercel.app/",
          "offers": [
            { "@type": "Offer", "name": PRICING.free.label, "price": String(PRICING.free.monthly), "priceCurrency": "GBP" },
            { "@type": "Offer", "name": PRICING.pro.label, "price": String(PRICING.pro.monthly), "priceCurrency": "GBP", "description": "Per month. 7-day free trial, cancel any time before it ends." },
            { "@type": "Offer", "name": PRICING.max.label, "price": String(PRICING.max.monthly), "priceCurrency": "GBP", "description": "Per month. 7-day free trial, cancel any time before it ends." },
            { "@type": "Offer", "name": PRICING.team.label, "price": String(PRICING.team.monthly), "priceCurrency": "GBP", "description": "Per seat / month. 7-day free trial, cancel any time before it ends." }
          ],
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "87" }
        })
      }} />
      <Script id="ld-json-faq" type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqData.map(f => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": { "@type": "Answer", "text": f.a }
          }))
        })
      }} />

      {/* ═══ NAVBAR ═══ */}
      <header>
        <nav id="navbar" className={scrolled ? 'scrolled' : ''} aria-label="Main navigation">
          <div className="nav-inner">
            <Link href="/" className="nav-logo" aria-label="LeadFlow home">
              <span className="nav-logo-mark"><span>LF</span></span>
              LeadFlow
            </Link>
            <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <a href="#how" className="nav-link">How it works</a>
              <a href="#features" className="nav-link">Features</a>
              <a href="#pricing" className="nav-link">Pricing</a>
              <a href="#faq" className="nav-link">FAQ</a>
            </div>
            <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Link href="/auth/login" className="nav-link">Log in</Link>
              <Link href="/auth/signup" className="btn-p btn-sm">Start free</Link>
            </div>
            <button id="hamburger" aria-label="Toggle menu" aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)}>
              <i className="ti ti-menu-2" style={{ fontSize: '22px' }} aria-hidden="true"></i>
            </button>
          </div>
          <div id="mobile-menu" className={mobileOpen ? 'open' : ''} role="menu">
            <a href="#how" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
            <div style={{ height: '1px', background: 'rgba(255,255,255,.08)', margin: '6px 0' }}></div>
            <Link href="/auth/login" onClick={() => setMobileOpen(false)}>Log in</Link>
            <Link href="/auth/signup" onClick={() => setMobileOpen(false)} style={{ background: 'var(--lime)', color: 'var(--ink-950)', fontWeight: 700, textAlign: 'center' }}>Start free →</Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ═══ HERO ═══ */}
        <section className="hero" aria-label="Hero">
          <div className="hero-bg" aria-hidden="true"></div>
          <div className="hero-glow" aria-hidden="true"></div>
          <div className="container">
            <div className="hero-grid">
              <div className="sr">
                <div className="tag tag-onink tag-bracket" style={{ marginBottom: 24 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--lime)', animation: 'pingDot 2s infinite', display: 'inline-block' }}></span>
                  Trusted by 340+ UK freelancers
                </div>
                <h1 className="display">
                  Stop searching for work.<br />
                  Let the <span className="hl">right leads</span> find you.
                </h1>
                <p className="hero-sub">
                  LeadFlow finds freelance opportunities across Reddit, Reed and We Work Remotely, scores each one against your skills and rate, and delivers the best matches to your inbox as often as every hour.
                </p>
                <div className="hero-cta-row">
                  <Link href="/auth/signup" className="btn-p btn-lg">Get started free →</Link>
                  <a href="#how" className="btn-ghost btn-lg"><i className="ti ti-player-play" style={{ fontSize: 16 }} aria-hidden="true"></i> See how it works</a>
                </div>
                <ul className="hero-trust" aria-label="Trust points">
                  <li><i className="ti ti-circle-check" aria-hidden="true"></i> 7-day Pro trial</li>
                  <li><i className="ti ti-circle-check" aria-hidden="true"></i> 2-minute setup</li>
                  <li><i className="ti ti-circle-check" aria-hidden="true"></i> first leads within the hour</li>
                </ul>
              </div>

              <div className="sr sr-d2">
                <div className="console-wrap">
                  <div className="accent-card" aria-hidden="true">
                    <div className="ac-top">
                      <span className="ac-lbl">Leads this week</span>
                      <span className="ac-val">47</span>
                    </div>
                    <Sparkline />
                    <div className="ac-days"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span className="on">S</span></div>
                  </div>
                  <div className="console" role="img" aria-label="Live feed of incoming freelance leads with AI scores">
                    <div className="console-bar">
                      <span className="radar-mini" aria-hidden="true"></span>
                      <span className="console-title">Your lead feed</span>
                      <span className="console-live"><span className="dot"></span> live</span>
                    </div>
                    <div className="feed-head">
                      <span className="fh-l">updated 8 min ago</span>
                      <span className="fh-new">● 12 new today</span>
                    </div>
                    <div className="feed-filters" aria-hidden="true">
                      <span className="feed-chip on">All</span>
                      <span className="feed-chip">Score 8+</span>
                      <span className="feed-chip">Design</span>
                      <span className="feed-chip">Remote</span>
                      <span className="feed-chip">£300+/day</span>
                    </div>
                    <div className="feed" id="feed" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                      {signals.map((s, i) => <SignalCard key={`${s.title}-${i}`} s={s} flash={i === 0 && fiRef.current > 0} />)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SOURCES STRIP ═══ */}
        <section className="sources-strip" aria-label="Sources we monitor">
          <div className="container">
            <div className="sources-inner">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.72rem', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--slate-600)' }}>Sourcing from:</span>
              <span className="source-item"><i className="ti ti-brand-reddit" aria-hidden="true"></i> Reddit</span>
              <span className="source-item"><i className="ti ti-briefcase" aria-hidden="true"></i> Reed.co.uk</span>
              <span className="source-item"><i className="ti ti-world" aria-hidden="true"></i> We Work Remotely</span>
              <span className="source-item"><i className="ti ti-device-laptop" aria-hidden="true"></i> Remote OK</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.72rem', color: 'var(--lime-deep)' }}>+ more added weekly</span>
            </div>
          </div>
        </section>

        {/* ═══ PROBLEM ═══ */}
        <section className="section-py paper" aria-labelledby="problem-h">
          <div className="container">
            <div className="section-head sr">
              <div className="tag tag-lime tag-bracket">the problem</div>
              <h2 id="problem-h">Job boards waste your time</h2>
              <p>Endless listings, hidden budgets, and proposals that go nowhere. The work worth having is buried under hours of searching.</p>
            </div>
            <div className="grid-3">
              <article className="card sr sr-d1" style={{ padding: '34px 30px' }}>
                <div className="icon-box" style={{ background: 'rgba(255,107,94,.1)' }}><i className="ti ti-clock-x" style={{ fontSize: 23, color: 'var(--coral)' }} aria-hidden="true"></i></div>
                <h3 className="display" style={{ fontSize: '1.18rem', marginBottom: 10 }}>Hours of searching</h3>
                <p style={{ fontSize: '.94rem', color: 'var(--slate-500)', lineHeight: 1.65 }}>Filtering noise, applying blind, refreshing tabs. Time that should be billed, spent looking for work.</p>
              </article>
              <article className="card sr sr-d2" style={{ padding: '34px 30px' }}>
                <div className="icon-box" style={{ background: 'rgba(255,176,32,.12)' }}><i className="ti ti-eye-off" style={{ fontSize: 23, color: 'var(--amber)' }} aria-hidden="true"></i></div>
                <h3 className="display" style={{ fontSize: '1.18rem', marginBottom: 10 }}>Hidden budgets</h3>
                <p style={{ fontSize: '.94rem', color: 'var(--slate-500)', lineHeight: 1.65 }}>No rate, no scope, no reply. You pitch, you call, you wait — and hear nothing back.</p>
              </article>
              <article className="card sr sr-d3" style={{ padding: '34px 30px' }}>
                <div className="icon-box" style={{ background: 'rgba(196,240,0,.16)' }}><i className="ti ti-wave-saw-tool" style={{ fontSize: 23, color: 'var(--lime-deep)' }} aria-hidden="true"></i></div>
                <h3 className="display" style={{ fontSize: '1.18rem', marginBottom: 10 }}>Feast or famine</h3>
                <p style={{ fontSize: '.94rem', color: 'var(--slate-500)', lineHeight: 1.65 }}>Land a project, stop looking, go dark. The cycle breaks when good leads arrive on schedule.</p>
              </article>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section className="section-py paper-2" id="how" aria-labelledby="how-h">
          <div className="container">
            <div className="section-head sr">
              <div className="tag tag-lime tag-bracket">how it works</div>
              <h2 id="how-h">Up and running in minutes</h2>
              <p>Set it up once. LeadFlow runs in the background and surfaces only what&apos;s worth your attention.</p>
            </div>
            <div className="steps sr">
              <div className="step">
                <div className="step-rule" aria-hidden="true"></div>
                <div className="step-num">STEP 01</div>
                <h3>Set your profile</h3>
                <p>Tell us your skills, day rate, and the work you want. Two minutes, no CV upload.</p>
              </div>
              <div className="step">
                <div className="step-rule" aria-hidden="true"></div>
                <div className="step-num">STEP 02</div>
                <h3>We find &amp; score</h3>
                <p>Our model reviews every new post across the web and scores it 1–10 against your profile.</p>
              </div>
              <div className="step">
                <div className="step-rule" aria-hidden="true"></div>
                <div className="step-num">STEP 03</div>
                <h3>Apply &amp; win</h3>
                <p>Your best matches arrive as often as every hour. Apply directly on the original platform.</p>
              </div>
            </div>
            <div style={{ textAlign: 'center', marginTop: 54 }} className="sr">
              <Link href="/auth/signup" className="btn-line btn-lg">Create your free profile →</Link>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.76rem', color: 'var(--slate-400)', marginTop: 14 }}>first leads arrive within the hour · cancel any time</p>
            </div>
          </div>
        </section>

        {/* ═══ STATS BAND ═══ */}
        <section className="stats-band" aria-label="Platform statistics">
          <div className="container" style={{ paddingTop: 56, paddingBottom: 56, position: 'relative', zIndex: 2 }}>
            <div className="grid-stats sr">
              {[
                { v: '2,400+', l: 'leads scored', icon: 'ti-target-arrow', note: 'updating live', up: true },
                { v: '340+', l: 'freelancers using it', icon: 'ti-users', note: 'growing weekly', up: true },
                { v: '1h', l: 'fastest delivery', icon: 'ti-bolt', note: 'or sooner', up: false },
                { v: '9.1', l: 'avg top-match score', icon: 'ti-star-filled', note: 'out of 10', up: false },
              ].map(s => (
                <div className="stat" key={s.l}>
                  <span className="stat-ico" aria-hidden="true"><i className={`ti ${s.icon}`} /></span>
                  <div className="v"><CountUp value={s.v} /></div>
                  <div className="l">{s.l}</div>
                  <span className={`stat-note${s.up ? ' up' : ''}`}>
                    {s.up && <i className="ti ti-trending-up" aria-hidden="true" />}{s.note}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section className="section-py paper" id="features" aria-labelledby="feat-h">
          <div className="container">
            <div className="section-head sr">
              <div className="tag tag-lime tag-bracket">features</div>
              <h2 id="feat-h">Everything you need, nothing you don&apos;t</h2>
              <p>Built for working freelancers, not procurement teams or recruiters.</p>
            </div>
            <div className="grid-3">
              {[
                { icon: 'ti-brain', title: 'AI quality scoring', desc: 'Every lead ranked 1–10 so you focus on the best ones first. Stop guessing which are worth applying to.' },
                { icon: 'ti-clock-bolt', title: 'Delivered as often as every hour', desc: 'Fresh matches throughout the day. You reply while the client is still reading applications.' },
                { icon: 'ti-target-arrow', title: 'Skill-matched', desc: 'Only leads that fit your skills and rate reach your feed. No irrelevant listings.' },
                { icon: 'ti-currency-pound', title: 'Budgets upfront', desc: 'Real numbers before you pitch. Never burn a call discovering the rate doesn\'t work.' },
                { icon: 'ti-link', title: 'Direct links, no commission', desc: 'Apply on the original platform. We never sit between you and the client or take a cut of your work.' },
                { icon: 'ti-route', title: 'Pipeline tracking', desc: 'Follow each lead from interested to won. Never lose the thread on a live opportunity.' },
              ].map((f, i) => (
                <article key={f.title} className={`card sr ${i < 3 ? 'sr-d1' : i < 5 ? 'sr-d2' : 'sr-d3'}`} style={{ padding: 30 }}>
                  <div className="icon-box" style={{ background: 'rgba(196,240,0,.16)' }}><i className={`ti ${f.icon}`} style={{ fontSize: 23, color: 'var(--lime-deep)' }} aria-hidden="true"></i></div>
                  <h3 className="display" style={{ fontSize: '1.12rem', marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontSize: '.9rem', color: 'var(--slate-500)', lineHeight: 1.62 }}>{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ DASHBOARD PREVIEW ═══ */}
        <section className="section-py" style={{ background: 'var(--ink-850)', color: '#fff' }} aria-labelledby="dash-h">
          <div className="container">
            <div className="grid-2">
              <div className="sr">
                <div className="tag tag-onink tag-bracket" style={{ marginBottom: 16 }}>your dashboard</div>
                <h2 className="display" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.7rem)', marginBottom: 16 }}>One feed. Ranked. Ready to act.</h2>
                <p style={{ fontSize: '1.04rem', color: 'var(--slate-300)', lineHeight: 1.66, marginBottom: 32 }}>No tabs, no searching. Filter by score, source or budget and go from new lead to application sent in under a minute.</p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 13, marginBottom: 38, listStyle: 'none' }}>
                  {['Filter by source, score, budget or skill', 'Save a lead in one tap', 'Top 5 emailed to you each morning', 'Track pipeline from interest to won'].map(t => (
                    <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(196,240,0,.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-check" style={{ fontSize: 13, color: 'var(--lime)' }} aria-hidden="true"></i>
                      </span>
                      <span style={{ fontSize: '.95rem', color: 'var(--slate-200)' }}>{t}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className="btn-p btn-lg">Try it free →</Link>
              </div>
              <div className="sr sr-d2">
                <div className="dash" role="img" aria-label="LeadFlow dashboard preview, filtered to high-scoring leads">
                  <div className="dash-bar">
                    <span className="radar-mini" aria-hidden="true"></span>
                    <span className="console-title">Dashboard</span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <span className="dash-chip" style={{ background: 'rgba(255,255,255,.06)', color: 'var(--slate-400)' }}>all</span>
                      <span className="dash-chip" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime)', border: '1px solid rgba(196,240,0,.25)' }}>score 8+</span>
                    </span>
                  </div>
                  {(() => {
                    const maxScore = Math.max(...dashboardRows.map(r => parseFloat(r.score)))
                    const bestIdx = dashboardRows.findIndex(r => parseFloat(r.score) === maxScore)
                    return dashboardRows.map((d, i) => (
                      <div key={d.title} className="dash-row" style={i === 0 ? { animation: 'newFlash .8s ease-out' } : undefined}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.dot, flexShrink: 0 }} aria-hidden="true"></span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="sig-src" style={{ background: d.c, color: d.t }}>{d.src}</span>
                            {i === 0 && <span className="dash-badge dash-badge-new">new</span>}
                            {i === bestIdx && i !== 0 && <span className="dash-badge dash-badge-rec"><i className="ti ti-star-filled" style={{ fontSize: 9 }} aria-hidden="true"></i> recommended</span>}
                          </div>
                          <div className="sig-title">{d.title}</div>
                          <div className="sig-meta">{d.meta}</div>
                        </div>
                        <div className={`sig-score ${d.cls}`}><span className="v">{d.score}</span></div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ TESTIMONIALS ═══ */}
        <section className="section-py paper-2" aria-labelledby="test-h">
          <div className="container">
            <div className="section-head sr">
              <div className="tag tag-lime tag-bracket">testimonials</div>
              <h2 id="test-h">Freelancers who made the switch</h2>
            </div>
            <div className="grid-3">
              {[
                { initials: 'SJ', name: 'Sarah J.', role: 'UX Designer · London', text: '"Landed a £2,400 contract in my first week. I ignored anything under 8 and applied to three. Two replied. The score sorts the list for you."' },
                { initials: 'MT', name: 'Marcus T.', role: 'Full-Stack Dev · Manchester', text: '"Sunday afternoons used to vanish into job boards. Now it\'s 10 minutes on Monday. Made back the Pro plan in a single contract."' },
                { initials: 'PK', name: 'Priya K.', role: 'Brand Designer · Edinburgh', text: '"The budget filter alone earns its keep. I stopped chasing leads that can\'t pay my rate. Healthiest pipeline I\'ve had in three years."' },
              ].map((t, i) => (
                <figure key={t.name} className={`quote-card sr ${i === 0 ? 'sr-d1' : i === 1 ? 'sr-d2' : 'sr-d3'}`}>
                  <div className="quote-stars" aria-label="5 out of 5">★★★★★</div>
                  <blockquote style={{ fontSize: '.96rem', color: 'var(--slate-700)', lineHeight: 1.7, marginBottom: 22, border: 'none' }}>{t.text}</blockquote>
                  <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="avatar" aria-hidden="true">{t.initials}</span>
                    <span>
                      <span style={{ display: 'block', fontWeight: 600, fontSize: '.88rem' }}>{t.name}</span>
                      <span style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '.76rem', color: 'var(--slate-500)' }}>{t.role}</span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ PRICING ═══ */}
        <section className="section-py paper" id="pricing" aria-labelledby="price-h">
          <div className="container">
            <div className="section-head sr" style={{ marginBottom: 40 }}>
              <div className="tag tag-lime tag-bracket">pricing</div>
              <h2 id="price-h">Pricing that grows with you</h2>
              <p>Start with a 7-day free trial of Pro — cancel any time before it ends and you pay nothing. Each plan builds on the one before, so you only pay for the reach, speed and insight you actually need. We&apos;ll always remind you before anything changes.</p>
            </div>

            <h3 className="sr" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', textAlign: 'center', color: 'var(--ink-900)', marginBottom: 20 }}>How your free trial works</h3>
            <div className="trial-timeline sr">
              <div className="trial-step">
                <div className="trial-day">Today</div>
                <div className="trial-rail" aria-hidden="true"><span className="trial-dot amber"></span><span className="trial-line"></span></div>
                <p className="trial-desc"><strong>You unlock everything in Pro.</strong> Unlimited leads, AI scores, skill filtering — all of it, the moment you sign up.</p>
              </div>
              <div className="trial-step">
                <div className="trial-day">Day 5</div>
                <div className="trial-rail" aria-hidden="true"><span className="trial-dot lime"></span><span className="trial-line"></span></div>
                <p className="trial-desc hl"><strong>We email you a reminder — before any charge.</strong> Two full days before the trial ends, so you can decide on your own terms. We&apos;d rather remind you than surprise you.</p>
              </div>
              <div className="trial-step">
                <div className="trial-day">Day 7</div>
                <div className="trial-rail" aria-hidden="true"><span className="trial-dot"></span></div>
                <p className="trial-desc"><strong>Your first charge, only if you stay.</strong> Cancel any time before then and you pay nothing. One click in your account settings.</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 36 }} className="sr">
              <span style={{ fontSize: '.94rem', fontWeight: annual ? 500 : 600, color: annual ? 'var(--slate-500)' : 'var(--ink-900)' }}>Monthly</span>
              <div className={`toggle${annual ? ' on' : ''}`} role="switch" aria-checked={annual} aria-label="Toggle annual billing" tabIndex={0} onClick={() => setAnnual(!annual)} onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setAnnual(!annual) } }}>
                <div className="toggle-knob"></div>
              </div>
              <span style={{ fontSize: '.94rem', display: 'flex', alignItems: 'center', gap: 8, color: annual ? 'var(--ink-900)' : 'var(--slate-500)', fontWeight: annual ? 600 : 500 }}>
                Annual <span style={{ background: 'var(--lime)', color: 'var(--ink-950)', fontFamily: 'var(--font-mono)', fontSize: '.66rem', fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--r-pill)', opacity: annual ? 1 : .45, transition: 'opacity .2s' }}>SAVE 2 MONTHS</span>
              </span>
            </div>

            <div className="tier-ladder sr">
              {(['free', 'pro', 'max', 'team'] as const).map(t => {
                const v = PRICING[t]
                const featured = t === 'max'
                const isTeam = t === 'team'
                const price = (annual ? v.annual : v.monthly) ?? 0
                const was = annual && !isTeam ? v.monthly : null
                return (
                  <div key={t} className={`bill-card${featured ? ' feat' : ''}${isTeam ? ' team-card' : ''}`}>
                    {featured && <span className="bill-reco">MOST POPULAR</span>}
                    <div className="bpc-tier">
                      <span className="bpc-name">{v.label}</span>
                      <span className="bpc-icon"><i className={`ti ${TIER_ICONS[t]}`} /></span>
                    </div>
                    <div className="bpc-price-block">
                      {t === 'free' ? (
                        <div className="bpc-price">£0<span className="per"> / month</span></div>
                      ) : isTeam ? (
                        <div className="bpc-price">£{price}<span className="per"> / seat{annual ? ' · yr' : '/mo'}</span></div>
                      ) : (
                        <div className="bpc-price">£{price}{was ? <span className="was">£{was}</span> : null}<span className="per">{annual ? ' / mo · billed yr' : ' / month'}</span></div>
                      )}
                    </div>
                    {isTeam && <SeatControl seats={teamSeats} setSeats={setTeamSeats} price={price} />}
                    <p className="bpc-blurb">{v.blurb}</p>
                    <div className="bpc-divider" />
                    <ul className="bpc-feats">
                      {planFeatures(t).map(f => (
                        <li key={f.txt} className={`bpc-feat${f.muted ? ' muted' : ''}`}>
                          <span className="bpc-fi"><i className={`ti ${f.muted ? 'ti-minus' : 'ti-check'}`} /></span>
                          <span>{f.txt}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href="/auth/signup" className={`bill-cta ${t === 'free' ? 'bill-cta-ghost' : featured || isTeam ? 'bill-cta-warm' : 'bill-cta-primary'}`}>
                      {t === 'free'
                        ? 'Get started free'
                        : isTeam
                          ? <><i className="ti ti-users" /> Start Team — £{price * teamSeats}/mo</>
                          : featured
                            ? <><i className="ti ti-crown" /> Start my free trial</>
                            : <><i className="ti ti-arrow-right" /> Start my free trial</>}
                    </Link>
                    {(featured || isTeam) && (
                      <div className="bill-reassure">
                        <span><i className="ti ti-gift" />7 days free</span>
                        <span><i className="ti ti-bell" />We email before billing</span>
                        <span><i className="ti ti-shield-check" />Cancel anytime</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="section-py paper-2" id="faq" aria-labelledby="faq-h">
          <div className="container">
            <div className="section-head sr">
              <div className="tag tag-lime tag-bracket">faq</div>
              <h2 id="faq-h">Questions, answered</h2>
            </div>
            <div style={{ maxWidth: 720, margin: '0 auto', background: 'var(--paper-card)', border: '1px solid var(--slate-200)', borderRadius: 'var(--r-xl)', padding: '4px 32px' }} className="sr">
              {faqData.map((f, i) => (
                <div key={i} className={`faq-item${openFaq === i ? ' open' : ''}`}>
                  <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                    {f.q}
                    <Chevron />
                  </button>
                  <div className="faq-body" style={{ maxHeight: openFaq === i ? 200 : 0 }}>
                    <p className="faq-body-inner">{f.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FINAL CTA ═══ */}
        <section className="final section-py" aria-labelledby="cta-h">
          <div className="hero-bg" aria-hidden="true"></div>
          <div className="hero-glow" aria-hidden="true"></div>
          <div className="container" style={{ textAlign: 'center', maxWidth: 760, position: 'relative', zIndex: 2 }}>
            <div className="sr">
              <div className="tag tag-onink tag-bracket" style={{ marginBottom: 18, justifyContent: 'center' }}>get started</div>
              <h2 className="display" style={{ fontSize: 'clamp(2.1rem, 5vw, 3.4rem)', color: '#fff', marginBottom: 18 }}>Your next client is<br />already out there.</h2>
              <p style={{ fontSize: '1.1rem', color: 'var(--slate-300)', lineHeight: 1.62, marginBottom: 40 }}>Set up your profile in two minutes and let the right work come to you. First leads within the hour — cancel any time before your trial ends.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 14 }}>
                <Link href="/auth/signup" className="btn-p btn-lg">Get started free →</Link>
                <Link href="/auth/login" className="btn-ghost btn-lg">Log in</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ═══ STICKY CTA BAR ═══ */}
      <div id="sticky-bar" className={stickyVisible ? 'visible' : ''} aria-hidden="true">
        <div className="sticky-inner">
          <span className="sticky-txt"><b>12 new leads</b> matched today — see yours in minutes.</span>
          <Link href="/auth/signup" className="btn-p btn-sm">Get started free →</Link>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="footer" aria-label="Footer">
        <div className="container" style={{ paddingTop: 60, paddingBottom: 40 }}>
          <div className="footer-grid" style={{ marginBottom: 48 }}>
            <div>
              <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }} aria-label="LeadFlow home">
                <span className="nav-logo-mark"><span>LF</span></span>
                <span style={{ fontFamily: "'Space Grotesk',sans-serif", color: '#fff', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-.02em' }}>LeadFlow</span>
              </a>
              <p style={{ fontSize: '.875rem', color: 'var(--slate-400)', lineHeight: 1.65, maxWidth: 250 }}>AI-scored freelance leads, matched to your skills and delivered as often as every hour.</p>
            </div>
            <nav aria-label="Product">
              <h4>Product</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 11, listStyle: 'none' }}>
                <li><a href="#features" className="flink">Features</a></li>
                <li><a href="#pricing" className="flink">Pricing</a></li>
                <li><a href="#how" className="flink">How it works</a></li>
              </ul>
            </nav>
            <nav aria-label="Company">
              <h4>Company</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 11, listStyle: 'none' }}>
                <li><a href="/about" className="flink">About</a></li>
                <li><a href="/blog" className="flink">Blog</a></li>
                <li><a href="/contact" className="flink">Contact</a></li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <h4>Legal</h4>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 11, listStyle: 'none' }}>
                <li><a href="/privacy" className="flink">Privacy</a></li>
                <li><a href="/terms" className="flink">Terms</a></li>
                <li><a href="/cookies" className="flink">Cookies</a></li>
              </ul>
            </nav>
          </div>
          <div style={{ borderTop: '1px solid var(--ink-700)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.78rem', color: 'var(--slate-600)' }}>© 2026 LeadFlow. All rights reserved.</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '.72rem', color: 'var(--lime-deep)', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--lime)', animation: 'blink 1.6s infinite' }}></span>
              updating as often as every hour
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}
