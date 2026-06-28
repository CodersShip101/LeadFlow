'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Application, Profile } from '@/types'
import { formatBudgetGBP } from '@/lib/utils'
import { canonSource, sourceMeta, srcBadgeStyle } from '@/lib/sources'
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

const REMIND_OPTS: [string, number][] = [
  ['Later today', 3],
  ['Tomorrow', 24],
  ['In 3 days', 72],
  ['Next week', 168],
]

const COLS = [
  { key: 'interested', label: 'Interested', icon: 'ti-eye',    color: 'var(--lime-deep)', tint: 'rgba(196,240,0,.05)', next: 'applied',  nextLabel: 'Mark applied' },
  { key: 'applied',    label: 'Applied',    icon: 'ti-send',   color: 'var(--mid)',       tint: 'rgba(216,146,10,.05)', next: 'hired',  nextLabel: 'Mark as won' },
  { key: 'hired',      label: 'Won',        icon: 'ti-trophy', color: 'var(--hi)',        tint: 'rgba(91,160,46,.07)', next: null,      nextLabel: '' },
]

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragCol, setDragCol] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const [remindOpen, setRemindOpen] = useState<string | null>(null)
  const [noteEditId, setNoteEditId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const plan = (profile?.subscription_status ?? 'free') as Tier
  const canRemind = entitlementsFor(plan).calendarSync

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const profRes = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profRes.data)
      let { data: apps, error } = await supabase
        .from('applications')
        .select('id, lead_id, status, outcome, outcome_at, created_at, follow_up_at, follow_up_note, note')
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
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const appMap = useMemo(() => {
    const m = new Map<string, Application>()
    applications.forEach(a => m.set(a.lead_id, a))
    return m
  }, [applications])

  const grouped = useMemo(() => {
    const g: Record<string, Lead[]> = { interested: [], applied: [], hired: [] }
    leads.forEach(l => {
      const app = appMap.get(l.id)
      if (app && app.status !== 'saved' && g[app.status]) g[app.status].push(l)
    })
    return g
  }, [leads, appMap])

  const totalActive = applications.filter(a => a.status !== 'saved').length
  const wonCount = grouped.hired.length
  const appliedCount = grouped.applied.length

  const updateApp = useCallback(async (leadId: string, status: string) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, status }),
    })
    if (res.ok) {
      const app = await res.json()
      setApplications(prev => [...prev.filter(a => a.lead_id !== leadId), app])
      if (status === 'hired') toast.success('Marked as won!')
      else if (status === 'applied') toast.success('Marked as applied')
      else toast('Moved back to interested')
    }
  }, [])

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

  if (loading) return null

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
          <p className="pipe-sub">Drag cards to advance stages, or use the quick-action buttons.</p>
        </div>
        <div className="pipe-stats">
          <div className="pipe-stat">
            <span className="pipe-stat-v">{totalActive}</span>
            <span className="pipe-stat-l">active</span>
          </div>
          <div className="pipe-stat-sep" />
          <div className="pipe-stat">
            <span className="pipe-stat-v" style={{ color: 'var(--mid)' }}>{appliedCount}</span>
            <span className="pipe-stat-l">applied</span>
          </div>
          <div className="pipe-stat-sep" />
          <div className="pipe-stat">
            <span className="pipe-stat-v" style={{ color: 'var(--hi)' }}>{wonCount}</span>
            <span className="pipe-stat-l">won</span>
          </div>
        </div>
      </div>

      {/* ── KANBAN ── */}
      <div className="kanban">
        {COLS.map(col => {
          const colLeads = grouped[col.key] || []
          return (
            <div key={col.key} className="kan-col"
              style={{ '--col-tint': col.tint } as React.CSSProperties}
              onDragOver={e => handleDragOver(e, col.key)}
              onDragLeave={() => setOverCol(null)}
              onDrop={e => handleDrop(e, col.key)}>

              {/* Column header */}
              <div className="kan-head" style={{ borderBottom: `2px solid ${col.color}22` }}>
                <span className="kan-head-icon" style={{ color: col.color, background: `${col.color}18` }}>
                  <i className={`ti ${col.icon}`} />
                </span>
                <span className="kan-title">{col.label}</span>
                <span className="kan-count" style={{ color: col.color, background: `${col.color}15` }}>
                  {colLeads.length}
                </span>
              </div>

              {/* Column body */}
              <div className={`kan-body ${overCol === col.key ? 'dragover' : ''}`}
                style={{ background: col.tint }}>
                {colLeads.length === 0
                  ? <div className="kan-empty">
                      <i className={`ti ${col.icon}`} />
                      <span>Drop leads here</span>
                    </div>
                  : colLeads.map(lead => {
                      const si = sourceMeta(canonSource(lead))
                      const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
                      const app = appMap.get(lead.id)
                      const daysSince = app ? Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000) : 0
                      const isStale = daysSince >= 7 && col.key !== 'hired'
                      const reminder = app?.follow_up_at ? reminderLabel(app.follow_up_at) : null

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
                            <span className="src-badge" style={srcBadgeStyle(si.color)}>{si.label.toUpperCase()}</span>
                            <span className="kc-age" style={{ color: isStale ? 'var(--coral)' : 'var(--slate-2)' }}>
                              {isStale && <i className="ti ti-alert-triangle" />}
                              {daysSince === 0 ? 'Today' : `${daysSince}d`}
                            </span>
                          </div>

                          {/* Title */}
                          <div className="kc-title">{lead.title}</div>

                          {/* Budget + client */}
                          <div className="kc-meta-row">
                            {budget && <span className="kc-budget"><i className="ti ti-currency-pound" />{budget}</span>}
                            {lead.client_name && <span className="kc-client"><i className="ti ti-building" />{lead.client_name}</span>}
                          </div>

                          {/* Follow-up chip */}
                          {reminder && (
                            <span className={`sv-remind-chip ${reminder.overdue ? 'overdue' : ''}`} style={{ alignSelf: 'flex-start' }}>
                              <i className="ti ti-alarm" />Follow up {reminder.label}
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
                                <i className={`ti ${COLS.find(c => c.key === col.next)?.icon}`} />
                                {col.nextLabel}
                              </button>
                            )}
                            {col.key === 'hired' && <div className="kc-won-badge"><i className="ti ti-trophy" /> Won</div>}

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
                          </div>
                        </div>
                      )
                    })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
