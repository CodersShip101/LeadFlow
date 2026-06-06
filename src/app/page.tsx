import Link from 'next/link'
import PricingCard from '@/components/PricingCard'
import type { PricingTier } from '@/types'

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

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 tracking-tight">
          Stop chasing clients.<br />
          <span className="text-blue-600">Start choosing them.</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          We find, vet and deliver high-quality leads directly to you — so you can spend
          less time hunting and more time doing the work you love.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/auth/signup"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700"
          >
            Get Started Free
          </Link>
          <Link
            href="#how-it-works"
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-50"
          >
            How It Works
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900">How It Works</h2>
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Create Your Profile',
                description: 'Tell us about your skills, rates, and preferences. Takes 2 minutes.',
              },
              {
                step: '2',
                title: 'We Find The Leads',
                description: 'We scan dozens of sources daily and vet every lead against our quality checklist.',
              },
              {
                step: '3',
                title: 'You Land The Client',
                description: 'Get notified when matching leads appear. Express interest and close the deal.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="mt-6 text-lg font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-3 text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-center text-gray-600 max-w-xl mx-auto">
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
      <section className="bg-blue-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to stop chasing and start choosing?
          </h2>
          <p className="mt-4 text-blue-100 text-lg">
            Join LeadFlow and get quality leads delivered to your inbox daily.
          </p>
          <Link
            href="/auth/signup"
            className="mt-8 inline-block bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} LeadFlow. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
