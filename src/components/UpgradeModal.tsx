'use client'

import { useRouter } from 'next/navigation'


interface UpgradeModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
}

export default function UpgradeModal({ open, onClose, title = 'Upgrade to Pro', description = 'Unlock unlimited leads and full details.' }: UpgradeModalProps) {
  const router = useRouter()

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-xs w-full mx-4 shadow-xl relative"
        style={{ maxWidth: '320px' }}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="ibtn absolute top-3 right-3">
          <i className="ti ti-x" />
        </button>

        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#EBF5F0' }}>
            <i className="ti ti-lock" style={{ fontSize: '20px', color: '#1B6B4A' }} />
          </div>

          <h3 className="text-base font-semibold mb-1" style={{ color: '#1A1D23' }}>{title}</h3>
          <p className="text-xs mb-4" style={{ color: '#6B7280' }}>{description}</p>

          <ul className="text-left space-y-2 mb-5">
            {[
              'Unlimited leads every week',
              'Full lead details & source URLs',
              'Skill-based filtering',
              'Early access to new leads',
              'Priority matching',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs" style={{ color: '#4B5563' }}>
                <i className="ti ti-check" style={{ fontSize: '13px', color: '#1B6B4A' }} />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => { onClose(); router.push('/dashboard/billing') }}
            className="btn-int on w-full text-sm py-2.5"
          >
            Upgrade to Pro — £49/month
          </button>

          <button
            onClick={onClose}
            className="btn-ghost w-full justify-center mt-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
