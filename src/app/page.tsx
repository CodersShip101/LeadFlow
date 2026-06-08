'use client'

import { useState } from 'react'
import Link from 'next/link'
import PricingCard from '@/components/PricingCard'
import type { PricingTier } from '@/types'

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    price: 0,
    priceLabel: 'Free',
    description: 'Try LeadFlow with a limited number of leads per week.',
    features: ['3 leads per week', 'Basic match scoring', 'UK-focused leads', 'Email alerts'],
    cta: 'Get started free',
  },
  {
    name: 'Pro',
    price: 29,
    priceLabel: '£29/mo',
    description: 'Unlimited leads for serious freelancers. Cancel anytime.',
    features: ['Unlimited leads', 'Priority AI matching', 'Advanced filters & search', 'Pipeline management', 'Analytics & insights', 'Email + Slack alerts'],
    cta: 'Start Pro',
    highlighted: true,
  },
  {
    name: 'Growth',
    price: 49,
    priceLabel: '£49/mo',
    description: 'For teams and agencies who need leads at scale.',
    features: ['Everything in Pro', 'Up to 5 team seats', 'Shared pipeline', 'API access', 'Dedicated support'],
    cta: 'Contact sales',
  },
]

const sampleLeads = [
  { title: 'Senior UX Designer — London', rate: '£350–£450/day', source: 'LinkedIn', skills: ['Figma', 'Design Systems'], badge: 'New' },
  { title: 'Full-Stack Dev — Remote UK', rate: '£400–£500/day', source: 'Reed', skills: ['React', 'Node.js', 'TypeScript'], badge: 'Top match' },
  { title: 'Brand Identity — 3-month contract', rate: '£4,000–£5,000/mo', source: 'Reddit', skills: ['Branding', 'Illustrator'], badge: 'New' },
]

const testimonials = [
  { initials: 'SK', name: 'Sarah K.', role: 'Freelance UX Designer, London', line: 'Got my first client in 3 days. Honestly couldn\'t believe it.' },
  { initials: 'MJ', name: 'Marcus J.', role: 'Full-Stack Dev, Manchester', line: 'I was sceptical. Then I landed a £4k contract in week one.' },
  { initials: 'AL', name: 'Aisha L.', role: 'Copywriter, Bristol', line: 'Best decision I\'ve made for my freelance business this year.' },
]

export default function LandingPage() {
  const [sampleOpen, setSampleOpen] = useState(false)

  return (
    <>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.03]" style={{ background: '#1B6B4A' }} />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-[0.03]" style={{ background: '#1B6B4A' }} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-6" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
              <i className="ti ti-sparkles" style={{ fontSize: '12px' }} />
              Trusted by 2,000+ UK freelancers
            </div>
            <h1 className="text-[40px] md:text-[56px] font-bold leading-[1.1] tracking-[-0.04em]" style={{ color: '#111827' }}>
              Stop scrolling.{' '}
              <span style={{ color: '#1B6B4A' }}>Start winning.</span>
            </h1>
            <p className="mt-5 text-lg max-w-xl mx-auto leading-relaxed" style={{ color: '#6B7280' }}>
              We find, vet and deliver{' '}
              <strong style={{ color: '#111827' }}>3–5 high-quality freelance leads</strong> to your inbox every day.
              No job boards. No noise. Just clients who need your skills.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link href="/auth/signup" className="btn-primary">
                Get 3 free leads <i className="ti ti-arrow-right" />
              </Link>
              <button onClick={() => setSampleOpen(true)} className="btn-secondary">
                <i className="ti ti-eye" /> View sample leads
              </button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-4 text-xs" style={{ color: '#9CA3AF' }}>
              <span className="flex items-center gap-1"><i className="ti ti-circle-check" style={{ color: '#059669' }} /> No card needed</span>
              <span className="flex items-center gap-1"><i className="ti ti-circle-check" style={{ color: '#059669' }} /> Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8">
          <div className="text-center mb-5 text-xs font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>What freelancers say</div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.initials} className="text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mx-auto mb-3" style={{ background: '#1B6B4A' }}>
                  {t.initials}
                </div>
                <p className="text-sm font-medium" style={{ color: '#111827' }}>&ldquo;{t.line}&rdquo;</p>
                <div className="mt-2 text-xs" style={{ color: '#9CA3AF' }}>
                  {t.name} · {t.role}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#1B6B4A' }}>How it works</div>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#111827' }}>From signup to your first lead in minutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: 'ti-user-plus', title: 'Create your profile', desc: 'Tell us your skills, rates and preferences. Takes 2 minutes.' },
              { step: '02', icon: 'ti-radar', title: 'We scan daily', desc: 'Our AI scrapes 30+ sources — LinkedIn, Reed, Reddit, and more — every 10 minutes.' },
              { step: '03', icon: 'ti-bolt', title: 'Get matched leads', desc: 'Curated leads appear in your dashboard. Apply in one click.' },
            ].map(s => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5', color: '#1B6B4A' }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize: '24px' }} />
                </div>
                <div className="text-xs font-bold tracking-widest mb-1" style={{ color: '#9CA3AF' }}>{s.step}</div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#111827' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed max-w-xs mx-auto" style={{ color: '#6B7280' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY DIFFERENT ── */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }} className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#1B6B4A' }}>Why LeadFlow</div>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#111827' }}>Built differently from day one</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              { icon: 'ti-bolt', title: 'Not a job board', desc: 'We curate every lead against your profile. You only see what\'s relevant to you.', accent: '#1B6B4A', bg: '#ECFDF5' },
              { icon: 'ti-map-pin', title: 'UK-first', desc: 'No timezone headaches. Every lead is UK-based or remote-friendly for UK freelancers.', accent: '#2563EB', bg: '#EFF6FF' },
              { icon: 'ti-brain', title: 'AI that learns', desc: 'The more you log wins and losses, the better your matches become. It gets smarter every week.', accent: '#7C3AED', bg: '#F5F3FF' },
              { icon: 'ti-clock', title: 'Real-time delivery', desc: 'New leads hit your dashboard within minutes of being posted. Be the first to apply.', accent: '#D97706', bg: '#FFFBEB' },
            ].map(f => (
              <div key={f.title} className="flex gap-4 p-5 rounded-xl card card-hover">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: f.bg, color: f.accent }}>
                  <i className={`ti ${f.icon}`} style={{ fontSize: '20px' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>{f.title}</h3>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: '#6B7280' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-8">
          <div className="text-center mb-12">
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#1B6B4A' }}>Pricing</div>
            <h2 className="text-3xl font-bold tracking-tight" style={{ color: '#111827' }}>One decent client covers a year of Pro</h2>
            <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>No hidden fees. Cancel whenever.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingTiers.map(tier => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ background: '#0F172A' }} className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Ready to stop scrolling through job boards?
          </h2>
          <p className="mt-3 text-sm" style={{ color: '#94A3B8' }}>
            Join 2,000+ UK freelancers who start their day with curated leads.
          </p>
          <Link href="/auth/signup" className="btn-primary mt-6 inline-flex">
            Get 3 free leads <i className="ti ti-arrow-right" />
          </Link>
          <div className="mt-4 text-xs" style={{ color: '#64748B' }}>Free forever · No credit card</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0F172A', borderTop: '1px solid #1E293B' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#94A3B8' }}>
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ background: '#1B6B4A' }}>LF</span>
              LeadFlow
            </div>
            <div className="flex items-center gap-6 text-xs" style={{ color: '#64748B' }}>
              <Link href="/auth/signup" className="hover:text-white transition-colors">Sign up</Link>
              <Link href="/auth/login" className="hover:text-white transition-colors">Login</Link>
            </div>
            <div className="text-xs" style={{ color: '#475569' }}>
              &copy; {new Date().getFullYear()} LeadFlow. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* ── SAMPLE LEADS MODAL ── */}
      {sampleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setSampleOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp .3s ease' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <div>
                <h3 className="text-lg font-bold" style={{ color: '#111827' }}>Sample leads</h3>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Real leads from our feed — yours will match your skills.</p>
              </div>
              <button onClick={() => setSampleOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: '#9CA3AF' }} aria-label="Close">
                <i className="ti ti-x" style={{ fontSize: '18px' }} />
              </button>
            </div>
            <div className="px-6 pb-6 pt-3 space-y-3">
              {sampleLeads.map((lead, i) => (
                <div key={i} className="rounded-xl p-4 transition-all" style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="tag" style={{ background: '#EFF6FF', color: '#2563EB' }}>{lead.source}</span>
                        <span className="tag" style={{ background: '#ECFDF5', color: '#059669' }}>{lead.badge}</span>
                      </div>
                      <h4 className="text-sm font-semibold mt-2" style={{ color: '#111827' }}>{lead.title}</h4>
                      <p className="text-xs mt-0.5 font-medium" style={{ color: '#1B6B4A' }}>{lead.rate}</p>
                      <div className="flex gap-1.5 mt-2">
                        {lead.skills.map(s => (
                          <span key={s} className="tag" style={{ background: '#F3F4F6', color: '#6B7280' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-6">
              <Link href="/auth/signup" className="btn-primary w-full justify-center">
                Get leads like these <i className="ti ti-arrow-right" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
