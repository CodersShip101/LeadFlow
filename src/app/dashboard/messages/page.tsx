'use client'

import { useRouter } from 'next/navigation'

export default function MessagesPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-20 md:pb-0" style={{ minHeight: 'calc(100vh - 56px)', background: 'var(--paper)' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(196,240,0,.15)' }}>
          <i className="ti ti-message" style={{ fontSize: 24, color: 'var(--lime-deep)' }} />
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--ink-900)' }}>Messages</h2>
        <p className="text-xs mb-5 max-w-[280px]" style={{ color: 'var(--slate-500)' }}>
          Direct messaging is coming soon. You&apos;ll be able to chat with clients and manage proposals here.
        </p>
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mx-auto transition-all"
          style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>
          <i className="ti ti-arrow-left" /> Back to feed
        </button>
      </div>
    </div>
  )
}
