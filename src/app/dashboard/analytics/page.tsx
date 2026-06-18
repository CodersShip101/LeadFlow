'use client'

import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center pb-20 md:pb-0" style={{ background: 'var(--paper)' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(196,240,0,.15)' }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 24, color: 'var(--lime-deep)' }} />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--ink-900)' }}>Analytics</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--slate-500)' }}>Stats over time &mdash; coming soon</p>
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mx-auto transition-all"
          style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>
          <i className="ti ti-arrow-left" /> Back to Dashboard
        </button>
      </div>
    </div>
  )
}
