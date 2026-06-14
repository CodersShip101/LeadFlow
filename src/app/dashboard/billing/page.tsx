'use client'

import { Suspense } from 'react'
import BillingContent from './content'

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center pt-16">
        <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
          <span className="text-sm">Loading&hellip;</span>
        </div>
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
