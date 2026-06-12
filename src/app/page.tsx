'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const faqs = [
  { q: 'How does LeadFlow find leads?', a: 'We scan Reddit (r/forhire, r/freelance, r/hiring), Reed.co.uk, and We Work Remotely every 6 hours. Leads are then processed by our AI scoring model before appearing in your feed.' },
  { q: 'How does the quality score work?', a: 'Scores are based on budget clarity, scope specificity, response rate signals, and match against your profile. A 9+ lead typically has a clear brief, stated budget, and a hiring decision in the next two weeks.' },
  { q: 'Can I apply directly, or does LeadFlow intermediate?', a: 'We never intermediate. Every lead includes a direct link to the original post. You apply on the client\'s terms, on the original platform.' },
  { q: 'How is this different from job boards?', a: 'Job boards surface everything. LeadFlow surfaces only what matches your profile, with quality scores so you can prioritise. You spend 10 minutes on the best leads instead of an hour trawling everything.' },
  { q: 'What happens after my trial ends?', a: 'You\'ll be moved to the Free plan (3 leads/week) unless you upgrade. We\'ll send a reminder 48 hours before the trial ends. No card is required to start.' },
  { q: 'Can I cancel at any time?', a: 'Yes, always. Cancel from your account settings at any time and you keep access until the end of your billing period. No fees, no friction.' },
  { q: 'What kinds of freelancers does LeadFlow work for?', a: 'We cover design, development, copywriting, marketing, and consulting. Our scoring model is tuned for UK and remote freelance markets.' },
  { q: 'Is my profile data shared with clients?', a: 'No. Your profile is used only to filter and score leads relevant to you. Clients on other platforms never see your LeadFlow profile.' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20)
      setShowSticky(window.scrollY > 500)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.1 })
    document.querySelectorAll('.scroll-reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav className={`sticky top-0 z-40 bg-white/93 backdrop-blur-md border-b transition-shadow ${scrolled ? 'shadow-sm' : ''}`} style={{ borderColor: 'var(--base-400)', height: '60px' }}>
        <div className="max-w-[1100px] mx-auto px-8 h-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <span className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-white text-xs font-semibold" style={{ background: 'var(--green-600)' }}>LF</span>
            <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--base-900)' }}>LeadFlow</span>
          </Link>
          <div className="hidden md:flex items-center gap-0.5">
            {['Features', 'How it works', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ fontSize: '14px', color: 'var(--base-600)', padding: '6px 12px', borderRadius: 'var(--radius-sm)', transition: 'all 0.15s' }}
                className="hover:bg-[var(--green-50)] hover:text-[var(--green-600)]">
                {item}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Link href="/auth/login"
              style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '14px', color: 'var(--base-600)', padding: '7px 14px', borderRadius: 'var(--radius-sm)', background: 'none', border: '1px solid transparent', cursor: 'pointer' }}
              className="hover:bg-[var(--green-50)] hover:text-[var(--green-600)]">
              Log in
            </Link>
            <Link href="/auth/signup"
              style={{ fontFamily: 'var(--font-dm-sans)', fontSize: '14px', fontWeight: 500, color: 'white', background: 'var(--green-600)', padding: '7px 18px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer' }}
              className="hover:bg-[var(--green-700)]" onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform = ''}>
              Start free
            </Link>
          </div>
          <button className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--base-600)' }}>
              {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden pb-3 space-y-1.5 border-t pt-2 px-8" style={{ borderColor: 'var(--base-400)' }}>
            {['Features', 'How it works', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMenuOpen(false)}
                className="block text-sm py-2 px-1 rounded" style={{ color: 'var(--base-600)' }}>{item}</a>
            ))}
            <Link href="/auth/login" className="block text-sm py-2 px-1 rounded" style={{ color: 'var(--base-600)' }} onClick={() => setMenuOpen(false)}>Log in</Link>
            <Link href="/auth/signup" className="block text-sm py-2 px-1 rounded font-semibold" style={{ color: 'var(--green-600)' }} onClick={() => setMenuOpen(false)}>Start free</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section style={{ padding: '130px 0 100px', background: 'var(--base-100)', borderBottom: '1px solid var(--base-400)' }}>
        <div className="max-w-[1100px] mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: text */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wide uppercase mb-6" style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)', color: 'var(--green-600)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--green-400)' }} />
                <span>340 freelancers already inside</span>
              </div>

              <h1 style={{
                fontFamily: 'var(--font-instrument-serif)',
                fontSize: 'clamp(36px, 4.5vw, 64px)',
                lineHeight: 1.08, letterSpacing: '-0.025em',
                color: 'var(--base-900)', marginBottom: '22px',
              }}>
                Stop chasing leads.<br />
                <em style={{ fontStyle: 'italic', color: 'var(--green-600)' }}>Start choosing them.</em>
              </h1>

              <p style={{
                fontSize: '18px', lineHeight: 1.65, color: 'var(--base-500)',
                marginBottom: '32px',
              }}>
                Quality freelance leads, delivered every 6 hours. Matched to your skills. No noise.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link href="/auth/signup" className="btn-p" style={{ padding: '13px 26px', fontSize: '15px', fontWeight: 500 }}>
                  Get started free <i className="ti ti-arrow-right" />
                </Link>
                <a href="#how-it-works" className="btn-s" style={{ padding: '13px 26px', fontSize: '15px', fontWeight: 500 }}>
                  <i className="ti ti-player-play" /> See how it works
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '22px', flexWrap: 'wrap' }}>
                {[
                  { icon: 'ti ti-circle-check', text: 'No credit card' },
                  { icon: 'ti ti-circle-check', text: '3 free leads' },
                  { icon: 'ti ti-circle-check', text: 'Cancel anytime' },
                ].map((t, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--base-500)' }}>
                    <i className={t.icon} style={{ color: 'var(--green-500)', fontSize: '14px' }} /> {t.text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: mockup */}
            <div style={{
              background: 'white', border: '1px solid var(--base-400)',
              borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
            }}>
              <div style={{ background: 'var(--green-900)', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
                </div>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.02em', marginLeft: '4px' }}>LeadFlow — Today's leads</span>
              </div>
              <div style={{ padding: '20px', background: 'var(--base-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--base-900)' }}>
                    Fresh leads <span style={{ color: 'var(--base-500)', fontWeight: 400 }}>· Updated 14 min ago</span>
                  </h3>
                  <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 10px', borderRadius: '20px', background: 'var(--green-100)', color: 'var(--green-700)' }}>
                    <i className="ti ti-circle-filled" style={{ fontSize: '8px', verticalAlign: '2px', marginRight: '4px' }} />12 new today
                  </span>
                </div>
                {[
                  { src: 'Reddit', srcClass: 'badge-src-reddit', title: 'Senior UX Designer — London (Fintech)', meta: '£350–450/day · Figma, Design Systems · Inside IR35', score: '9.1', scoreClass: 'badge-hi' },
                  { src: 'WWR', srcClass: 'badge-src-wwr', title: 'Full-Stack Developer — Remote UK', meta: '£60–75k · React, Node.js · Starts ASAP', score: '8.7', scoreClass: 'badge-hi' },
                  { src: 'Reed', srcClass: 'badge-src-reed', title: 'Brand Identity — 3-month contract', meta: '£40k pro rata · Branding, Illustrator', score: '7.4', scoreClass: 'badge-md' },
                  { src: 'Remote OK', srcClass: 'badge-hi', title: 'DevOps Engineer — Full-time Remote', meta: '£70–90k · AWS, Terraform, K8s', score: '8.9', scoreClass: 'badge-hi' },
                ].map((lead, i) => (
                  <div key={i} style={{
                    background: 'white', border: '1px solid var(--base-400)',
                    borderRadius: 'var(--radius-md)', padding: '14px 16px',
                    marginBottom: i < 3 ? '8px' : '0',
                    display: 'flex', alignItems: 'center', gap: '14px',
                  }}>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      padding: '4px 8px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                    }} className={`badge ${lead.srcClass}`}>{lead.src}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--base-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lead.title}</div>
                      <span style={{ fontSize: '12px', color: 'var(--base-500)', marginTop: '2px', display: 'block' }}>{lead.meta}</span>
                    </div>
                    <div style={{
                      flexShrink: 0, width: '36px', height: '36px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 600,
                    }} className={`badge ${lead.scoreClass}`}>{lead.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{ background: 'var(--green-900)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 text-center">
            {[
              { value: '2,400+', label: 'Leads posted' },
              { value: '340+', label: 'Freelancers in beta' },
              { value: '6h', label: 'Refresh interval' },
              { value: '9.1', label: 'Avg quality score' },
            ].map((s, i) => (
              <div key={s.label} className="md:border-r last:border-r-0 md:px-6" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="text-2xl md:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 scroll-reveal" style={{ background: 'var(--base-100)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--green-500)' }}>How it works</p>
            <h2 className="text-3xl font-bold tracking-tight mb-12" style={{ color: 'var(--base-900)' }}>Up and running in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-10 relative">
              <div className="hidden md:block absolute top-6 left-[16%] right-[16%] h-[2px]" style={{ background: 'var(--base-300)' }} />
            {[
              { num: '01', icon: 'ti-user-check', title: 'Create your profile', desc: 'Tell us your skills, day rate, and the kind of work you want. Takes under two minutes.' },
              { num: '02', icon: 'ti-search', title: 'We find and score leads', desc: 'AI scans Reddit, Reed, and We Work Remotely every 6 hours. Only quality leads make it through.' },
              { num: '03', icon: 'ti-briefcase', title: 'Land the work', desc: 'Browse your personal lead feed, express interest, and apply directly on the original platform.' },
            ].map(s => (
              <div key={s.num} className="text-center relative">
                <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-5 relative z-10 text-sm font-bold" style={{ background: 'white', border: '1px solid var(--base-200)', color: 'var(--green-600)' }}>
                  {s.num}
                </div>
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: 'var(--base-700)' }}>{s.title}</h3>
                <p className="text-sm max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--base-500)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 scroll-reveal" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--green-500)' }}>Features</p>
            <h2 className="text-3xl font-bold tracking-tight mb-10" style={{ color: 'var(--base-900)' }}>Everything you need, nothing you don't</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-px rounded-xl overflow-hidden" style={{ border: '1px solid var(--base-300)', background: 'var(--base-300)' }}>
            {[
              { icon: 'ti-star', title: 'AI quality scoring', desc: 'Every lead rated 1-10 so you prioritise the best opportunities first.' },
              { icon: 'ti-refresh', title: '6-hour refresh', desc: 'Always fresh. New leads appear within minutes of being posted on any platform.' },
              { icon: 'ti-users', title: 'Skill matching', desc: 'Only see leads that match your skills and rate. No irrelevant noise in your feed.' },
              { icon: 'ti-currency-pound', title: 'Budget visible', desc: 'Real numbers upfront. No more applying to leads with vague or missing budgets.' },
              { icon: 'ti-link', title: 'Direct source links', desc: 'Apply on the original platform. Full transparency — we never gate-keep the lead.' },
              { icon: 'ti-send', title: 'Pipeline tracking', desc: 'Follow applications from interested to won. Never lose track of where a lead stands.' },
            ].map(f => (
              <div key={f.title} className="p-7 transition-colors hover:bg-[var(--base-100)]" style={{ background: 'white' }}>
                <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center mb-3.5" style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)', color: 'var(--green-600)' }}>
                  <i className={`ti ${f.icon}`} />
                </div>
                <h3 className="text-sm font-semibold mb-1.5" style={{ color: 'var(--base-700)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--base-500)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>





      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 scroll-reveal" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--green-500)' }}>Pricing</p>
            <h2 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--base-900)' }}>Simple, honest pricing</h2>
            <p className="text-base mb-8" style={{ color: 'var(--base-500)' }}>Pay monthly or save with annual billing.</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-medium" style={{ color: annual ? 'var(--base-400)' : 'var(--base-900)' }}>Monthly</span>
              <button onClick={() => setAnnual(!annual)}
                className={`w-11 h-6 rounded-full relative toggle-track ${annual ? 'on' : ''}`}
                style={{ background: annual ? 'var(--green-600)' : 'var(--base-200)' }}
                role="switch" aria-checked={annual} tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setAnnual(!annual) } }}>
                <div className="w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] left-[3px] shadow-sm toggle-knob"
                  style={{ transform: annual ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
              <span className="text-sm font-medium" style={{ color: annual ? 'var(--base-900)' : 'var(--base-400)' }}>Annual</span>
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: 'var(--green-50)', color: 'var(--green-600)', border: '1px solid var(--green-100)' }}>Save 2 months</span>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {/* Free */}
            <div className="rounded-xl p-7 card-hover" style={{ border: '1px solid var(--base-300)', background: 'white' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--base-500)' }}>Free</p>
              <div style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '2.4rem', fontWeight: 700, lineHeight: 1, color: 'var(--base-900)', marginBottom: '4px' }}>£0</div>
              <p className="text-xs mb-4" style={{ color: 'var(--base-500)' }}>forever free</p>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--base-500)' }}>For freelancers exploring the platform.</p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--base-300)', marginBottom: '20px' }} />
              <ul className="space-y-2.5 mb-8">
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> 3 leads per week</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> AI quality scores</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Direct source links</li>
              </ul>
              <Link href="/auth/signup" className="btn-s w-full justify-center" style={{ padding: '11px 20px', fontSize: '14px' }}>Get started free</Link>
            </div>
            {/* Pro (highlighted) */}
            <div className="rounded-xl p-7 relative card-hover" style={{ border: '2px solid var(--green-600)', background: 'var(--green-50)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-semibold text-white px-4 py-1 rounded-full whitespace-nowrap" style={{ background: 'var(--green-600)' }}>Most popular</div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--base-500)' }}>Pro</p>
              <div style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '2.4rem', fontWeight: 700, lineHeight: 1, color: 'var(--base-900)', marginBottom: '4px' }}>£{annual ? '24' : '29'}</div>
              <p className="text-xs mb-4" style={{ color: 'var(--base-500)' }}>per month</p>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--base-500)' }}>For active freelancers building a steady pipeline.</p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--green-200)', marginBottom: '20px' }} />
              <ul className="space-y-2.5 mb-8">
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Unlimited leads</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Skill + rate filtering</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Daily email digest</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Pipeline tracking</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Priority support</li>
              </ul>
              <Link href="/auth/signup" className="btn-p w-full justify-center" style={{ padding: '11px 20px', fontSize: '14px' }}>Start 7-day free trial</Link>
            </div>
            {/* Growth */}
            <div className="rounded-xl p-7 card-hover" style={{ border: '1px solid var(--base-300)', background: 'white' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--base-500)' }}>Growth</p>
              <div style={{ fontFamily: 'var(--font-instrument-serif)', fontSize: '2.4rem', fontWeight: 700, lineHeight: 1, color: 'var(--base-900)', marginBottom: '4px' }}>£{annual ? '40' : '49'}</div>
              <p className="text-xs mb-4" style={{ color: 'var(--base-500)' }}>per month</p>
              <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--base-500)' }}>For established freelancers optimising every lead.</p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--base-300)', marginBottom: '20px' }} />
              <ul className="space-y-2.5 mb-8">
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Everything in Pro</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Custom lead alerts</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Analytics dashboard</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> CSV export</li>
                <li className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-500)' }}><i className="ti ti-circle-check shrink-0 mt-0.5" style={{ color: 'var(--green-500)', fontSize: '14px' }}></i> Dedicated onboarding</li>
              </ul>
              <Link href="/auth/signup" className="btn-s w-full justify-center" style={{ padding: '11px 20px', fontSize: '14px' }}>Start 7-day free trial</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 scroll-reveal" style={{ background: 'var(--base-100)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--green-500)' }}>FAQ</p>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--base-900)' }}>Common questions</h2>
          </div>
          <div className="space-y-1">
            {faqs.map((faq, i) => (
              <div key={i} className="border-b" style={{ borderColor: 'var(--base-400)' }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-4 text-sm font-medium text-left transition-colors hover:opacity-70 gap-3"
                  style={{ color: 'var(--base-700)' }}>
                  {faq.q}
                  <i className={`ti ti-chevron-down flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} style={{ color: 'var(--base-500)' }} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-40 opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--base-500)' }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: 'var(--green-900)' }} className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-[14px]">
            Join 340+ freelancers
          </h2>
          <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>Get your first leads in minutes. No credit card needed.</p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/auth/signup" className="btn-p" style={{ padding: '14px 28px', fontSize: '15px' }}>
              Get started free <i className="ti ti-arrow-right" />
            </Link>
            <Link href="/auth/login" className="btn-ghost">
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── STICKY BAR ── */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 border-t transition-all duration-300 ${showSticky ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}
        style={{ background: 'white', borderColor: 'var(--base-300)', boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1100px] mx-auto px-8 h-14 flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--base-600)' }}>Free to start &middot; 3 leads included</span>
          <Link href="/auth/signup" className="btn-p" style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 500 }}>
            Get started free <i className="ti ti-arrow-right" />
          </Link>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--green-900)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-14">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <Link href="/" className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--green-600)' }}>LF</span>
                LeadFlow
              </Link>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Quality freelance leads, delivered every 6 hours.</p>
            </div>
            {[
              { title: 'Product', links: [{ label: 'Features', href: '#features' }, { label: 'Pricing', href: '#pricing' }, { label: 'Blog', href: '/blog' }] },
              { title: 'Company', links: [{ label: 'About', href: '/about' }, { label: 'Careers', href: '/careers' }, { label: 'Contact', href: '/contact' }] },
              { title: 'Legal', links: [{ label: 'Privacy policy', href: '/privacy' }, { label: 'Terms of service', href: '/terms' }, { label: 'Cookie policy', href: '/cookies' }] },
            ].map(col => (
              <div key={col.title}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.label}>
                      <a href={link.href} className="text-xs transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.75)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>&copy; {new Date().getFullYear()} LeadFlow. All rights reserved.</div>
            <div className="flex gap-4">
              <a href="/privacy" className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Privacy</a>
              <a href="/terms" className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
