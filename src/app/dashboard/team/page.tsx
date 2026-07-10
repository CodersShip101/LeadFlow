'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { PRICING } from '@/lib/tiers'
import Dropdown from '@/components/Dropdown'
import LoadingDots from '@/components/LoadingDots'
import toast from 'react-hot-toast'

interface Member { user_id: string; role: string; created_at: string; profile: { full_name: string | null } | null }
interface Invite { email: string; role: string; created_at: string; token?: string }
interface PoolLead {
  id: string; status: string; assigned_to: string | null
  lead: { id: string; title: string; client_location: string | null } | null
}
interface LeaderRow { user_id: string; name: string; role: string; applied: number; won: number; winRate: number | null }
interface SeatEvent { id: string; actor: string; from: number; to: number; created_at: string }
interface CostPoint { label: string; seats: number; cost: number }
interface SeatPreview {
  seats?: number; currentSeats?: number; currency?: string; unitMinor?: number
  estimateMinor?: number; isCredit?: boolean; recurringDeltaMinor?: number
  nextRenewal?: number | null; isTrialing?: boolean; error?: string
}
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

function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
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
  const [tab, setTab] = useState<'overview' | 'members' | 'pool' | 'settings'>('overview')
  const [seatHistory, setSeatHistory] = useState<SeatEvent[]>([])
  const [seatCost, setSeatCost] = useState<{ months: CostPoint[]; perSeat: number; changed: boolean } | null>(null)

  const loadPool = useCallback(async () => {
    try {
      const [poolRes, statsRes, notifRes, histRes, costRes] = await Promise.all([
        fetch('/api/team/pool'), fetch('/api/team/analytics'), fetch('/api/team/notifications'),
        fetch('/api/team/seats/history'), fetch('/api/team/seats/analytics'),
      ])
      if (poolRes.ok) setPool(await poolRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
      if (notifRes.ok) { const d = await notifRes.json(); setSlackConfigured(d.configured) }
      if (histRes.ok) { const d = await histRes.json(); setSeatHistory(d.events ?? []) }
      if (costRes.ok) { const d = await costRes.json(); setSeatCost(d.months?.length ? d : null) }
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
        toast.success(d.emailed ? `Invitation emailed to ${email}` : 'Invite created — use "Copy link" to share it')
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

  const resendInvite = async (inviteEmail: string, inviteRole: string) => {
    const res = await fetch('/api/team/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    const d = await res.json().catch(() => ({}))
    if (res.ok) {
      toast.success(d.emailed ? `Invitation re-sent to ${inviteEmail}` : 'Invite refreshed — use "Copy link" to share it')
    } else toast.error(d.message || d.error || 'Could not resend')
  }

  const copyInviteLink = async (token?: string) => {
    if (!token) { toast.error('Link unavailable — try resending'); return }
    const url = `${window.location.origin}/dashboard/team/join?token=${token}`
    try { await navigator.clipboard.writeText(url); toast.success('Invite link copied') }
    catch { toast.error('Could not copy') }
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

  // Seat-change modal: open with a target count, preview the prorated cost,
  // then confirm. `seatTarget` !== null means the modal is open.
  const [seatTarget, setSeatTarget] = useState<number | null>(null)
  const [seatPreview, setSeatPreview] = useState<SeatPreview | null>(null)
  const [seatLoading, setSeatLoading] = useState(false)
  const [addingSeats, setAddingSeats] = useState(false)
  // Local, uncommitted seat target for the stepper (null = in sync with org).
  const [pendingSeats, setPendingSeats] = useState<number | null>(null)

  const openSeatChange = async (target: number) => {
    setSeatTarget(target)
    setSeatPreview(null)
    setSeatLoading(true)
    try {
      const res = await fetch('/api/team/seats/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: target }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) setSeatPreview(d)
      else setSeatPreview({ error: d.error || 'preview_failed' })
    } catch { setSeatPreview({ error: 'preview_failed' }) }
    finally { setSeatLoading(false) }
  }

  const addSeats = async (nextSeats: number) => {
    setAddingSeats(true)
    try {
      const res = await fetch('/api/team/seats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats: nextSeats }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(`Seats updated to ${d.seats}`); setSeatTarget(null); setPendingSeats(null); load(); loadPool() }
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
      {/* One calm header: seat usage (the page's key number) + your role. */}
      <div className="tm-header">
        <div className="tm-seats">
          <div className="tm-seats-bar" role="img" aria-label={`${seatsUsed} of ${org.seats} seats used`}>
            {Array.from({ length: org.seats }).map((_, i) => (
              <span key={i} className={`tm-seat-pip ${i < seatsUsed ? 'on' : i < seatsUsed + pendingInvites.length ? 'pending' : ''}`} />
            ))}
          </div>
          <p className="tm-sub">{seatsUsed} of {org.seats} seats used{pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending` : ''}</p>
        </div>
        <span className={`tm-role-chip ${isAdmin ? 'admin' : ''}`}>
          <i className={`ti ${isAdmin ? 'ti-shield-check' : 'ti-user'}`} /> You&apos;re {isAdmin ? 'an admin' : 'a member'}
        </span>
      </div>

      {/* Underline tabs — supplemental in-page navigation, one job per tab. */}
      <div className="tm-tabs" role="tablist">
        {([['overview', 'Overview'], ['members', 'Members'], ['pool', 'Lead pool'], ['settings', 'Settings']] as const).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`tm-tab ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>
            {label}
            {id === 'members' && pendingInvites.length > 0 && <span className="tm-tab-badge">{pendingInvites.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW: two columns — the work on the left, the read on the right ── */}
      {tab === 'overview' && stats && (() => {
        const s = stats.summary
        const pipeline = stats.pipeline
        const stages: Stage[] = ['saved', 'interested', 'applied', 'in_talks', 'hired', 'lost']
        const pipelineTotal = pipeline ? stages.reduce((n, st) => n + pipeline[st], 0) : 0
        const stageColor: Record<Stage, string> = {
          saved: 'var(--slate-2)', interested: '#D7E8A8', applied: 'var(--lime-deep)',
          in_talks: 'var(--amber, #E0A82E)', hired: 'var(--hi)', lost: 'var(--coral)',
        }
        // Honest, computed highlights — each one says what to do next.
        const topCloser = stats.leaderboard.find(r => r.won > 0)
        const mostActive = [...stats.leaderboard].sort((a, b) => b.applied - a.applied)[0]
        const unassigned = pool ? pool.leads.filter(l => !l.assigned_to).length : 0
        const decidedLost = pipeline?.lost ?? 0
        // Win-rate donut geometry (r=44 → circumference ≈ 276.5)
        const C = 2 * Math.PI * 44
        return (
        <section className="tm-section">
          <div className="tmov">
            <div className="tmov-main">
              {/* Flat numbers — no tiles */}
              <div className="tmov-nums">
                <div className="tmov-num"><span className="v">{s.totalApplied}</span><span className="l">applications</span></div>
                <div className="tmov-num"><span className="v" style={{ color: 'var(--lime-ink)' }}>{s.totalWon}</span><span className="l">won</span></div>
                <div className="tmov-num"><span className="v">{s.activeInPipeline ?? 0}</span><span className="l">active in pipeline</span></div>
              </div>

              {pipeline && pipelineTotal > 0 && (
                <div style={{ marginBottom: 30 }}>
                  <h4 className="tm-section-label">Pipeline · {pipelineTotal} leads</h4>
                  <div className="tmov-stack" role="img" aria-label="Pipeline distribution">
                    {stages.filter(st => pipeline[st] > 0).map(st => (
                      <span key={st} className="tip" data-tip={`${STAGE_LABEL[st]}: ${pipeline[st]}`}
                        style={{ width: `${(pipeline[st] / pipelineTotal) * 100}%`, background: stageColor[st] }} />
                    ))}
                  </div>
                  <div className="tmov-legend">
                    {stages.filter(st => pipeline[st] > 0).map(st => (
                      <span key={st} className="tmov-leg"><span className="d" style={{ background: stageColor[st] }} />{STAGE_LABEL[st]} <b>{pipeline[st]}</b></span>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="tm-section-label">Leaderboard</h4>
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

            {/* Right column — the read: win rate + what to do next */}
            <aside className="tmov-side">
              <div className="tmov-donut-wrap">
                <svg className="tmov-donut" viewBox="0 0 110 110" role="img" aria-label={`Team win rate ${s.teamWinRate ?? 0}%`}>
                  <circle cx="55" cy="55" r="44" fill="none" stroke="var(--paper-2)" strokeWidth="11" />
                  {s.teamWinRate !== null && (
                    <circle cx="55" cy="55" r="44" fill="none" stroke="var(--lime-deep)" strokeWidth="11"
                      strokeLinecap="round" strokeDasharray={`${(s.teamWinRate / 100) * C} ${C}`}
                      transform="rotate(-90 55 55)" />
                  )}
                </svg>
                <div className="tmov-donut-center">
                  <span className="v">{s.teamWinRate !== null ? `${s.teamWinRate}%` : '—'}</span>
                  <span className="l">win rate</span>
                </div>
              </div>
              <p className="tmov-donut-cap">
                {s.teamWinRate !== null
                  ? <>{s.totalWon} won · {decidedLost} lost so far</>
                  : <>Appears after your first won or lost lead</>}
              </p>

              <h4 className="tm-section-label" style={{ marginTop: 26 }}>Highlights</h4>
              <div className="tmov-his">
                {topCloser && (
                  <div className="tmov-hi">
                    <i className="ti ti-crown" style={{ color: 'var(--lime-ink)' }} />
                    <div><b>{topCloser.name}</b> is your top closer — {topCloser.won} won{topCloser.winRate !== null ? ` at ${topCloser.winRate}%` : ''}.</div>
                  </div>
                )}
                {mostActive && mostActive.applied > 0 && (
                  <div className="tmov-hi">
                    <i className="ti ti-send" />
                    <div><b>{mostActive.name}</b> is most active — {mostActive.applied} applications.</div>
                  </div>
                )}
                {unassigned > 0 && (
                  <div className="tmov-hi">
                    <i className="ti ti-user-question" style={{ color: 'var(--amber, #B98A19)' }} />
                    <div>
                      <b>{unassigned}</b> pool lead{unassigned === 1 ? '' : 's'} unassigned.{' '}
                      <button className="tmov-hi-link" onClick={() => setTab('pool')}>Assign owners</button>
                    </div>
                  </div>
                )}
                {!topCloser && (!mostActive || mostActive.applied === 0) && unassigned === 0 && (
                  <p className="tm-note" style={{ margin: 0 }}>Nothing to flag yet — highlights appear as your team applies and wins.</p>
                )}
              </div>
            </aside>
          </div>
        </section>
        )
      })()}
      {tab === 'overview' && !stats && (
        <div className="empty">
          <div className="empty-icon"><i className="ti ti-chart-bar" /></div>
          <h3>No activity yet</h3>
          <p>Once your team starts tracking and applying to leads, performance shows up here.</p>
        </div>
      )}

      {/* ── MEMBERS: everyone on the team, invites, and seats ── */}
      {tab === 'members' && (
        <section className="tm-section">
          {isAdmin && (
            <>
              <form className="tm-invite" onSubmit={invite}>
                <input type="email" className="auth-input" placeholder="teammate@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
                <Dropdown
                  ariaLabel="Invite as"
                  value={role}
                  onChange={v => setRole(v as 'member' | 'admin')}
                  options={[
                    { value: 'member', label: 'Member', icon: 'ti-user', hint: 'Shared pool, pipeline, templates' },
                    { value: 'admin', label: 'Admin', icon: 'ti-shield-check', hint: 'Also invites, removes, manages seats' },
                  ]}
                />
                <button className="btn btn-primary" disabled={inviting || seatsLeft <= 0}>
                  {inviting ? <LoadingDots label="Inviting" /> : <><i className="ti ti-send" /> Invite</>}
                </button>
              </form>
              {seatsLeft <= 0
                ? <p className="tm-note warn"><i className="ti ti-alert-triangle" /> All seats are in use — add a seat below to invite more.</p>
                : <p className="tm-note">{seatsLeft} seat{seatsLeft === 1 ? '' : 's'} available · we email the invite, and you can copy the link to share it yourself.</p>}
            </>
          )}

          <div className="tm-list" style={{ marginTop: isAdmin ? 22 : 0 }}>
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
            {pendingInvites.map(inv => (
              <div key={inv.email} className="tm-row pending-row">
                <span className="tm-avatar pending"><i className="ti ti-mail" /></span>
                <div className="tm-row-info">
                  <span className="tm-row-name">
                    {inv.email}
                    <span className="tm-invite-badge sent"><i className="ti ti-mail-check" /> Email sent</span>
                  </span>
                  <span className="tm-row-role">invited as {inv.role} · awaiting acceptance · reserves 1 seat</span>
                </div>
                {isAdmin && (
                  <div className="tm-row-actions">
                    <button className="pill tip" data-tip="Copy invite link" aria-label="Copy invite link" onClick={() => copyInviteLink(inv.token)}><i className="ti ti-link" /></button>
                    <button className="pill tip" data-tip="Resend invite email" aria-label="Resend invite" onClick={() => resendInvite(inv.email, inv.role)}><i className="ti ti-mail-forward" /></button>
                    <button className="pill tm-remove tip" data-tip="Cancel invite" aria-label="Cancel invite" onClick={() => cancelInvite(inv.email)}><i className="ti ti-x" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (() => {
            // Adjust the target locally with the stepper; nothing hits Stripe
            // until "Update" is confirmed — so 3→2→3 nets to zero, no charge.
            const target = pendingSeats ?? org.seats
            const floor = seatsUsed + pendingInvites.length
            const changed = target !== org.seats
            const perSeat = PRICING.team.monthly ?? 39
            const unused = org.seats - floor
            // Seat usage composition + pressure (at-a-glance).
            const used = seatsUsed
            const reserved = pendingInvites.length
            const free = Math.max(0, org.seats - used - reserved)
            const pressure = org.seats > 0 ? Math.round(((used + reserved) / org.seats) * 100) : 0
            const band = pressure >= 90 ? { l: 'High pressure', c: 'var(--coral)' } : pressure >= 60 ? { l: 'Moderate', c: 'var(--amber, #C98A19)' } : { l: 'Comfortable', c: 'var(--lime-ink)' }
            const seg = [
              { k: 'used', label: 'Used', n: used, color: 'var(--lime-deep)' },
              { k: 'reserved', label: 'Reserved', n: reserved, color: 'var(--amber, #E0A82E)' },
              { k: 'free', label: 'Free', n: free, color: 'var(--paper-2)' },
            ].filter(s => s.n > 0)
            const efficiency = org.seats > 0 ? Math.round((used / org.seats) * 100) : 0
            return (
              <section className="seatpanel">
                {/* Header: title + the live seat control */}
                <div className="seatpanel-head">
                  <div>
                    <h3 className="seatpanel-title">Seat management</h3>
                    <p className="seatpanel-sub">{org.seats} seat{org.seats === 1 ? '' : 's'} at £{perSeat}/mo each · billed on your subscription</p>
                  </div>
                  <div className="seatpanel-controls">
                    <div className="tm-seatctl" role="group" aria-label="Adjust seats" tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); setPendingSeats(Math.min(200, target + 1)) }
                        if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); setPendingSeats(Math.max(floor, target - 1)) }
                      }}>
                      <button className="pill tip" data-tip={`Removes £${perSeat}/mo`} aria-label="Remove a seat" disabled={addingSeats || target <= floor} onClick={() => setPendingSeats(Math.max(floor, target - 1))}>&minus;</button>
                      <span className="tm-seatctl-n">{target}{changed && <span className="tm-seat-delta">{target > org.seats ? `+${target - org.seats}` : `−${org.seats - target}`}</span>}</span>
                      <button className="pill tip" data-tip={`Adds £${perSeat}/mo`} aria-label="Add a seat" disabled={addingSeats || target >= 200} onClick={() => setPendingSeats(Math.min(200, target + 1))}>+</button>
                    </div>
                    {changed
                      ? <>
                          <button className="btn btn-primary btn-sm" onClick={() => openSeatChange(target)}>Review &amp; update</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setPendingSeats(null)}>Reset</button>
                        </>
                      : <span className="seatpanel-hint">Adjust seats</span>}
                  </div>
                </div>

                {/* KPI strip */}
                <div className="seat-kpis">
                  <div className="seat-kpi"><span className="v">{org.seats}</span><span className="l">Paid seats</span></div>
                  <div className="seat-kpi"><span className="v">£{org.seats * perSeat}<small>/mo</small></span><span className="l">Current cost</span></div>
                  <div className="seat-kpi"><span className="v">{efficiency}%</span><span className="l tip" data-tip="Members occupying a seat ÷ paid seats">Seat efficiency</span></div>
                  <div className="seat-kpi"><span className="v" style={{ color: band.c }}>{band.l}</span><span className="l">{pressure}% capacity</span></div>
                </div>

                {/* Usage composition bar */}
                <div className="seat-usage">
                  <div className="tmov-stack" role="img" aria-label={`${used} used, ${reserved} reserved, ${free} free of ${org.seats} seats`}>
                    {seg.map(s => <span key={s.k} className="tip" data-tip={`${s.label}: ${s.n}`} style={{ width: `${(s.n / org.seats) * 100}%`, background: s.color }} />)}
                  </div>
                  <div className="tmov-legend">
                    <span className="tmov-leg"><span className="d" style={{ background: 'var(--lime-deep)' }} />Used <b>{used}</b></span>
                    <span className="tmov-leg"><span className="d" style={{ background: 'var(--amber, #E0A82E)' }} />Reserved by invites <b>{reserved}</b></span>
                    <span className="tmov-leg"><span className="d" style={{ background: 'var(--paper-2)', border: '1px solid var(--line)' }} />Free <b>{free}</b></span>
                  </div>
                  {unused <= 0 && <p className="tm-seat-hint warn" style={{ marginTop: 10 }}><i className="ti ti-alert-triangle" /> All seats in use — add one to invite more.</p>}
                </div>

                {/* History + cost, two columns on wide screens */}
                {(seatHistory.length > 0 || (seatCost && seatCost.changed)) && (
                  <div className="seat-analytics-row">
                    {seatHistory.length > 0 && (
                      <div className="seat-analytics-col">
                        <h4 className="tm-section-label">Recent changes</h4>
                        <ul className="tm-hist-list">
                          {seatHistory.slice(0, 5).map(ev => {
                            const up = ev.to > ev.from
                            return (
                              <li key={ev.id}>
                                <span className={`tm-hist-ico ${up ? 'up' : 'down'}`}><i className={`ti ${up ? 'ti-arrow-up' : 'ti-arrow-down'}`} /></span>
                                <span className="tm-hist-txt"><b>{ev.actor}</b> {up ? 'added' : 'removed'} {Math.abs(ev.to - ev.from)} · {ev.from}→{ev.to}<span className="tm-hist-cost">{up ? '+' : '−'}£{Math.abs(ev.to - ev.from) * perSeat}</span></span>
                                <span className="tm-hist-when">{relTime(ev.created_at)}</span>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                    {seatCost && seatCost.changed && (() => {
                      const max = Math.max(...seatCost.months.map(m => m.cost), 1)
                      return (
                        <div className="seat-analytics-col">
                          <h4 className="tm-section-label">Cost · last 6 months</h4>
                          <div className="tm-cost-bars" role="img" aria-label="Monthly seat cost">
                            {seatCost.months.map((m, i) => (
                              <div key={i} className="tm-cost-col tip" data-tip={`${m.label}: ${m.seats} seat${m.seats === 1 ? '' : 's'} · £${m.cost}/mo`}>
                                <span className="tm-cost-bar" style={{ height: `${Math.max(6, (m.cost / max) * 100)}%` }} />
                                <span className="tm-cost-x">{m.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </section>
            )
          })()}
        </section>
      )}

      {/* ── LEAD POOL: what the team is tracking, and who owns what ── */}
      {tab === 'pool' && (
        <section className="tm-section">
          {!pool || pool.leads.length === 0 ? (
            <div className="empty">
              <div className="empty-icon"><i className="ti ti-briefcase" /></div>
              <h3>No shared leads yet</h3>
              <p>Track a lead from the feed and it lands here for the whole team to see and assign.</p>
              <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard')}>
                <i className="ti ti-layout-grid" /> Open the feed
              </button>
            </div>
          ) : (
            <div className="tm-list">
              {pool.leads.map(l => (
                <div key={l.id} className="tm-row">
                  <span className="tm-avatar pending"><i className="ti ti-briefcase" /></span>
                  <div className="tm-row-info">
                    <span className="tm-row-name">{l.lead?.title ?? 'Lead'}</span>
                    <span className="tm-row-role">{l.status}{l.lead?.client_location ? ` · ${l.lead.client_location}` : ''}</span>
                  </div>
                  <Dropdown
                    ariaLabel="Assign to"
                    value={l.assigned_to ?? ''}
                    onChange={v => assign(l.id, v)}
                    options={[
                      { value: '', label: 'Unassigned', icon: 'ti-user-question' },
                      ...pool.members.map(m => ({ value: m.user_id, label: m.name, icon: 'ti-user' })),
                    ]}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── SETTINGS: integrations + the rare, careful actions ── */}
      {tab === 'settings' && (
        <section className="tm-section">
          {isAdmin && (
            <div style={{ marginBottom: 30 }}>
              <h4 className="tm-section-label">Slack notifications {slackConfigured && <span className="tpl-shared"><i className="ti ti-check" /> Connected</span>}</h4>
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
          <div>
            <h4 className="tm-section-label">Leave team</h4>
            <p className="tm-note" style={{ marginTop: 0, marginBottom: 12 }}>
              You&apos;ll lose access to the shared pool and pipeline, and your plan reverts to what you had before joining.
            </p>
            <button className="pill tm-leave" onClick={leaveTeam}><i className="ti ti-logout" /> Leave team</button>
          </div>
        </section>
      )}

      {/* ── SEAT-CHANGE MODAL — preview the prorated cost before committing ── */}
      {seatTarget !== null && org && (() => {
        const increase = seatTarget > org.seats
        const cur = (seatPreview?.currency || 'gbp').toUpperCase()
        const money = (minor: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(Math.abs(minor) / 100)
        const perSeat = seatPreview?.unitMinor ?? (PRICING.team.monthly ?? 39) * 100
        const newMonthly = seatTarget * perSeat
        const renewalDate = seatPreview?.nextRenewal ? new Date(seatPreview.nextRenewal * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' }) : null
        return (
          <div className="tm-modal-back" onClick={() => !addingSeats && setSeatTarget(null)}>
            <div className="tm-modal" onClick={e => e.stopPropagation()}>
              <h3 className="tm-modal-title">{increase ? 'Add a seat' : 'Remove a seat'}</h3>
              <div className="tm-modal-seats">
                <span>{org.seats}</span>
                <i className="ti ti-arrow-right" />
                <span className="to">{seatTarget}</span>
                <span className="tm-modal-seats-lbl">seats</span>
              </div>

              {seatLoading ? (
                <p className="tm-note" style={{ margin: '14px 0' }}><LoadingDots label="Checking your billing" /></p>
              ) : seatPreview?.error === 'no_subscription' ? (
                <p className="tm-note" style={{ margin: '14px 0' }}>
                  Seats are managed once your Team subscription is active. Each seat is {money(perSeat)}/mo.
                </p>
              ) : seatPreview?.error ? (
                <p className="tm-note warn" style={{ margin: '14px 0' }}>
                  Couldn&apos;t estimate the cost — you can still continue; Stripe will charge the exact prorated amount.
                </p>
              ) : seatPreview ? (
                <ul className="tm-modal-lines">
                  {seatPreview.isTrialing ? (
                    <li><i className="ti ti-gift" /> You&apos;re in your free trial — no charge now. Billing starts {renewalDate ? `on ${renewalDate}` : 'when the trial ends'}.</li>
                  ) : increase ? (
                    <li><i className="ti ti-credit-card" /> <b>{money(seatPreview.estimateMinor ?? 0)}</b> charged now — prorated for the rest of this billing period.</li>
                  ) : (
                    <li><i className="ti ti-arrow-back-up" /> <b>{money(seatPreview.estimateMinor ?? 0)}</b> credit applied to your next invoice for the unused time.</li>
                  )}
                  <li><i className="ti ti-calendar-repeat" /> Your bill {increase ? 'rises' : 'falls'} to <b>{money(newMonthly)}/mo</b>{renewalDate ? `, from ${renewalDate}` : ''} ({money(perSeat)}/seat).</li>
                </ul>
              ) : null}

              <div className="tm-modal-actions">
                <button className="btn btn-ghost" onClick={() => setSeatTarget(null)} disabled={addingSeats}>Cancel</button>
                <button className="btn btn-primary" onClick={() => addSeats(seatTarget)} disabled={addingSeats || seatLoading}>
                  {addingSeats ? <LoadingDots label="Updating" /> : increase ? 'Add seat' : 'Remove seat'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
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
