'use client'

import { useRouter } from 'next/navigation'

export default function CalendarPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center pb-24 md:pb-0" style={{ background: '#F9FAFB', minHeight: 'calc(100vh - 56px)' }}>
      <div className="text-center animate-fade-in">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EFF6FF' }}>
          <i className="ti ti-calendar-event" style={{ fontSize: '24px', color: '#2563EB' }} />
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: '#111827' }}>Calendar</h2>
        <p className="text-xs mb-5 max-w-[260px]" style={{ color: '#6B7280' }}>
          Track interviews, deadlines, and client calls. Coming soon.
        </p>
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm">
          <i className="ti ti-arrow-left" /> Back to feed
        </button>
      </div>
    </div>
  )
}
