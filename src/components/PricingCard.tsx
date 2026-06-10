import Link from 'next/link'
import type { PricingTier } from '@/types'

interface PricingCardProps {
  tier: PricingTier
  annual?: boolean
}

export default function PricingCard({ tier, annual }: PricingCardProps) {
  const displayPrice = annual && tier.annualPrice !== undefined ? tier.annualPrice : tier.price
  const showPrice = !(tier.price === 0 && tier.annualPrice === undefined)

  return (
    <div
      className={`rounded-2xl p-8 border-2 ${tier.highlighted ? 'bg-[var(--green-50)]' : 'bg-white'}`}
      style={{ borderColor: tier.highlighted ? 'var(--green-600)' : 'var(--base-300)' }}
    >
      {tier.highlighted && (
        <div className="text-[11px] font-semibold text-white px-3 py-1 rounded-full w-fit mx-auto -mt-10 mb-4" style={{ background: 'var(--green-600)' }}>
          Most popular
        </div>
      )}
      <h3 className="text-base font-semibold" style={{ color: 'var(--base-900)' }}>{tier.name}</h3>
      <p className="mt-4">
        <span className="text-4xl font-bold" style={{ color: 'var(--base-900)' }}>
          {!showPrice ? 'Free' : `£${displayPrice}`}
        </span>
        {showPrice && (
          <span className="ml-1 text-sm" style={{ color: 'var(--base-500)' }}>/month</span>
        )}
      </p>
      <p className="mt-2 text-sm" style={{ color: 'var(--base-600)' }}>{tier.description}</p>
      <div className="mt-6" style={{ borderTop: `1px solid ${tier.highlighted ? 'var(--green-100)' : 'var(--base-300)'}` }} />
      <ul className="mt-6 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm" style={{ color: 'var(--base-600)' }}>
            <i className="ti ti-circle-check" style={{ color: 'var(--green-500)', marginTop: '2px', fontSize: '14px' }} />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/auth/signup"
        className="mt-8 block w-full text-center py-3 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.94]"
        style={{
          background: tier.highlighted ? 'var(--green-600)' : 'var(--base-200)',
          color: tier.highlighted ? 'white' : 'var(--base-700)',
        }}
      >
        {tier.cta}
      </Link>
    </div>
  )
}
