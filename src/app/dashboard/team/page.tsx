'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import LoadingDots from '@/components/LoadingDots'
import toast from 'react-hot-toast'

interface Member { user_id: string; role: string; created_at: string; profile: { full_name: string | null } | null }
interface Invite { email: string; role: string; created_at: string }
interface PoolLead {
  id: string; status: string; assigned_to: string | null
  lead: { id: string; title: string; client_location: string | null } | null
}
interface LeaderRow { user_id: string; name: string; role: string; applied: number; won: number; winRate: number | null }
interface TeamStats { summary: { members: number; totalApplied: number; totalWon: number; teamWinRate: number | null }; leaderboard: LeaderRow[] }
interface TeamData {
  org: { id: string; plan: string; seats: number; myRole: string } | null
  seatsUsed: number
  members: Member[]
  pendingInvites: Invite[]
}

export default function TeamPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const supabase = createClient()
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'member' | 'admin'>('member')
  const [inviting, setInviting] = useState(false)
  const [myId, setMyId] = useState<string | null>(null)
  const [pool, setPool] = useState<{ leads: PoolLead[]; members: { user_id: string; name: string }[] } | null>(null)
  const [stats, setStats] = useState<TeamStats | null>(null)

  const loadPool = useCallback(async () => {
    try {
      const [poolRes, statsRes] = await Promise.all([fetch('/api/team/pool'), fetch('/api/team/analytics')])
      if (poolRes.ok) setPool(await poolRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch { /* ignore */ }
  }, [])

  const assign = async (applicationId: string, assignTo: string) => {
    const res = await fetch('/api/team/pool', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, assignTo: assignTo || null }),
    })
    if (res.ok) { toast.success('Assigned'); loadPool() } else toast.error('Could not assign')
  }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    setMyId(user.id)
    try {
      const res = await fetch('/api/team/members')
      if (res.ok) setData(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { load(); loadPool() }, [load, loadPool])

  useEffect(() => {
    const inv = sp.get('invite')
    if (inv === 'accepted') toast.success('You joined the team')
    else if (inv === 'error') toast.error('That invite is invalid or expired')
  }, [sp])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (inviting || !email) return
    setInviting(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success('Invite sent')
        if (d.acceptUrl) navigator.clipboard?.writeText(d.acceptUrl).catch(() => {})
        setEmail('')
        load()
      } else {
        toast.error(d.message || d.error || 'Could not invite')
      }
    } catch { toast.error('Network error') }
    finally { setInviting(false) }
  }

  const changeRole = async (userId: string, newRole: string) => {
    const res = await fetch('/api/team/members', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    if (res.ok) { toast.success('Role updated'); load() }
    else toast.error('Could not update role')
  }

  const removeMember = async (userId: string) => {
    const res = await fetch('/api/team/members', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) { toast.success('Member removed'); load() }
    else toast.error('Could not remove member')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
      <span style={{ fontSize: 14 }}>Loading&hellip;</span>
    </div>
  )

  // No org → not on a team
  if (!data?.org) return (
    <div className="empty">
      <div className="empty-icon"><i className="ti ti-users-group" /></div>
      <h3>Team is a Team-plan feature</h3>
      <p>Invite teammates, share a lead pool and pipeline, and manage roles. Upgrade to Team to get started.</p>
      <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard/billing')}>
        <i className="ti ti-users" /> See Team plan
      </button>
    </div>
  )

  const { org, seatsUsed, members, pendingInvites } = data
  const isAdmin = org.myRole === 'admin'
  const seatsLeft = org.seats - seatsUsed - pendingInvites.length

  return (
    <>
      <div className="tm-header">
        <div>
          <h2 className="tm-title">Team</h2>
          <p className="tm-sub">{seatsUsed} of {org.seats} seats used{pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending` : ''}</p>
        </div>
        <span className={`tm-role-chip ${isAdmin ? 'admin' : ''}`}>
          <i className={`ti ${isAdmin ? 'ti-shield-check' : 'ti-user'}`} /> You&apos;re {isAdmin ? 'an admin' : 'a member'}
        </span>
      </div>

      {/* Team performance */}
      {stats && (
        <div className="tm-card">
          <h3 className="tm-card-title">Team performance</h3>
          <div className="an-kpis" style={{ marginBottom: 18 }}>
            <div className="an-kpi"><span className="an-kpi-ico"><i className="ti ti-users" /></span><span className="an-kpi-val">{stats.summary.members}</span><span className="an-kpi-lbl">Members</span></div>
            <div className="an-kpi"><span className="an-kpi-ico"><i className="ti ti-send" /></span><span className="an-kpi-val">{stats.summary.totalApplied}</span><span className="an-kpi-lbl">Applications</span></div>
            <div className="an-kpi"><span className="an-kpi-ico" style={{ background: 'var(--lime-dim)', color: 'var(--lime-ink)' }}><i className="ti ti-trophy" /></span><span className="an-kpi-val">{stats.summary.totalWon}</span><span className="an-kpi-lbl">Won</span></div>
            <div className="an-kpi"><span className="an-kpi-ico" style={{ background: 'var(--hi-bg)', color: 'var(--hi)' }}><i className="ti ti-percentage" /></span><span className="an-kpi-val">{stats.summary.teamWinRate !== null ? `${stats.summary.teamWinRate}%` : '—'}</span><span className="an-kpi-lbl">Team win rate</span></div>
          </div>
          <div className="tm-board">
            <div className="tm-board-head"><span>#</span><span>Member</span><span>Applied</span><span>Won</span><span>Win rate</span></div>
            {stats.leaderboard.map((r, i) => (
              <div key={r.user_id} className={`tm-board-row ${i === 0 && r.won > 0 ? 'lead' : ''}`}>
                <span className="tm-rank">{i === 0 && r.won > 0 ? <i className="ti ti-crown" /> : i + 1}</span>
                <span className="tm-board-name">{r.name}{r.role === 'admin' && <span className="tm-you">admin</span>}</span>
                <span>{r.applied}</span>
                <span>{r.won}</span>
                <span className="tm-board-rate">{r.winRate !== null ? `${r.winRate}%` : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite */}
      {isAdmin && (
        <div className="tm-card">
          <h3 className="tm-card-title">Invite a teammate</h3>
          <form className="tm-invite" onSubmit={invite}>
            <input type="email" className="auth-input" placeholder="teammate@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            <select className="tm-select" value={role} onChange={e => setRole(e.target.value as 'member' | 'admin')}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn btn-primary" disabled={inviting || seatsLeft <= 0}>
              {inviting ? <LoadingDots label="Inviting" /> : <><i className="ti ti-send" /> Invite</>}
            </button>
          </form>
          {seatsLeft <= 0
            ? <p className="tm-note warn"><i className="ti ti-alert-triangle" /> All seats are in use. Add seats in billing to invite more.</p>
            : <p className="tm-note">{seatsLeft} seat{seatsLeft === 1 ? '' : 's'} available · the invite link is copied to your clipboard when you send it.</p>}
        </div>
      )}

      {/* Members */}
      <div className="tm-card">
        <h3 className="tm-card-title">Members</h3>
        <div className="tm-list">
          {members.map(m => {
            const name = m.profile?.full_name || 'Teammate'
            const isMe = m.user_id === myId
            return (
              <div key={m.user_id} className="tm-row">
                <span className="tm-avatar">{name.slice(0, 1).toUpperCase()}</span>
                <div className="tm-row-info">
                  <span className="tm-row-name">{name}{isMe && <span className="tm-you">you</span>}</span>
                  <span className="tm-row-role">{m.role}</span>
                </div>
                {isAdmin && !isMe && (
                  <div className="tm-row-actions">
                    <button className="pill" onClick={() => changeRole(m.user_id, m.role === 'admin' ? 'member' : 'admin')}>
                      Make {m.role === 'admin' ? 'member' : 'admin'}
                    </button>
                    <button className="pill tm-remove" onClick={() => removeMember(m.user_id)} title="Remove"><i className="ti ti-trash" /></button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="tm-card">
          <h3 className="tm-card-title">Pending invites</h3>
          <div className="tm-list">
            {pendingInvites.map(inv => (
              <div key={inv.email} className="tm-row">
                <span className="tm-avatar pending"><i className="ti ti-mail" /></span>
                <div className="tm-row-info">
                  <span className="tm-row-name">{inv.email}</span>
                  <span className="tm-row-role">invited as {inv.role} · awaiting acceptance</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared lead pool */}
      <div className="tm-card">
        <h3 className="tm-card-title">Shared lead pool</h3>
        {!pool || pool.leads.length === 0 ? (
          <p className="tm-note">Leads your team tracks appear here. Track a lead from the feed to add it to the pool.</p>
        ) : (
          <div className="tm-list">
            {pool.leads.map(l => (
              <div key={l.id} className="tm-row">
                <span className="tm-avatar pending"><i className="ti ti-briefcase" /></span>
                <div className="tm-row-info">
                  <span className="tm-row-name">{l.lead?.title ?? 'Lead'}</span>
                  <span className="tm-row-role">{l.status}{l.lead?.client_location ? ` · ${l.lead.client_location}` : ''}</span>
                </div>
                <select className="tm-select" value={l.assigned_to ?? ''} onChange={e => assign(l.id, e.target.value)}>
                  <option value="">Unassigned</option>
                  {pool.members.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
