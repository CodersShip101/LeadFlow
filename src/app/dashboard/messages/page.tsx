'use client'

import { useRouter } from 'next/navigation'
import { MessageSquare, ArrowLeft } from 'lucide-react'

export default function MessagesPage() {
  const router = useRouter()
  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-20 md:pb-0" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EBF5F0' }}>
          <MessageSquare size={24} style={{ color: '#1B6B4A' }} />
        </div>
        <h2 className="text-base font-bold mb-1" style={{ color: '#1A1D23' }}>Messages</h2>
        <p className="text-xs mb-5 max-w-[280px]" style={{ color: '#6B7280' }}>
          Direct messaging is coming soon. You'll be able to chat with clients and manage proposals here.
        </p>
        <button onClick={() => router.push('/dashboard')}
          className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#1B6B4A' }}>
          Back to feed
        </button>
      </div>
    </div>
  )
}
