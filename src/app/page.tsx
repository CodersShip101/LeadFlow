'use client'

import { useState } from 'react'
import Link from 'next/link'
import PricingCard from '@/components/PricingCard'
import SignupCounter from '@/components/SignupCounter'
import type { PricingTier } from '@/types'
import { Target, Zap, CheckCircle, Quote, X } from 'lucide-react'

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: 0,
    priceLabel: 'Free',
    description: '3 leads per week. Enough to see the difference.',
    features: [
      '3 leads per week',
      'Basic lead details',
      'Email notifications',
      'No credit card required',
    ],
    cta: 'Get 3 free leads this week',
  },
  {
    name: 'Pro',
    price: 49,
    priceLabel: '£49/month',
    description: 'For serious freelancers who want consistent work.',
    features: [
      'Unlimited leads',
      'Full lead details & source URLs',
      'Skill-based filtering',
      'Early access to new leads',
      'Priority matching',
      'Cancel anytime',
    ],
    cta: 'Start Pro Free Trial',
    highlighted: true,
  },
]

const sampleLeads = [
  { title: 'Senior React Developer — London', rate: '£450–£550/day', source: 'Reed', skills: ['React', 'TypeScript', 'Next.js'], score: '9/10' },
  { title: 'UX Designer — Remote UK', rate: '£300–£400/day', source: 'Reddit', skills: ['Figma', 'User Research'], score: '8/10' },
  { title: 'Full-Stack Dev — Manchester', rate: '£350–£500/day', source: 'CWJobs', skills: ['Node', 'React', 'PostgreSQL'], score: '7/10' },
]

export default function HomePage() {
  const [sampleOpen, setSampleOpen] = useState(false)

  return (
    <div>
      {/* ── HERO ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-0">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1]" style={{ color: '#1A1D23' }}>
              Stop chasing clients.<br />
              <span style={{ color: '#1B6B4A' }}>Start choosing them.</span>
            </h1>
            <p className="mt-5 text-lg leading-relaxed" style={{ color: '#6B7280' }}>
              LeadFlow sends UK freelancers 3–5 highly targeted leads per day — no job board scrolling.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/auth/signup"
                className="inline-block text-white px-7 py-3 rounded-lg text-base font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ background: '#1B6B4A' }}
              >
                Get 3 free leads this week
              </Link>
              <button
                onClick={() => setSampleOpen(true)}
                className="inline-block px-7 py-3 rounded-lg text-base font-semibold transition-all duration-150 hover:bg-gray-100 active:scale-[0.98]"
                style={{ background: '#F3F4F6', color: '#6B7280' }}
              >
                View sample leads
              </button>
            </div>
            <p className="mt-3 text-xs" style={{ color: '#9CA3AF' }}>No credit card required. Free plan available.</p>
            <p className="mt-5 text-xs" style={{ color: '#AAB0BB' }}>
              <SignupCounter /> freelancers already onboarded
            </p>
          </div>

          {/* Dashboard preview */}
          <div className="rounded-xl overflow-hidden shadow-xl" style={{ border: '1px solid #ECEEF2', background: '#FFFFFF' }}>
            <div className="flex items-center gap-2 px-5 h-11 border-b" style={{ background: '#F9FAFB', borderColor: '#ECEEF2' }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#DC2626' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#D97706' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#1B6B4A' }} />
              </div>
              <span className="text-[11px] font-medium ml-2" style={{ color: '#AAB0BB' }}>leadflow.app/feed</span>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: '#ECEEF2' }}>
                <div className="flex gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded-full" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>● Reddit</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ background: '#FEF3E2', color: '#D97706' }}>● Indeed</span>
                  <span className="px-2 py-0.5 rounded-full" style={{ background: '#F5F5F7', color: '#AAB0BB' }}>○ Reed</span>
                </div>
                <span className="ml-auto text-[10px] font-medium" style={{ color: '#AAB0BB' }}>Today 09:41</span>
              </div>
              {sampleLeads.map((lead, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: i === 0 ? '#F0FDF7' : '#F9FAFB', border: i === 0 ? '1px solid #BBE0CE' : '1px solid transparent' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: lead.source === 'Reed' ? 'rgba(122,171,255,.12)' : lead.source === 'Reddit' ? 'rgba(255,90,20,.14)' : 'rgba(160,120,255,.12)', color: lead.source === 'Reed' ? '#2563EB' : lead.source === 'Reddit' ? '#ff7040' : '#b08fff' }}>{lead.source}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: lead.score >= '8' ? '#EBF5F0' : '#FEF3E2', color: lead.score >= '8' ? '#1B6B4A' : '#D97706' }}>{lead.score}</span>
                      <span className="ml-auto text-[10px] font-medium" style={{ color: '#1B6B4A' }}>{lead.rate}</span>
                    </div>
                    <div className="text-xs font-semibold mt-1 truncate" style={{ color: '#1A1D23' }}>{lead.title}</div>
                    <div className="flex gap-1 mt-1">
                      {lead.skills.map(s => (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#EBF5F0', color: '#1B6B4A', border: '1px solid #BBE0CE' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-1 text-center">
                <span className="text-[10px] font-medium" style={{ color: '#AAB0BB' }}>Showing 3 of 5 new leads today</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { initials: 'SK', name: 'Sarah K.', role: 'Freelance UX Designer, London', line: 'Got my first client in 3 days.' },
            { initials: 'JR', name: 'James R.', role: 'Full-Stack Developer, Manchester', line: 'Cut lead hunting from 5h to 5min.' },
            { initials: 'PM', name: 'Priya M.', role: 'Copywriter, Bristol', line: 'Finally, leads that match my actual skills.' },
          ].map(t => (
            <div key={t.name} className="flex items-start gap-3 p-4 rounded-xl bg-white" style={{ border: '1px solid #ECEEF2' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: '#1B6B4A' }}>{t.initials}</div>
              <div>
                <div className="text-sm font-semibold leading-snug" style={{ color: '#1A1D23' }}>{t.line}</div>
                <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{t.name} — {t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS (PIPELINE) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: '#1A1D23' }}>How it works</h2>
        <p className="mt-3 text-sm text-center max-w-xl mx-auto" style={{ color: '#6B7280' }}>Most freelancers apply to their first lead within 10 minutes of signing up.</p>
        <div className="mt-12 grid md:grid-cols-3 gap-8">
          {[
            { icon: 'ti ti-user', title: 'Set your profile', desc: 'Skills, rates, location. Takes 2 minutes.' },
            { icon: 'ti ti-search', title: 'We scan & match daily', desc: '7+ sources, UK-only, AI-ranked by fit.' },
            { icon: 'ti ti-thumb-up', title: 'You pick & apply', desc: '3–5 leads/day. Track applied → hired.' },
          ].map((item, i) => (
            <div key={item.title} className="text-center p-6 rounded-xl bg-white" style={{ border: '1px solid #ECEEF2' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EBF5F0' }}>
                <i className={item.icon} style={{ fontSize: '22px', color: '#1B6B4A' }} />
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#F5F5F7', color: '#AAB0BB' }}>Step {i + 1}</span>
              </div>
              <h3 className="text-base font-semibold" style={{ color: '#1A1D23' }}>{item.title}</h3>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY DIFFERENT ── */}
      <section className="py-16" style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: '#1A1D23' }}>Why LeadFlow is different</h2>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {[
              { icon: Zap, title: 'Curated, not a job board', desc: 'You never see irrelevant roles — only leads that match your skills and rates.' },
              { icon: Target, title: 'UK-only focus', desc: 'No timezone headaches. Clients expect UK freelancers.' },
              { icon: CheckCircle, title: 'Outcome-driven AI', desc: 'The more you log wins and losses, the better your matches get.' },
            ].map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-white rounded-xl p-6" style={{ border: '1px solid #ECEEF2' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: '#1A1D23' }}>{f.title}</h3>
                  <p className="text-sm mt-1 leading-relaxed" style={{ color: '#6B7280' }}>{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center tracking-tight" style={{ color: '#1A1D23' }}>
            Simple pricing
          </h2>
          <p className="mt-3 text-sm text-center max-w-xl mx-auto" style={{ color: '#6B7280' }}>
            One decent client covers a year of Pro. Start free, upgrade when you see results.
          </p>
          <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20" style={{ background: '#1B6B4A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">
            Ready to stop chasing and start choosing?
          </h2>
          <p className="mt-4 text-lg" style={{ color: '#A7D4BC' }}>
            3 free leads this week. No credit card required.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-block px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
            style={{ background: 'white', color: '#1B6B4A' }}
          >
            Get 3 free leads this week
          </Link>
        </div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
          &copy; {new Date().getFullYear()} LeadFlow. All rights reserved.
        </div>
      </footer>

      {/* ── SAMPLE LEADS MODAL ── */}
      {sampleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setSampleOpen(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full mx-4 shadow-xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSampleOpen(false)} className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors" style={{ color: '#AAB0BB' }}>
              <X size={16} />
            </button>
            <div className="p-6">
              <h3 className="text-base font-bold" style={{ color: '#1A1D23' }}>Sample leads</h3>
              <p className="text-xs mt-1 mb-4" style={{ color: '#6B7280' }}>These are real anonymised leads from our feed. Yours will match your skills.</p>
              <div className="space-y-3">
                {sampleLeads.map((lead, i) => (
                  <div key={i} className="rounded-lg p-4" style={{ background: '#F9FAFB', border: '1px solid #ECEEF2' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: lead.source === 'Reed' ? 'rgba(122,171,255,.12)' : lead.source === 'Reddit' ? 'rgba(255,90,20,.14)' : 'rgba(160,120,255,.12)', color: lead.source === 'Reed' ? '#2563EB' : lead.source === 'Reddit' ? '#ff7040' : '#b08fff' }}>{lead.source}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>{lead.score}</span>
                      <span className="ml-auto text-xs font-medium" style={{ color: '#1B6B4A' }}>{lead.rate}</span>
                    </div>
                    <div className="text-sm font-semibold mt-1.5" style={{ color: '#1A1D23' }}>{lead.title}</div>
                    <div className="flex gap-1.5 mt-2">
                      {lead.skills.map(s => (
                        <span key={s} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#EBF5F0', color: '#1B6B4A', border: '1px solid #BBE0CE' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href="/auth/signup"
                className="mt-5 block w-full text-center py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
                style={{ background: '#1B6B4A' }}
              >
                Get your matched leads
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
