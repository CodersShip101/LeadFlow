'use client'

import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  open: boolean
  onClose: () => void
}

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const router = useRouter()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp .3s ease' }}>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
          <i className="ti ti-sparkles" style={{ fontSize: '22px', color: '#059669' }} />
        </div>
        <h3 className="text-lg font-bold mb-1" style={{ color: '#111827' }}>Upgrade to Pro</h3>
        <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
          Get unlimited leads, advanced filters, and pipeline management. £29/month.
        </p>
        <button onClick={() => { onClose(); router.push('/dashboard/billing') }}
          className="btn-primary w-full justify-center mb-2">
          Go Pro <i className="ti ti-arrow-right" />
        </button>
        <button onClick={onClose} className="btn-ghost w-full justify-center">
          Maybe later
        </button>
      </div>
    </div>
  )
}
