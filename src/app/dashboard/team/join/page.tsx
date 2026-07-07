'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'

function JoinContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const t = sp.get('token')
    if (!t) { router.replace('/dashboard'); return }
    setToken(t)
  }, [sp, router])

  const join = async () => {
    if (!token || joining) return
    setJoining(true)
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (res.ok && d.ok) { router.replace('/dashboard/team?invite=accepted') }
      else { toast.error(d.error || 'That invite is invalid or expired'); setJoining(false) }
    } catch { toast.error('Something went wrong'); setJoining(false) }
  }

  if (!token) return null

  return (
    <div className="empty" style={{ maxWidth: 460, margin: '8vh auto 0' }}>
      <div className="empty-icon"><i className="ti ti-users-group" /></div>
      <h3>You&apos;ve been invited to a team</h3>
      <p>
        Joining moves you into a shared <strong>Team</strong> workspace — a shared lead
        pool, pipeline and analytics. Your own saved leads and pipeline stay yours.
        You can leave the team at any time.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 }}>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={join} disabled={joining}>
          <i className="ti ti-check" /> {joining ? 'Joining…' : 'Join the team'}
        </button>
        <button className="btn btn-ghost" onClick={() => router.replace('/dashboard')} disabled={joining}>
          Not now
        </button>
      </div>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
        <span style={{ fontSize: 14 }}>Loading…</span>
      </div>
    }>
      <JoinContent />
    </Suspense>
  )
}
