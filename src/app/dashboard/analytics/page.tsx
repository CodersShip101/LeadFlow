'use client'

import { useRouter } from 'next/navigation'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center pb-20 md:pb-0">
      <div className="text-center">
        <BarChart3 size={36} className="mx-auto mb-3" style={{ color: 'var(--slate-3)' }} />
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--cream)' }}>Analytics</h1>
        <p className="text-sm mb-4" style={{ color: 'var(--slate)' }}>Stats over time — coming soon</p>
        <button onClick={() => router.push('/dashboard')} className="btn-s">
          <i className="ti ti-arrow-left" /> Back to Dashboard
        </button>
      </div>
    </div>
  )
}
