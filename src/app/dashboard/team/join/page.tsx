'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

interface Preview { email: string; role: string; accepted: boolean; orgName: string | null; forYou: boolean; yourEmail: string | null; error?: string }

function JoinContent() {
  const router = useRouter()
  const sp = useSearchParams()
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    const t = sp.get('token')
    if (!t) { router.replace('/dashboard'); return }
    setToken(t)
    fetch(`/api/team/invite/preview?token=${encodeURIComponent(t)}`)
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => setPreview(ok ? d : { error: d.error || 'error' } as Preview))
      .catch(() => setPreview({ error: 'error' } as Preview))
      .finally(() => setLoading(false))
  }, [sp, router])

  const join = async () => {
    if (!token || joining) return
    setJoining(true)
    try {
      const res = await fetch('/api/team/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await res.json()
      if (res.ok && d.ok) { router.replace('/dashboard/team?invite=accepted') }
      else { toast.error(d.error || 'That invite is invalid or expired'); setJoining(false) }
    } catch { toast.error('Something went wrong'); setJoining(false) }
  }

  const switchAccount = async () => {
    try { await supabase.auth.signOut() } catch { /* proceed */ }
    await fetch('/auth/signout', { method: 'POST' }).catch(() => {})
    router.replace(`/auth/login?next=/dashboard/team/join?token=${token}`)
  }

  if (loading) return <Loader label="Loading invite…" />
  if (!token || !preview) return null

  const teamName = preview.orgName ? `${preview.orgName}` : 'a team'

  // Invalid / expired token.
  if (preview.error || preview.accepted) return (
    <div className="empty" style={{ maxWidth: 460, margin: '8vh auto 0' }}>
      <div className="empty-icon"><i className="ti ti-mail-off" /></div>
      <h3>{preview.accepted ? 'This invite was already used' : 'Invite not found'}</h3>
      <p>{preview.accepted ? 'It looks like this invitation has already been accepted.' : 'This invitation is invalid or has expired. Ask an admin to send a new one.'}</p>
      <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.replace('/dashboard')}>Go to dashboard</button>
    </div>
  )

  // Signed in as the wrong account — the invite is for someone else.
  if (!preview.forYou) return (
    <div className="empty" style={{ maxWidth: 480, margin: '8vh auto 0' }}>
      <div className="empty-icon"><i className="ti ti-user-exclamation" /></div>
      <h3>This invite isn&apos;t for this account</h3>
      <p>
        It was sent to <strong>{preview.email}</strong>, but you&apos;re signed in as <strong>{preview.yourEmail}</strong>.
        Sign in with the invited email address to join {teamName}.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 }}>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={switchAccount}>
          <i className="ti ti-switch-horizontal" /> Sign in as {preview.email}
        </button>
        <button className="btn btn-ghost" onClick={() => router.replace('/dashboard')}>Not now</button>
      </div>
    </div>
  )

  // Right account — confirm join.
  return (
    <div className="empty" style={{ maxWidth: 460, margin: '8vh auto 0' }}>
      <div className="empty-icon"><i className="ti ti-users-group" /></div>
      <h3>Join {teamName} on Flaiir?</h3>
      <p>
        Joining moves you into a shared <strong>Team</strong> workspace — a shared lead
        pool, pipeline and analytics — on their seat (the full Team plan). Your own saved
        leads and pipeline stay yours, and you can leave at any time.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 6 }}>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={join} disabled={joining}>
          <i className="ti ti-check" /> {joining ? 'Joining…' : `Join as ${preview.role}`}
        </button>
        <button className="btn btn-ghost" onClick={() => router.replace('/dashboard')} disabled={joining}>Not now</button>
      </div>
    </div>
  )
}

function Loader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 14 }}>{label}</span>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={<Loader label="Loading…" />}>
      <JoinContent />
    </Suspense>
  )
}
