'use client'

import { useRouter } from 'next/navigation'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F2F3F7', fontFamily: "'DM Sans', sans-serif" }}>
      <div className="text-center">
        <BarChart3 size={36} className="mx-auto mb-3" color="#AAB0BB" />
        <h1 className="text-xl font-bold mb-2" style={{ color: '#1A1D23' }}>Analytics</h1>
        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Stats over time — coming soon</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#1B6B4A' }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  )
}
