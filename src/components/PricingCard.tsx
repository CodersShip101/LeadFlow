import Link from 'next/link'
import type { PricingTier } from '@/types'
import { Check } from 'lucide-react'

interface PricingCardProps {
  tier: PricingTier
}

export default function PricingCard({ tier }: PricingCardProps) {
  return (
    <div className={`rounded-2xl p-8 border-2 ${
      tier.highlighted
        ? 'border-[var(--green-600)] bg-[var(--green-600)]'
        : 'border-gray-200 bg-white'
    }`}>
      <h3 className="text-lg font-semibold" style={{ color: '#1A1D23' }}>{tier.name}</h3>
      <p className="mt-4">
        <span className="text-4xl font-bold" style={{ color: '#1A1D23' }}>
          {tier.price === 0 ? 'Free' : `£${tier.price}`}
        </span>
        {tier.price > 0 && (
          <span className="ml-1" style={{ color: '#9CA3AF' }}>/month</span>
        )}
      </p>
      <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>{tier.description}</p>
      <ul className="mt-6 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm" style={{ color: '#6B7280' }}>
            <Check size={16} className="shrink-0 mt-0.5" color="var(--green-600)" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/auth/signup"
        className={`mt-8 block w-full text-center py-3 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-[0.98] ${
          tier.highlighted
            ? 'text-white hover:opacity-90'
            : 'hover:opacity-80'
        }`}
        style={{
          background: tier.highlighted ? 'var(--green-600)' : '#F3F4F6',
          color: tier.highlighted ? 'white' : '#1A1D23',
        }}
      >
        {tier.cta}
      </Link>
    </div>
  )
}
