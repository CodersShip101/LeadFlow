'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
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
type Stage = 'saved' | 'interested' | 'applied' | 'in_talks' | 'hired' | 'lost'
interface TeamStats {
  summary: {
    members: number; totalApplied: number; totalWon: number; teamWinRate: number | null
    poolSize?: number; activeInPipeline?: number; avgAppliedPerMember?: number
  }
  pipeline?: Record<Stage, number>
  leaderboard: LeaderRow[]
}

const STAGE_LABEL: Record<Stage, string> = {
  saved: 'Saved', interested: 'Interested', applied: 'Applied', in_talks: 'In talks', hired: 'Won', lost: 'Lost',
}
interface TeamData {
  org: { id: string; plan: string; seats: number; myRole: string } | null
  seatsUsed: number
  members: Member[]
  pendingInvites: Invite[]
}

function TeamContent() {
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
  const [slackConfigured, setSlackConfigured] = useState(false)
  const [slackUrl, setSlackUrl] = useState('')
  const [savingSlack, setSavingSlack] = useState(false)
  const [showAllBoard, setShowAllBoard] = useState(false)

  const loadPool = useCallback(async () => {
    try {
      const [poolRes, statsRes, notifRes] = await Promise.all([
        fetch('/api/team/pool'), fetch('/api/team/analytics'), fetch('/api/team/notifications'),
      ])
      if (poolRes.ok) setPool(await poolRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
      if (notifRes.ok) { const d = await notifRes.json(); setSlackConfigured(d.configured) }
    } catch { /* ignore */ }
  }, [])

  const saveSlack = async () => {
    setSavingSlack(true)
    try {
      const res = await fetch('/api/team/notifications', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slackWebhookUrl: slackUrl }),
      })
      const d = await res.json()
      if (res.ok) { setSlackConfigured(d.configured); setSlackUrl(''); toast.success(d.configured ? 'Slack connected — check your channel' : 'Slack disconnected') }
      else toast.error(d.error || 'Could not save')
    } finally { setSavingSlack(false) }
  }

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
        if (d.acceptUrl) navigator.clipboard?.writeText(d.acceptUrl).catch(() => {})
        toast.success(d.emailed ? 'Invite emailed' : 'Invite link copied — share it with them')
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

  const cancelInvite = async (inviteEmail: string) => {
    const res = await fetch('/api/team/invite', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail }),
    })
    if (res.ok) { toast.success('Invite cancelled'); load() }
    else toast.error('Could not cancel invite')
  }

  const leaveTeam = async () => {
    if (!myId) return
    if (!confirm('Leave this team? You’ll lose access to the shared pool, pipeline and templates.')) return
    const res = await fetch('/api/team/members', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: myId }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) { toast.success('You left the team'); router.push('/dashboard') }
    else toast.error(d.error === 'cannot remove the only admin' ? 'Assign another admin before leaving' : 'Could not leave team')
  }

  const [addingSeats, setAddingSeats] = useState(false)
  const addSeats = async (nextSeats: number) => {
    setAddingSeats(true)
    try {
      const res = await fetch('/api/team/seats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: nextSeats }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(`Seats updated to ${d.seats}`); load() }
      else toast.error(d.message || d.error || 'Could not update seats')
    } finally { setAddingSeats(false) }
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
        <div className="tm-seats">
          <div className="tm-seats-bar" role="img" aria-label={`${seatsUsed} of ${org.seats} seats used`}>
            {Array.from({ length: org.seats }).map((_, i) => (
              <span key={i} className={`tm-seat-pip ${i < seatsUsed ? 'on' : i < seatsUsed + pendingInvites.length ? 'pending' : ''}`} />
            ))}
          </div>
          <p className="tm-sub">{seatsUsed} of {org.seats} seats used{pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending` : ''}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {isAdmin && (
            <div className="tm-seatctl" role="group" aria-label="Add or remove seats">
              <button className="pill" aria-label="Remove a seat" disabled={addingSeats || org.seats <= seatsUsed + pendingInvites.length} onClick={() => addSeats(org.seats - 1)}>&minus;</button>
              <span className="tm-seatctl-n">{org.seats} seats</span>
              <button className="pill" aria-label="Add a seat" disabled={addingSeats || org.seats >= 200} onClick={() => addSeats(org.seats + 1)}>+</button>
            </div>
          )}
          <span className={`tm-role-chip ${isAdmin ? 'admin' : ''}`}>
            <i className={`ti ${isAdmin ? 'ti-shield-check' : 'ti-user'}`} /> You&apos;re {isAdmin ? 'an admin' : 'a member'}
          </span>
          <button className="pill tm-leave" onClick={leaveTeam}><i className="ti ti-logout" /> Leave team</button>
        </div>
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
            <div className="an-kpi"><span className="an-kpi-ico"><i className="ti ti-briefcase" /></span><span className="an-kpi-val">{stats.summary.poolSize ?? 0}</span><span className="an-kpi-lbl">Leads tracked</span></div>
            <div className="an-kpi"><span className="an-kpi-ico"><i className="ti ti-flame" /></span><span className="an-kpi-val">{stats.summary.activeInPipeline ?? 0}</span><span className="an-kpi-lbl">Active in pipeline</span></div>
            <div className="an-kpi"><span className="an-kpi-ico"><i className="ti ti-user-check" /></span><span className="an-kpi-val">{stats.summary.avgAppliedPerMember ?? 0}</span><span className="an-kpi-lbl">Avg / member</span></div>
          </div>

          {/* Pipeline breakdown across the team. Structural styling is inline so
              it doesn't depend on CSS load order/caching. */}
          {stats.pipeline && (() => {
            const stages: Stage[] = ['saved', 'interested', 'applied', 'in_talks', 'hired', 'lost']
            const max = Math.max(1, ...stages.map(s => stats.pipeline![s]))
            const total = stages.reduce((n, s) => n + stats.pipeline![s], 0)
            if (total === 0) return null
            const fillColor = (s: Stage) =>
              s === 'hired' ? 'var(--hi)' : s === 'lost' ? 'var(--coral)' : s === 'saved' ? 'var(--slate-2)' : 'var(--lime-deep)'
            return (
              <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                <h4 style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Pipeline breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {stages.map(s => (
                    <div key={s} style={{ display: 'grid', gridTemplateColumns: '84px 1fr 34px', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{STAGE_LABEL[s]}</span>
                      <span style={{ height: 8, borderRadius: 4, background: 'var(--paper-2)', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', borderRadius: 4, width: `${(stats.pipeline![s] / max) * 100}%`, background: fillColor(s) }} />
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--slate)', textAlign: 'right' }}>{stats.pipeline![s]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
          <div className="tm-board">
            <div className="tm-board-head"><span>#</span><span>Member</span><span>Applied</span><span>Won</span><span>Win rate</span></div>
            {(showAllBoard ? stats.leaderboard : stats.leaderboard.slice(0, 5)).map((r, i) => (
              <div key={r.user_id} className={`tm-board-row ${i === 0 && r.won > 0 ? 'lead' : ''}`}>
                <span className="tm-rank">{i === 0 && r.won > 0 ? <i className="ti ti-crown" /> : i + 1}</span>
                <span className="tm-board-name">{r.name}{r.role === 'admin' && <span className="tm-you">admin</span>}</span>
                <span>{r.applied}</span>
                <span>{r.won}</span>
                <span className="tm-board-rate">
                  {r.winRate !== null ? (
                    <span className="tm-rate-wrap">
                      <span className="tm-rate-bar"><span className="tm-rate-fill" style={{ width: `${r.winRate}%` }} /></span>
                      <span className="tm-rate-num">{r.winRate}%</span>
                    </span>
                  ) : <span className="tm-rate-num dim">—</span>}
                </span>
              </div>
            ))}
          </div>
          {stats.leaderboard.length > 5 && (
            <button className="tm-board-more" onClick={() => setShowAllBoard(v => !v)}>
              {showAllBoard ? 'Show top 5' : `Show all ${stats.leaderboard.length}`}
              <i className={`ti ${showAllBoard ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
            </button>
          )}
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
                  <span className={`tm-role-tag ${m.role === 'admin' ? 'admin' : ''}`}>{m.role}</span>
                </div>
                {isAdmin && !isMe && (
                  <div className="tm-row-actions">
                    <button className="pill" onClick={() => changeRole(m.user_id, m.role === 'admin' ? 'member' : 'admin')}>
                      Make {m.role === 'admin' ? 'member' : 'admin'}
                    </button>
                    <button className="pill tm-remove tip" data-tip="Remove from team" aria-label="Remove from team" onClick={() => removeMember(m.user_id)}><i className="ti ti-trash" /></button>
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
                {isAdmin && (
                  <div className="tm-row-actions">
                    <button className="pill tm-remove tip" data-tip="Cancel invite" aria-label="Cancel invite" onClick={() => cancelInvite(inv.email)}><i className="ti ti-x" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slack notifications (admin) */}
      {isAdmin && (
        <div className="tm-card">
          <h3 className="tm-card-title">Slack notifications {slackConfigured && <span className="tpl-shared"><i className="ti ti-check" /> Connected</span>}</h3>
          <p className="tm-note" style={{ marginTop: 0, marginBottom: 12 }}>
            Get a message in Slack when a lead is assigned. Create an <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="auth-cta-link">incoming webhook</a> and paste its URL.
          </p>
          <div className="tm-invite">
            <input type="url" className="auth-input" placeholder="https://hooks.slack.com/services/…" value={slackUrl} onChange={e => setSlackUrl(e.target.value)} />
            <button className="btn btn-primary" onClick={saveSlack} disabled={savingSlack}>
              {savingSlack ? <LoadingDots label="Saving" /> : slackConfigured && !slackUrl ? <><i className="ti ti-x" /> Disconnect</> : <><i className="ti ti-brand-slack" /> Connect</>}
            </button>
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

export default function TeamPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 10, color: 'var(--slate)' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lime)', animation: 'pulse 1.2s ease-in-out infinite' }} />
        <span style={{ fontSize: 14 }}>Loading&hellip;</span>
      </div>
    }>
      <TeamContent />
    </Suspense>
  )
}
