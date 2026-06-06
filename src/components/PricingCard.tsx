'use client'

import Link from 'next/link'
import type { PricingTier } from '@/types'

interface PricingCardProps {
  tier: PricingTier
}

export default function PricingCard({ tier }: PricingCardProps) {
  return (
    <div className={`rounded-2xl p-8 border-2 ${
      tier.highlighted
        ? 'border-blue-600 bg-blue-50'
        : 'border-gray-200 bg-white'
    }`}>
      <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
      <p className="mt-4">
        <span className="text-4xl font-bold text-gray-900">
          {tier.price === 0 ? 'Free' : `£${tier.price}`}
        </span>
        {tier.price > 0 && (
          <span className="text-gray-500 ml-1">/month</span>
        )}
      </p>
      <p className="mt-2 text-gray-600 text-sm">{tier.description}</p>
      <ul className="mt-6 space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
            <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/auth/signup"
        className={`mt-8 block w-full text-center py-3 rounded-lg text-sm font-semibold ${
          tier.highlighted
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        }`}
      >
        {tier.cta}
      </Link>
    </div>
  )
}
