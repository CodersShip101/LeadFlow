'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Application, Profile } from '@/types'
import { formatBudgetGBP } from '@/lib/utils'
import { canonSource, sourceMeta } from '@/lib/sources'
import { entitlementsFor, type Tier } from '@/lib/tiers'

function reminderLabel(iso: string): { label: string; overdue: boolean } {
  const t = new Date(iso).getTime()
  const overdue = t < Date.now()
  const days = Math.round((t - Date.now()) / 86400000)
  let label: string
  if (overdue) label = 'overdue'
  else if (days === 0) label = 'today'
  else if (days === 1) label = 'tomorrow'
  else if (days <= 14) label = `in ${days}d`
  else label = new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return { label, overdue }
}

// Compact money label for column totals: £850, £4.2k, £12k
function moneyShort(n: number): string {
  if (n >= 1000) return `£${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '')}k`
  return `£${n}`
}

const REMIND_OPTS: [string, number][] = [
  ['Later today', 3],
  ['Tomorrow', 24],
  ['In 3 days', 72],
  ['Next week', 168],
]

// The four working columns. Lost lives in a collapsible tray under the board —
// it's an archive, not a stage you work.
const COLS = [
  { key: 'interested', label: 'Interested', color: 'var(--slate-2)',   tint: 'rgba(107,118,105,.04)', next: 'applied',  nextLabel: 'Mark applied' },
  { key: 'applied',    label: 'Applied',    color: 'var(--lime-deep)', tint: 'rgba(196,240,0,.05)',   next: 'in_talks', nextLabel: 'In talks' },
  { key: 'in_talks',   label: 'In talks',   color: 'var(--mid)',       tint: 'rgba(216,146,10,.05)',  next: 'hired',    nextLabel: 'Mark as won' },
  { key: 'hired',      label: 'Won',        color: 'var(--hi)',        tint: 'rgba(91,160,46,.07)',   next: null,       nextLabel: '' },
]

// Closed stages: no staleness warnings, sorted newest-first.
const CLOSED = new Set(['hired', 'lost'])

function SkeletonKanban() {
  return (
    <>
      <div className="pipe-header">
        <div className="pipe-header-left">
          <div className="skel" style={{ width: 220, height: 16, borderRadius: 5 }} />
        </div>
        <div className="pipe-stats">
          {[0, 1, 2, 3, 4].map(i => (
            <Fragment key={i}>
              {i > 0 && <div className="pipe-stat-sep" />}
              <div className="pipe-stat">
                <div className="skel" style={{ width: 30, height: 22, borderRadius: 5, margin: '0 auto 4px' }} />
                <div className="skel" style={{ width: 42, height: 11, borderRadius: 4, margin: '0 auto' }} />
              </div>
            </Fragment>
          ))}
        </div>
      </div>
      <div className="kanban">
        {COLS.map(col => (
          <div key={col.key} className="kan-col">
            <div className="kan-head" style={{ borderBottom: `2px solid color-mix(in srgb, ${col.color} 22%, transparent)` }}>
              <span className="kan-dot" style={{ background: col.color }} />
              <div className="skel" style={{ width: 60, height: 14, borderRadius: 5 }} />
              <div className="skel" style={{ width: 28, height: 19, borderRadius: 99, marginLeft: 'auto' }} />
            </div>
            <div className="kan-body" style={{ background: col.tint }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="skel-card" style={{ borderLeft: `3px solid ${col.color}` }}>
                  <div className="skel" style={{ width: '40%', height: 12, borderRadius: 5, marginBottom: 10 }} />
                  <div className="skel" style={{ width: '85%', height: 14, borderRadius: 5, marginBottom: 10 }} />
                  <div className="skel" style={{ width: '55%', height: 12, borderRadius: 5 }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function ErrorState() {
  return (
    <div className="empty">
      <h3>Could not load pipeline</h3>
      <p>Check your connection and try again.</p>
      <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  )
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragCol, setDragCol] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [remindOpen, setRemindOpen] = useState<string | null>(null)
  const [lostOpen, setLostOpen] = useState(false)
  const [noteEditId, setNoteEditId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  // Team assignment (team plan only): org members + applicationId -> assignee.
  const [mates, setMates] = useState<{ user_id: string; name: string }[]>([])
  const [assignees, setAssignees] = useState<Record<string, string | null>>({})
  const supabase = createClient()
  const router = useRouter()

  const plan = (profile?.subscription_status ?? 'free') as Tier
  const canRemind = entitlementsFor(plan).calendarSync

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/login'); return }
        const profRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(profRes.data)
        let { data: apps, error } = await supabase
          .from('applications')
          .select('id, lead_id, status, outcome, outcome_at, created_at, stage_changed_at, lost_reason, won_amount, follow_up_at, follow_up_note, note')
          .eq('freelancer_id', user.id)
        if (error || !apps) {
          const res = await fetch('/api/applications')
          if (res.ok) apps = await res.json()
        }
        setApplications((apps || []) as Application[])
        const activeIds = (apps || []).filter(a => a.status !== 'saved').map(a => a.lead_id)
        if (activeIds.length > 0) {
          const { data } = await supabase.from('leads').select('*').in('id', activeIds).eq('status', 'active')
          setLeads(data || [])
        }
        // Team plan: load org members + current assignments for the assign control.
        if (profRes.data?.subscription_status === 'team') {
          const poolRes = await fetch('/api/team/pool')
          if (poolRes.ok) {
            const pool = await poolRes.json()
            setMates(pool.members ?? [])
            const map: Record<string, string | null> = {}
            for (const l of pool.leads ?? []) map[l.id] = l.assigned_to ?? null
            setAssignees(map)
          }
        }
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase, router])

  // Remove from pipeline entirely (delete the application row).
  const removeApp = async (leadId: string) => {
    if (!window.confirm('Remove this lead from your pipeline? Its notes and stage history go with it.')) return
    const res = await fetch('/api/applications', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId }),
    })
    if (res.ok) {
      setApplications(prev => prev.filter(a => a.lead_id !== leadId))
      setLeads(prev => prev.filter(l => l.id !== leadId))
      toast.success('Removed from pipeline')
    } else toast.error('Could not remove')
  }

  // Assign an application to a teammate (team plan).
  const assignTo = async (applicationId: string, userId: string) => {
    const res = await fetch('/api/team/pool', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, assignTo: userId || null }),
    })
    if (res.ok) {
      setAssignees(prev => ({ ...prev, [applicationId]: userId || null }))
      toast.success(userId ? 'Assigned' : 'Unassigned')
    } else toast.error('Could not assign')
  }

  const appMap = useMemo(() => {
    const m = new Map<string, Application>()
    applications.forEach(a => m.set(a.lead_id, a))
    return m
  }, [applications])

  const grouped = useMemo(() => {
    const g: Record<string, Lead[]> = { interested: [], applied: [], in_talks: [], hired: [], lost: [] }
    leads.forEach(l => {
      const app = appMap.get(l.id)
      if (app && app.status !== 'saved' && g[app.status]) g[app.status].push(l)
    })
    // Active columns: overdue follow-ups first, then longest-waiting.
    // Closed columns: most recent decisions first.
    const movedAt = (l: Lead) => {
      const a = appMap.get(l.id)
      return new Date(a?.stage_changed_at || a?.created_at || 0).getTime()
    }
    const overdueRank = (l: Lead) => {
      const fu = appMap.get(l.id)?.follow_up_at
      return fu && new Date(fu).getTime() < Date.now() ? 0 : 1
    }
    for (const key of Object.keys(g)) {
      if (CLOSED.has(key)) g[key].sort((a, b) => movedAt(b) - movedAt(a))
      else g[key].sort((a, b) => overdueRank(a) - overdueRank(b) || movedAt(a) - movedAt(b))
    }
    return g
  }, [leads, appMap])

  const totalActive = applications.filter(a => a.status !== 'saved').length
  const openCount = grouped.interested.length + grouped.applied.length + grouped.in_talks.length
  const inTalksCount = grouped.in_talks.length
  const wonCount = grouped.hired.length
  const lostCount = grouped.lost.length
  const decided = wonCount + lostCount
  const winRate = decided > 0 ? Math.round((wonCount / decided) * 100) : null

  // Average days the open deals have sat in their current stage.
  const openApps = applications.filter(a => a.status === 'interested' || a.status === 'applied' || a.status === 'in_talks')
  const avgWaitDays = openApps.length > 0
    ? Math.round(openApps.reduce((s, a) => s + (Date.now() - new Date(a.stage_changed_at || a.created_at).getTime()) / 86400000, 0) / openApps.length)
    : null

  // Patch outcome detail (lost reason, won amount) on an existing application.
  const saveExtra = async (leadId: string, body: Record<string, unknown>) => {
    const r = await fetch('/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, ...body }) })
    if (r.ok) {
      const app = await r.json()
      setApplications(prev => prev.map(a => a.lead_id === leadId ? app : a))
      return true
    }
    return false
  }

  // After a forward move, follow-up is the default, not an afterthought —
  // one tap sets the reminder that keeps the deal alive.
  const promptFollowUp = (leadId: string, status: string) => {
    toast(t => (
      <div className="fu-toast">
        <div className="fu-toast-title">{status === 'in_talks' ? 'In talks — follow up when?' : 'Applied — follow up when?'}</div>
        <div className="fu-toast-btns">
          {([['Tomorrow', 24], ['3 days', 72], ['Next week', 168]] as [string, number][]).map(([label, hours]) => (
            <button key={label} onClick={() => { toast.dismiss(t.id); setReminder(leadId, hours) }}>{label}</button>
          ))}
          <button className="fu-skip" onClick={() => toast.dismiss(t.id)}>Skip</button>
        </div>
      </div>
    ), { duration: 10000 })
  }

  const LOST_REASONS = ['Went quiet', 'Budget too low', 'Chose someone else', 'Bad fit']
  const promptLostReason = (leadId: string) => {
    toast(t => (
      <div className="fu-toast">
        <div className="fu-toast-title">Marked as lost — why?</div>
        <div className="fu-toast-btns">
          {LOST_REASONS.map(reason => (
            <button key={reason} onClick={async () => { toast.dismiss(t.id); if (await saveExtra(leadId, { lost_reason: reason })) toast('Noted') }}>{reason}</button>
          ))}
          <button className="fu-skip" onClick={() => toast.dismiss(t.id)}>Skip</button>
        </div>
      </div>
    ), { duration: 12000 })
  }

  const promptWonAmount = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId)
    const def = lead?.budget_max ?? lead?.budget_min ?? undefined
    toast(t => (
      <div className="fu-toast">
        <div className="fu-toast-title">Won — confirm the deal value</div>
        <div className="fu-toast-btns">
          <input id={`won-amt-${t.id}`} className="fu-input" type="number" min="0" step="1" defaultValue={def} placeholder="£" />
          <button onClick={async () => {
            const el = document.getElementById(`won-amt-${t.id}`) as HTMLInputElement | null
            const v = el && el.value !== '' ? Number(el.value) : null
            toast.dismiss(t.id)
            if (v != null && Number.isFinite(v) && v >= 0 && await saveExtra(leadId, { won_amount: v })) toast.success('Deal value saved')
          }}>Save</button>
          <button className="fu-skip" onClick={() => toast.dismiss(t.id)}>Skip</button>
        </div>
      </div>
    ), { duration: 15000 })
  }

  const updateApp = async (leadId: string, status: string, opts?: { reopen?: boolean }) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, status }),
    })
    if (res.ok) {
      const app = await res.json()
      setApplications(prev => [...prev.filter(a => a.lead_id !== leadId), app])
      if (opts?.reopen) toast.success('Reopened')
      else if (status === 'hired') promptWonAmount(leadId)
      else if (status === 'lost') promptLostReason(leadId)
      else if (status === 'applied' || status === 'in_talks') {
        if (canRemind && !app?.follow_up_at) promptFollowUp(leadId, status)
        else toast.success(status === 'in_talks' ? 'Moved to in talks' : 'Marked as applied')
      }
      else toast('Moved back to interested')
    }
  }

  const setReminder = async (leadId: string, hours: number | null) => {
    setRemindOpen(null)
    const follow_up_at = hours == null ? null : new Date(Date.now() + hours * 3600000).toISOString()
    try {
      const res = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, follow_up_at }) })
      if (res.ok) {
        setApplications(prev => prev.map(a => a.lead_id === leadId ? { ...a, follow_up_at } : a))
        toast.success(hours == null ? 'Follow-up cleared' : 'Follow-up set')
      } else if (res.status === 403) {
        toast.error('Follow-up reminders are a Pro feature')
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Could not set reminder')
      }
    } catch { toast.error('Network error') }
  }

  const startEditNote = (leadId: string, current: string) => { setNoteEditId(leadId); setNoteDraft(current) }
  const saveNote = async (leadId: string) => {
    if (savingNote) return
    setSavingNote(true)
    const note = noteDraft.trim()
    try {
      const r = await fetch('/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, note }) })
      if (r.ok) {
        setApplications(prev => prev.map(a => a.lead_id === leadId ? { ...a, note: note || null } : a))
        setNoteEditId(null)
        toast.success(note ? 'Note saved' : 'Note cleared')
      } else {
        const d = await r.json().catch(() => ({}))
        toast.error(d.error || 'Could not save note')
      }
    } finally { setSavingNote(false) }
  }

  const handleDragStart = (e: React.DragEvent, leadId: string, col: string) => {
    setDragId(leadId); setDragCol(col)
    e.dataTransfer.effectAllowed = 'move'
    const el = e.currentTarget as HTMLElement | null
    requestAnimationFrame(() => el?.classList.add('dragging'))
  }
  const handleDragEnd = (e: React.DragEvent) => {
    ;(e.currentTarget as HTMLElement).classList.remove('dragging')
    setDragId(null); setDragCol(null); setOverCol(null)
  }
  const handleDragOver = (e: React.DragEvent, col: string) => { e.preventDefault(); setOverCol(col) }
  const handleDrop = (e: React.DragEvent, toCol: string) => {
    e.preventDefault(); setOverCol(null)
    if (dragCol && toCol && dragCol !== toCol && dragId) updateApp(dragId, toCol)
    setDragId(null); setDragCol(null)
  }

  if (loading) return <SkeletonKanban />
  if (error) return <ErrorState />
  if (totalActive === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><i className="ti ti-send"></i></div>
        <h3>Your pipeline is empty</h3>
        <p>Click Apply on any lead in the feed to start tracking it here.</p>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard')}>
          Browse leads
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── HEADER ── */}
      <div className="pipe-header">
        <div className="pipe-header-left">
          <p className="pipe-sub">Drag cards between stages.</p>
        </div>
        <div className="pipe-stats">
          <div className="pipe-stat">
            <span className="pipe-stat-v">{openCount}</span>
            <span className="pipe-stat-l tip" data-tip="Deals in interested, applied or in-talks — not yet won or lost">open</span>
          </div>
          <div className="pipe-stat-sep" />
          <div className="pipe-stat">
            <span className="pipe-stat-v" style={{ color: 'var(--mid)' }}>{inTalksCount}</span>
            <span className="pipe-stat-l tip" data-tip="Deals where a conversation with the client is underway">in talks</span>
          </div>
          <div className="pipe-stat-sep" />
          <div className="pipe-stat">
            <span className="pipe-stat-v" style={{ color: 'var(--hi)' }}>{wonCount}</span>
            <span className="pipe-stat-l tip" data-tip="Deals you marked as won">won</span>
          </div>
          <div className="pipe-stat-sep" />
          <div className="pipe-stat">
            <span className="pipe-stat-v" style={{ color: winRate == null ? 'var(--slate-2)' : winRate >= 50 ? 'var(--hi)' : 'var(--ink)' }}>
              {winRate == null ? '—' : `${winRate}%`}
            </span>
            <span className="pipe-stat-l tip" data-tip="Won ÷ decided deals (won + lost)">win rate</span>
          </div>
          <div className="pipe-stat-sep" />
          <div className="pipe-stat">
            <span className="pipe-stat-v" style={{ color: avgWaitDays != null && avgWaitDays >= 7 ? 'var(--coral)' : 'var(--ink)' }}>
              {avgWaitDays == null ? '—' : `${avgWaitDays}d`}
            </span>
            <span className="pipe-stat-l tip" data-tip="Average days your open deals have sat in their current stage">avg wait</span>
          </div>
        </div>
      </div>

      {/* ── KANBAN ── */}
      <div className="kanban">
        {COLS.map(col => {
          const colLeads = grouped[col.key] || []
          // Won column counts confirmed deal values; open columns estimate from listed budgets.
          const colValue = colLeads.reduce((s, l) => {
            const won = col.key === 'hired' ? appMap.get(l.id)?.won_amount : null
            return s + (won ?? l.budget_max ?? l.budget_min ?? 0)
          }, 0)
          return (
            <div key={col.key} className="kan-col"
              style={{ '--col-tint': col.tint } as React.CSSProperties}
              onDragOver={e => handleDragOver(e, col.key)}
              onDragLeave={() => setOverCol(null)}
              onDrop={e => handleDrop(e, col.key)}>

              {/* Column header — dot + label + count, no icon chips */}
              <div className="kan-head" style={{ borderBottom: `2px solid color-mix(in srgb, ${col.color} 22%, transparent)` }}>
                <span className="kan-dot" style={{ background: col.color }} />
                <span className="kan-title">{col.label}</span>
                {colValue > 0 && <span className="kan-value">~{moneyShort(colValue)}</span>}
                <span className="kan-count" style={{ color: col.color, background: `color-mix(in srgb, ${col.color} 10%, transparent)` }}>
                  {colLeads.length}
                </span>
              </div>

              {/* Column body */}
              <div className={`kan-body ${overCol === col.key ? 'dragover' : ''}`}
                style={{ background: col.tint }}>
                {colLeads.length === 0
                  ? <div className="kan-empty">
                      <span>Drop leads here</span>
                    </div>
                  : colLeads.map(lead => {
                      const si = sourceMeta(canonSource(lead))
                      const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
                      const app = appMap.get(lead.id)
                      const movedISO = app?.stage_changed_at || app?.created_at
                      const daysSince = movedISO ? Math.floor((Date.now() - new Date(movedISO).getTime()) / 86400000) : 0
                      const isStale = daysSince >= 7 && !CLOSED.has(col.key)
                      const reminder = app?.follow_up_at ? reminderLabel(app.follow_up_at) : null
                      const shownBudget = col.key === 'hired' && app?.won_amount != null
                        ? `£${Number(app.won_amount).toLocaleString()}` : budget

                      return (
                        <div key={lead.id}
                          className={`kan-card ${col.key === 'hired' ? 'kan-card-won' : ''}`}
                          style={{ borderLeft: `3px solid ${col.color}` }}
                          draggable
                          onDragStart={e => handleDragStart(e, lead.id, col.key)}
                          onDragEnd={handleDragEnd}
                          onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>

                          {/* Card top */}
                          <div className="kc-top">
                            <span className="kc-src"><span className="kc-src-dot" style={{ background: si.color }} />{si.label}</span>
                            <span className="kc-age" style={{ color: isStale ? 'var(--coral)' : 'var(--slate-2)' }}>
                              {isStale && <i className="ti ti-alert-triangle" />}
                              {daysSince === 0 ? 'Today' : `${daysSince}d`}
                            </span>
                          </div>

                          {/* Title */}
                          <div className="kc-title">{lead.title}</div>

                          {/* Budget + client */}
                          <div className="kc-meta-row">
                            {shownBudget && <span className="kc-budget">{shownBudget}</span>}
                            {lead.client_name && <span className="kc-client">{lead.client_name}</span>}
                          </div>

                          {/* Follow-up chip */}
                          {reminder && (
                            <span className={`sv-remind-chip ${reminder.overdue ? 'overdue' : ''}`} style={{ alignSelf: 'flex-start' }}>
                              Follow up {reminder.label}
                            </span>
                          )}

                          {/* Note */}
                          {noteEditId === lead.id ? (
                            <div className="sv-note-edit" onClick={e => e.stopPropagation()}>
                              <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} maxLength={500} autoFocus
                                placeholder="Next step… e.g. sent pitch, follow up Monday" />
                              <div className="sv-note-edit-actions">
                                <button className="sv-note-save" disabled={savingNote} onClick={() => saveNote(lead.id)}>Save</button>
                                <button className="sv-note-cancel" onClick={() => setNoteEditId(null)}>Cancel</button>
                              </div>
                            </div>
                          ) : app?.note ? (
                            <button className="sv-note" onClick={e => { e.stopPropagation(); startEditNote(lead.id, app.note!) }}>
                              <i className="ti ti-note" /><span>{app.note}</span><i className="ti ti-pencil sv-note-pencil" />
                            </button>
                          ) : null}

                          {/* Actions */}
                          <div className="kc-actions" onClick={e => e.stopPropagation()}>
                            {col.next && (
                              <button className="kc-advance-btn" onClick={() => updateApp(lead.id, col.next!)}>
                                {col.nextLabel}
                              </button>
                            )}
                            {col.key === 'hired' && <div className="kc-won-badge">Won</div>}

                            {/* Follow-up reminder */}
                            <div className="sv-remind-wrap" style={{ position: 'relative' }}>
                              <button
                                className={`sv-icon-btn kc-icon ${reminder ? 'on' : ''} ${!canRemind ? 'locked' : ''}`}
                                title={canRemind ? 'Set a follow-up reminder' : 'Follow-up reminders are a Pro feature'}
                                onClick={() => {
                                  if (!canRemind) { toast('Follow-up reminders are a Pro feature — upgrade to use them', { icon: '🔒' }); return }
                                  setRemindOpen(remindOpen === lead.id ? null : lead.id)
                                }}
                              >
                                <i className="ti ti-bell" />
                                {!canRemind && <i className="ti ti-lock sv-lock-badge" />}
                              </button>
                              {canRemind && remindOpen === lead.id && (
                                <div className="sv-remind-drop">
                                  <div className="sv-remind-head">Remind me to follow up</div>
                                  {REMIND_OPTS.map(([label, hours]) => (
                                    <button key={label} onClick={() => setReminder(lead.id, hours)}>{label}</button>
                                  ))}
                                  {reminder && <button className="sv-remind-clear" onClick={() => setReminder(lead.id, null)}>Clear</button>}
                                </div>
                              )}
                            </div>

                            {/* Note toggle */}
                            {noteEditId !== lead.id && !app?.note && (
                              <button className="sv-icon-btn kc-icon" title="Add a note" onClick={() => startEditNote(lead.id, '')}>
                                <i className="ti ti-note" />
                              </button>
                            )}

                            {/* Mark lost (active stages only) */}
                            {!CLOSED.has(col.key) && (
                              <button className="sv-icon-btn kc-icon kc-lost-btn" title="Mark as lost" onClick={() => updateApp(lead.id, 'lost')}>
                                <i className="ti ti-thumb-down" />
                              </button>
                            )}

                            {/* Remove from pipeline */}
                            <button className="sv-icon-btn kc-icon kc-lost-btn" title="Remove from pipeline" onClick={() => removeApp(lead.id)}>
                              <i className="ti ti-trash" />
                            </button>
                          </div>

                          {/* Assign to a teammate (team plan) */}
                          {mates.length > 0 && app?.id && (
                            <select
                              className="tm-select kc-assign"
                              value={assignees[app.id] ?? ''}
                              onClick={e => e.stopPropagation()}
                              onChange={e => { e.stopPropagation(); assignTo(app.id, e.target.value) }}
                              aria-label="Assign to teammate"
                            >
                              <option value="">Unassigned</option>
                              {mates.map(m => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                            </select>
                          )}
                        </div>
                      )
                    })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── LOST TRAY — archive below the working board, also a drop target ── */}
      <div className={`lost-tray ${overCol === 'lost' ? 'dragover' : ''}`}
        onDragOver={e => handleDragOver(e, 'lost')}
        onDragLeave={() => setOverCol(null)}
        onDrop={e => handleDrop(e, 'lost')}>
        <button className="lost-tray-head" onClick={() => setLostOpen(o => !o)}>
          <span className="kan-dot" style={{ background: 'var(--coral)' }} />
          <span className="kan-title">Lost</span>
          <span className="kan-count" style={{ color: 'var(--coral)', background: 'color-mix(in srgb, var(--coral) 10%, transparent)' }}>
            {grouped.lost.length}
          </span>
          <span className="lost-tray-hint">{dragId ? 'Drop here to mark as lost' : lostOpen ? 'Hide' : 'Show'}</span>
          <i className={`ti ti-chevron-${lostOpen ? 'up' : 'down'}`} />
        </button>
        {lostOpen && (
          grouped.lost.length === 0
            ? <div className="lost-empty">Nothing lost yet. Drag a card here when a deal falls through.</div>
            : <div className="lost-grid">
                {grouped.lost.map(lead => {
                  const app = appMap.get(lead.id)
                  const movedISO = app?.stage_changed_at || app?.created_at
                  const days = movedISO ? Math.floor((Date.now() - new Date(movedISO).getTime()) / 86400000) : 0
                  const si = sourceMeta(canonSource(lead))
                  return (
                    <div key={lead.id} className="lost-row" onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>
                      <span className="kc-src-dot" style={{ background: si.color }} />
                      <span className="lost-row-title">{lead.title}</span>
                      {app?.lost_reason && <span className="lost-row-reason">{app.lost_reason}</span>}
                      <span className="lost-row-age">{days === 0 ? 'today' : `${days}d ago`}</span>
                      <button className="kc-advance-btn lost-row-btn" title="Move back to In talks"
                        onClick={e => { e.stopPropagation(); updateApp(lead.id, 'in_talks', { reopen: true }) }}>
                        Reopen
                      </button>
                    </div>
                  )
                })}
              </div>
        )}
      </div>
    </>
  )
}
