'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import PricingCard from '@/components/PricingCard'
import SignupCounter from '@/components/SignupCounter'
import type { PricingTier } from '@/types'

const pricingTiers: PricingTier[] = [
  { name: 'Free', price: 0, priceLabel: '£0', description: 'Try LeadFlow with a limited number of leads per week.', features: ['3 leads per week', 'Basic lead details', 'Email digest'], cta: 'Get started free' },
  { name: 'Pro', price: 29, priceLabel: '£29/mo', description: 'Unlimited leads for serious freelancers. Cancel anytime.', features: ['Unlimited leads', 'Source URLs', 'Full pipeline', 'Skill matching', 'Priority support'], cta: 'Upgrade to Pro', highlighted: true },
  { name: 'Growth', price: 49, priceLabel: '£49/mo', description: 'For teams and agencies who need leads at scale.', features: ['Everything in Pro', '5 team seats', 'Team analytics', 'Shared pipeline', 'Custom skill matching'], cta: 'Upgrade to Growth' },
]

const faqs = [
  { q: 'How does LeadFlow find leads?', a: 'Our AI scans Reddit, Reed, WWR, Remotive, and 20+ other sources every 6 hours. Each lead is scored for quality and matched against your skills and rates.' },
  { q: 'What makes a lead "high quality"?', a: 'Every lead must have a clear budget, detailed scope, and relevant skills. Our AI filters out vague posts, low-ball offers, and non-UK opportunities.' },
  { q: 'Can I try it for free?', a: 'Yes. Free users get 3 curated leads per week with basic details. No credit card required. Upgrade anytime to unlock unlimited access.' },
  { q: 'Where are the leads based?', a: 'We focus on UK-based and remote-friendly opportunities. Every lead is vetted for UK relevance before it reaches your feed.' },
  { q: 'How often are leads refreshed?', a: 'Our scrapers run every 6 hours around the clock. New leads appear in your feed within minutes of being posted on source sites.' },
  { q: 'Can I cancel my subscription?', a: 'Yes, anytime. Your Pro access continues until the end of your billing period. No cancellation fees, no hassle.' },
  { q: 'Do you offer team plans?', a: 'Yes. Our Growth plan supports up to 5 team seats with a shared pipeline and team analytics. Contact us for larger teams.' },
  { q: 'How does the match scoring work?', a: 'Each lead is scored 1-10 based on budget clarity, scope detail, skill overlap with your profile, and location fit. Scores help you prioritise the best opportunities.' },
]

const testimonials = [
  { initials: 'SK', name: 'Sarah K.', role: 'Freelance UX Designer', quote: 'I was spending 3 hours a day on job boards. Now I open LeadFlow once and have 5 curated leads waiting. Game changer.' },
  { initials: 'MJ', name: 'Marcus J.', role: 'Full-Stack Developer', quote: 'Got my first client within 48 hours of signing up. The match scoring saved me from wasting time on bad leads.' },
  { initials: 'AL', name: 'Aisha L.', role: 'Copywriter', quote: 'The quality difference is incredible. No more ghost listings or vague briefs. Every lead has real details.' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
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
      <nav className={`sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b transition-shadow ${scrolled ? 'shadow-sm' : ''}`} style={{ borderColor: 'var(--base-300)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between h-14 items-center">
            <Link href="/" className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--base-900)' }}>
              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--green-600)' }}>LF</span>
              LeadFlow
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: 'var(--base-600)' }}>
              <a href="#features" className="hover:underline">Features</a>
              <a href="#how-it-works" className="hover:underline">How it works</a>
              <a href="#pricing" className="hover:underline">Pricing</a>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/auth/login" className="btn-g">Log in</Link>
              <Link href="/auth/signup" className="btn-p">Start free</Link>
            </div>
            <button className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" aria-expanded={menuOpen}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--base-600)' }}>
                {menuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
          {menuOpen && (
            <div className="md:hidden pb-3 space-y-1.5 border-t pt-2" style={{ borderColor: 'var(--base-300)' }}>
              {['Features','How it works','Pricing'].map(item => (
                <a key={item} href={`#${item.toLowerCase().replace(/\s+/g,'-')}`} onClick={() => setMenuOpen(false)}
                  className="block text-sm py-2 px-1 rounded" style={{ color: 'var(--base-600)' }}>{item}</a>
              ))}
              <Link href="/auth/login" className="block text-sm py-2 px-1 rounded" style={{ color: 'var(--base-600)' }} onClick={() => setMenuOpen(false)}>Log in</Link>
              <Link href="/auth/signup" className="block text-sm py-2 px-1 rounded font-semibold" style={{ color: 'var(--green-600)' }} onClick={() => setMenuOpen(false)}>Start free</Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: 'var(--base-100)' }}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full" style={{ background: 'var(--green-600)' }} />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full" style={{ background: 'var(--green-500)' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ background: 'var(--amber-100)', color: 'var(--amber-600)', border: '1px solid var(--amber-200)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse-dot" style={{ background: 'var(--green-500)' }} />
              Now in beta — join <SignupCounter /> freelancers
            </div>
            <h1 className="text-[40px] md:text-[56px] font-extrabold leading-[1.05] tracking-[-1.5px]" style={{ color: 'var(--base-900)' }}>
              Stop hunting for clients.<br />
              <span style={{ color: 'var(--green-600)' }}>Start choosing them.</span>
            </h1>
            <p className="mt-5 text-lg max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--base-600)' }}>
              LeadFlow finds, vets and scores freelance leads for you — delivered fresh every 6 hours.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link href="/auth/signup" className="btn-p" style={{ padding: '14px 28px', fontSize: '15px' }}>
                Get started free <i className="ti ti-arrow-right" />
              </Link>
              <a href="#how-it-works" className="btn-s">See how it works <i className="ti ti-arrow-right" /></a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--base-500)' }}>
              <span className="flex items-center gap-1"><i className="ti ti-circle-check" style={{ color: 'var(--green-500)' }} /> No card needed</span>
              <span className="flex items-center gap-1"><i className="ti ti-circle-check" style={{ color: 'var(--green-500)' }} /> 3 free leads</span>
              <span className="flex items-center gap-1"><i className="ti ti-circle-check" style={{ color: 'var(--green-500)' }} /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section style={{ background: 'var(--green-900)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '2,400+', label: 'Leads posted' },
              { value: '340+', label: 'Freelancers in beta' },
              { value: '£1.2M+', label: 'In contracts' },
              { value: '9.1/10', label: 'Avg quality score' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl md:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-sm mt-1" style={{ color: 'var(--green-200)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-20 scroll-reveal">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: 'var(--base-900)' }}>The feast-or-famine cycle stops here</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { title: 'Wasting hours on job boards', desc: 'Scrolling through irrelevant listings, filtering noise, and applying blind.' },
              { title: 'Applying to leads with no substance', desc: 'No budget, no scope, no response. Your time deserves better.' },
              { title: 'Landing clients, then scrambling', desc: 'The feast-or-famine cycle ends when leads arrive consistently.' },
            ].map((item, i) => (
              <div key={i} className="card" style={{ borderLeft: '3px solid var(--amber-500)' }}>
                <h3 className="text-base font-semibold" style={{ color: 'var(--base-900)' }}>{item.title}</h3>
                <p className="text-sm mt-2" style={{ color: 'var(--base-600)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8 text-sm font-semibold" style={{ color: 'var(--green-600)' }}>
            LeadFlow fixes all three <i className="ti ti-arrow-right" />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 scroll-reveal" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: 'var(--base-900)' }}>How it works</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5" style={{ background: 'var(--base-300)' }} />
            {[
              { num: '01', icon: 'ti-user-check', title: 'Create your profile', desc: 'Tell us your skills and rates. 2 minutes.' },
              { num: '02', icon: 'ti-search', title: 'We find and score leads', desc: 'AI scans Reddit, Reed, WWR every 6 hours. Only quality leads get through.' },
              { num: '03', icon: 'ti-briefcase', title: 'Land the work', desc: 'Browse your feed, express interest, apply directly.' },
            ].map(s => (
              <div key={s.num} className="text-center relative">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 relative z-10" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize: '24px' }} />
                </div>
                <div className="text-xs font-bold tracking-widest mb-1" style={{ color: 'var(--green-400)' }}>{s.num}</div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--base-900)' }}>{s.title}</h3>
                <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--base-600)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 scroll-reveal" style={{ background: 'var(--base-200)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: 'var(--base-900)' }}>Everything you need to win consistently</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { icon: 'ti-star', title: 'AI quality scoring', desc: 'Every lead rated 1-10 so you prioritise the best opportunities first.' },
              { icon: 'ti-refresh', title: '6-hour refresh', desc: 'Always fresh, never stale. New leads appear within minutes of being posted.' },
              { icon: 'ti-user-search', title: 'Skill matching', desc: 'Only see leads that match your skills and rates. No irrelevant noise.' },
              { icon: 'ti-currency-pound', title: 'Budget visible', desc: 'Real numbers upfront. No more applying to leads with vague budgets.' },
              { icon: 'ti-link', title: 'Source URLs', desc: 'Apply directly on the original platform. Full transparency on every lead.' },
              { icon: 'ti-send', title: 'Pipeline tracking', desc: 'Follow your applications from interested to won. Never lose track.' },
            ].map(f => (
              <div key={f.title} className="card card-hover">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
                  <i className={`ti ${f.icon}`} style={{ fontSize: '18px' }} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--base-900)' }}>{f.title}</h3>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--base-600)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ── */}
      <section className="py-20" style={{ background: 'var(--green-900)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">See your leads at a glance</h2>
              <ul className="mt-6 space-y-3">
                {['Quality score on every lead', 'Budget, skills, and source at a glance', 'One-click interest and bookmark', 'Pipeline tracking from apply to won'].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm" style={{ color: 'var(--green-200)' }}>
                    <i className="ti ti-circle-check" style={{ color: 'var(--green-400)' }} /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl overflow-hidden shadow-2xl" style={{ boxShadow: 'var(--shadow-green-lg)' }}>
              <div className="p-4" style={{ background: 'var(--base-100)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#DC2626' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#F5B942' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#22C55E' }} />
                  <div className="text-xs ml-2" style={{ color: 'var(--base-500)' }}>LeadFlow Dashboard</div>
                </div>
                <div className="space-y-2">
                  {['Senior UX Designer — London', 'Full-Stack Dev — Remote UK', 'Brand Identity — 3-month contract'].map((title, i) => (
                    <div key={i} className="card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="badge" style={{ background: i === 0 ? '#FEF0EB' : i === 1 ? '#EFF6FF' : 'var(--green-100)', color: i === 0 ? '#EA580C' : i === 1 ? '#1D4ED8' : 'var(--green-700)' }}>
                            {['Reddit', 'WWR', 'Reed'][i]}
                          </span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--base-900)' }}>{title}</span>
                        </div>
                        <span className="badge badge-hi">9/10</span>
                      </div>
                      <div className="text-xs mt-1" style={{ color: 'var(--base-600)' }}>£350-450/day · Figma, Design Systems</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 scroll-reveal" style={{ background: 'white' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: 'var(--base-900)' }}>Trusted by freelancers</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.initials} className="card">
                <i className="ti ti-quote" style={{ fontSize: '20px', color: 'var(--amber-400)' }} />
                <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--base-700)' }}>&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid var(--base-300)' }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--green-600)' }}>{t.initials}</div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--base-900)' }}>{t.name}</div>
                    <div className="text-xs" style={{ color: 'var(--base-500)' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 scroll-reveal" style={{ background: 'var(--base-100)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--base-900)' }}>Simple, transparent pricing</h2>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="text-sm" style={{ color: annual ? 'var(--base-500)' : 'var(--base-900)' }}>Monthly</span>
              <button onClick={() => setAnnual(!annual)}
                className="w-10 h-5 rounded-full relative transition-colors" style={{ background: annual ? 'var(--green-600)' : 'var(--base-300)' }}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${annual ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm" style={{ color: annual ? 'var(--base-900)' : 'var(--base-500)' }}>Annual <span className="text-xs" style={{ color: 'var(--green-600)' }}>Save 2 months</span></span>
            </div>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingTiers.map(tier => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 scroll-reveal" style={{ background: 'var(--base-200)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-8">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: 'var(--base-900)' }}>Frequently asked questions</h2>
          <div className="mt-10 space-y-2">
            {faqs.map((faq, i) => (
              <div key={i} className="card p-0 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-left transition-colors hover:bg-[var(--base-200)]"
                  style={{ color: 'var(--base-900)' }}>
                  {faq.q}
                  <i className={`ti ti-chevron-down transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="px-5 pb-4 text-sm" style={{ color: 'var(--base-600)' }}>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ background: 'var(--green-900)' }} className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Join 340+ freelancers getting quality leads daily
          </h2>
          <Link href="/auth/signup" className="btn-p mt-6 inline-flex" style={{ padding: '14px 28px', fontSize: '15px' }}>
            Get started free <i className="ti ti-arrow-right" />
          </Link>
          <p className="mt-3 text-sm" style={{ color: 'var(--green-300)' }}>No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: 'var(--green-900)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-white mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: 'var(--green-600)' }}>LF</span>
                LeadFlow
              </div>
              <p className="text-xs" style={{ color: 'var(--green-300)' }}>Quality freelance leads delivered daily.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Blog'] },
              { title: 'Company', links: ['About', 'Careers', 'Contact'] },
              { title: 'Legal', links: ['Privacy', 'Terms', 'Cookies'] },
            ].map(col => (
              <div key={col.title}>
                <div className="text-xs font-semibold mb-3" style={{ color: 'var(--green-200)' }}>{col.title}</div>
                <div className="space-y-2">
                  {col.links.map(link => (
                    <div key={link} className="text-xs" style={{ color: 'var(--green-400)' }}>{link}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-xs" style={{ color: 'var(--green-400)' }}>&copy; {new Date().getFullYear()} LeadFlow. All rights reserved.</div>
            <button className="text-xs flex items-center gap-1" style={{ color: 'var(--green-300)' }}>
              <i className="ti ti-sun" /> Light mode
            </button>
          </div>
        </div>
      </footer>
    </>
  )
}
