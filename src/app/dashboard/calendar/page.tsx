'use client'

import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'

export default function CalendarPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-20 md:pb-0" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--ink-3)' }}>
          <CalendarDays size={24} style={{ color: 'var(--amber)' }} />
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--cream)' }}>Calendar</h2>
        <p className="text-xs mb-5 max-w-[280px]" style={{ color: 'var(--slate)' }}>
          A full calendar view with deadlines, interviews, and milestones is on the way.
        </p>
        <button onClick={() => router.push('/dashboard')} className="btn-s">
          <i className="ti ti-arrow-left" /> Back to feed
        </button>
      </div>
    </div>
  )
}
