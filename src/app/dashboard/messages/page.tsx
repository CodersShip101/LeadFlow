'use client'

import { useRouter } from 'next/navigation'

export default function MessagesPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center pb-24 md:pb-0" style={{ background: '#F9FAFB', minHeight: 'calc(100vh - 56px)' }}>
      <div className="text-center animate-fade-in">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
          <i className="ti ti-message-2" style={{ fontSize: '24px', color: '#059669' }} />
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: '#111827' }}>Messages</h2>
        <p className="text-xs mb-5 max-w-[260px]" style={{ color: '#6B7280' }}>
          Chat with clients directly through LeadFlow. Coming soon.
        </p>
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm">
          <i className="ti ti-arrow-left" /> Back to feed
        </button>
      </div>
    </div>
  )
}
