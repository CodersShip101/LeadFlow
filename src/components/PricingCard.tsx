import Link from 'next/link'
import type { PricingTier } from '@/types'

interface PricingCardProps { tier: PricingTier }

export default function PricingCard({ tier }: PricingCardProps) {
  return (
    <div className={`rounded-2xl p-6 transition-all duration-200 ${
      tier.highlighted
        ? 'border-2 shadow-lg relative' 
        : 'border'
    }`} style={{
      borderColor: tier.highlighted ? '#1B6B4A' : '#E5E7EB',
      background: tier.highlighted ? '#FFFFFF' : '#F9FAFB',
    }}>
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white" style={{ background: '#1B6B4A' }}>
          MOST POPULAR
        </div>
      )}
      <h3 className="text-base font-semibold" style={{ color: '#111827' }}>{tier.name}</h3>
      <p className="mt-3">
        <span className="text-3xl font-bold tracking-tight" style={{ color: '#111827' }}>
          {tier.price === 0 ? 'Free' : `£${tier.price}`}
        </span>
        {tier.price > 0 && (
          <span className="ml-1 text-sm" style={{ color: '#9CA3AF' }}>/month</span>
        )}
      </p>
      <p className="mt-1.5 text-xs" style={{ color: '#6B7280' }}>{tier.description}</p>
      <ul className="mt-5 space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-xs" style={{ color: '#6B7280' }}>
            <i className="ti ti-circle-check shrink-0 mt-0.5" style={{ fontSize: '14px', color: '#059669' }} />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/auth/signup"
        className={tier.highlighted ? 'btn-primary w-full justify-center mt-6' : 'btn-secondary w-full justify-center mt-6'}
        style={tier.highlighted ? {} : { borderColor: '#D1D5DB' }}
      >
        {tier.cta}
      </Link>
    </div>
  )
}
