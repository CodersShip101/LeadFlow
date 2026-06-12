'use client'

import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'

export default function CalendarPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-20 md:pb-0" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EBF1FC' }}>
          <CalendarDays size={24} style={{ color: '#2563EB' }} />
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: '#1A1D23' }}>Calendar</h2>
        <p className="text-xs mb-5 max-w-[280px]" style={{ color: '#6B7280' }}>
          A full calendar view with deadlines, interviews, and milestones is on the way.
        </p>
        <button onClick={() => router.push('/dashboard')} className="btn-back">
          <i className="ti ti-arrow-left" /> Back to feed
        </button>
      </div>
    </div>
  )
}
