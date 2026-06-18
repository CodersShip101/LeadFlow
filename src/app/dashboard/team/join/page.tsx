'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function JoinTeamPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [msg, setMsg] = useState('Joining your team…')

  useEffect(() => {
    const token = sp.get('token')
    if (!token) { router.replace('/dashboard'); return }
    fetch('/api/team/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok) router.replace('/dashboard/team?invite=accepted')
        else { setMsg('That invite is invalid or expired.'); setTimeout(() => router.replace('/dashboard/team?invite=error'), 1500) }
      })
      .catch(() => { setMsg('Something went wrong.'); setTimeout(() => router.replace('/dashboard'), 1500) })
  }, [sp, router])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 14 }}>{msg}</span>
    </div>
  )
}
