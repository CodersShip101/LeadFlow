import Link from 'next/link'
import PricingCard from '@/components/PricingCard'
import SignupCounter from '@/components/SignupCounter'
import type { PricingTier } from '@/types'
import { Sparkles, Target, TrendingUp, Zap, CheckCircle, Quote } from 'lucide-react'

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: 0,
    priceLabel: 'Free',
    description: 'Try before you commit. See what we offer.',
    features: [
      '3 leads per week',
      'Basic lead details',
      'Email notifications',
      'No credit card required',
    ],
    cta: 'Get Started Free',
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

const testimonials = [
  {
    quote: 'I got my first client within 3 days of signing up. The leads are actually relevant — no more sifting through junk.',
    author: 'Sarah K.',
    role: 'Freelance UX Designer, London',
  },
  {
    quote: 'Worth every penny. I went from spending 5 hours a day hunting leads to 5 minutes reviewing what LeadFlow finds.',
    author: 'James R.',
    role: 'Full-Stack Developer, Manchester',
  },
  {
    quote: 'Tried every job board out there. LeadFlow is the only one that sends leads that actually match my skills and rates.',
    author: 'Priya M.',
    role: 'Copywriter, Bristol',
  },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight" style={{ color: '#1A1D23' }}>
          Stop chasing clients.<br />
          <span style={{ color: '#1B6B4A' }}>Start choosing them.</span>
        </h1>
        <p className="mt-6 text-lg max-w-2xl mx-auto" style={{ color: '#6B7280' }}>
          We find freelance leads that match your skills and budget. You pick the ones you want.
          No more cold pitching or scrolling through job boards.
        </p>
        <div className="mt-10">
          <Link
            href="/auth/signup"
            className="text-white px-8 py-3 rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity"
            style={{ background: '#1B6B4A' }}
          >
            Get Started Free
          </Link>
          <p className="mt-3 text-xs" style={{ color: '#9CA3AF' }}>No credit card required. Free plan available.</p>
          <p className="mt-6 text-xs" style={{ color: '#AAB0BB' }}>
            <SignupCounter /> freelancers already onboarded
          </p>
        </div>
      </section>

      {/* Trust bar */}
      <section style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '5,000+', label: 'Leads vetted' },
              { value: '500+', label: 'Freelancers onboarded' },
              { value: '£50k+', label: 'In leads matched' },
              { value: '4.8/5', label: 'Freelancer rating' },
            ].map(m => (
              <div key={m.label}>
                <div className="text-2xl font-bold" style={{ color: '#1B6B4A' }}>{m.value}</div>
                <div className="text-sm mt-1" style={{ color: '#6B7280' }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center" style={{ color: '#1A1D23' }}>How It Works</h2>
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              { icon: Sparkles, title: 'Tell us what you do', description: 'Share your skills, rates, and preferences. Takes 2 minutes.' },
              { icon: Target, title: 'We find the right leads', description: 'We scan dozens of sources daily and pick leads that actually fit your profile.' },
              { icon: TrendingUp, title: 'Pick your next client', description: 'Get notified when a match comes in. Express interest and land the gig.' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.title} className="text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold" style={{ color: '#1A1D23' }}>{item.title}</h3>
                  <p className="mt-3" style={{ color: '#6B7280' }}>{item.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24" style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center" style={{ color: '#1A1D23' }}>Trusted by UK freelancers</h2>
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {testimonials.map(t => (
              <div key={t.author} className="bg-white rounded-xl p-6" style={{ border: '1px solid #E5E7EB' }}>
                <Quote size={20} style={{ color: '#1B6B4A' }} />
                <p className="mt-3 text-sm leading-relaxed" style={{ color: '#4B5563' }}>{t.quote}</p>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                  <div className="text-sm font-semibold" style={{ color: '#1A1D23' }}>{t.author}</div>
                  <div className="text-xs" style={{ color: '#6B7280' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center" style={{ color: '#1A1D23' }}>Why freelancers choose LeadFlow</h2>
          <div className="mt-16 max-w-3xl mx-auto space-y-6">
            {[
              { icon: Zap, title: 'Leads that match your skills', desc: 'No more sifting through posts for graphic designers when you are a developer.' },
              { icon: CheckCircle, title: 'Vetted before you see them', desc: 'Every lead is checked for budget, quality, and legitimacy.' },
              { icon: Target, title: 'UK-focused market', desc: 'Leads posted by UK clients looking for UK freelancers. No timezone headaches.' },
            ].map((f) => {
              const Icon = f.icon
              return (
                <div key={f.title} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold" style={{ color: '#1A1D23' }}>{f.title}</h3>
                    <p className="text-sm mt-1" style={{ color: '#6B7280' }}>{f.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24" style={{ background: '#F9FAFB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center" style={{ color: '#1A1D23' }}>
            Simple pricing
          </h2>
          <p className="mt-4 text-center max-w-xl mx-auto" style={{ color: '#6B7280' }}>
            One client lead that converts is worth 10x our Pro price. Start free, upgrade when you see results.
          </p>
          <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.name} tier={tier} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16" style={{ background: '#1B6B4A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to stop chasing and start choosing?
          </h2>
          <p className="mt-4 text-lg" style={{ color: '#A7D4BC' }}>
            Join LeadFlow and get quality leads delivered to your inbox daily.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-block px-8 py-3 rounded-lg text-lg font-semibold hover:opacity-90 transition-opacity"
            style={{ background: 'white', color: '#1B6B4A' }}
          >
            Get Started Free
          </Link>
        </div>
      </section>

      <footer className="border-t py-8" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm" style={{ color: '#9CA3AF' }}>
          &copy; {new Date().getFullYear()} LeadFlow. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
