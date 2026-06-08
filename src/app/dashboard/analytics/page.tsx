'use client'

import { useRouter } from 'next/navigation'

export default function AnalyticsPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center pb-24 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="text-center animate-fade-in">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#F5F3FF' }}>
          <i className="ti ti-chart-line" style={{ fontSize: '24px', color: '#7C3AED' }} />
        </div>
        <h1 className="text-lg font-bold mb-1" style={{ color: '#111827' }}>Analytics</h1>
        <p className="text-sm mb-5" style={{ color: '#6B7280' }}>Stats over time — coming soon</p>
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm">
          <i className="ti ti-arrow-left" /> Back to feed
        </button>
      </div>
    </div>
  )
}
