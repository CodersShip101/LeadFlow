'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Application, Profile } from '@/types'
import { formatBudgetGBP } from '@/lib/utils'
import { computeMatchExplanation } from '@/types'
import { canonSource, sourceMeta, srcBadgeStyle } from '@/lib/sources'
import { entitlementsFor, type Tier } from '@/lib/tiers'
import toast from 'react-hot-toast'

function scoreColor(s: number) {
  if (s >= 8) return 'var(--hi)'
  if (s >= 5) return 'var(--mid)'
  return 'var(--slate)'
}

function urgencyLabel(posted: string): { label: string; hot: boolean } | null {
  const h = (Date.now() - new Date(posted).getTime()) / 3600000
  if (h < 24) return { label: 'Posted today', hot: true }
  if (h < 48) return { label: 'Yesterday', hot: true }
  if (h < 96) return { label: `${Math.round(h / 24)}d old`, hot: false }
  return { label: `${Math.round(h / 24)}d old`, hot: false }
}

// Freshness of the lead itself — saved leads go cold / expire.
function expiryInfo(lead: Lead): { label: string; tone: 'expired' | 'soon' } | null {
  if (lead.status && lead.status !== 'active') return { label: 'No longer active', tone: 'expired' }
  if (!lead.expiry_date) return null
  const days = (new Date(lead.expiry_date).getTime() - Date.now()) / 86400000
  if (days < 0) return { label: 'Expired', tone: 'expired' }
  if (days <= 3) return { label: `Expires in ${Math.max(1, Math.round(days))}d`, tone: 'soon' }
  return null
}

function reminderLabel(iso: string): { label: string; overdue: boolean } {
  const t = new Date(iso).getTime()
  const overdue = t < Date.now()
  const days = Math.round((t - Date.now()) / 86400000)
  let label: string
  if (overdue) label = 'Overdue'
  else if (days === 0) label = 'Today'
  else if (days === 1) label = 'Tomorrow'
  else if (days <= 14) label = `In ${days}d`
  else label = new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return { label, overdue }
}

const REMIND_OPTS: [string, number][] = [
  ['Later today', 3],
  ['Tomorrow', 24],
  ['In 3 days', 72],
  ['Next week', 168],
]

export default function SavedPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appMap, setAppMap] = useState<Map<string, Application>>(new Map())
  const [loading, setLoading] = useState(true)
  const [remindOpen, setRemindOpen] = useState<string | null>(null)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<'score' | 'recent' | 'budget'>('recent')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [srcOpen, setSrcOpen] = useState(false)
  const [noteEditId, setNoteEditId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const plan = (profile?.subscription_status ?? 'free') as Tier
  const ent = entitlementsFor(plan)
  const canRemind = ent.calendarSync // reminders are gated like calendar sync

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const [appsRes, profileRes] = await Promise.all([
        fetch('/api/applications'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      if (!appsRes.ok) { setLoading(false); return }
      const apps: Application[] = await appsRes.json()
      setProfile(profileRes.data)
      const map = new Map<string, Application>()
      apps.forEach(a => map.set(a.lead_id, a))
      setAppMap(map)
      const savedIds = apps.filter(a => a.status === 'saved').map(a => a.lead_id)
      if (savedIds.length > 0) {
        const { data } = await supabase.from('leads').select('*').in('id', savedIds)
        const sorted = (data || []).sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime())
        setLeads(sorted)
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const unsave = async (leadId: string) => {
    const r = await fetch('/api/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId }) })
    if (r.ok) { setLeads(prev => prev.filter(l => l.id !== leadId)); toast('Removed from saved') }
  }

  const moveToPipeline = async (leadId: string) => {
    const r = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, status: 'interested' }) })
    if (r.ok) {
      const app = await r.json()
      setAppMap(prev => { const m = new Map(prev); m.set(leadId, app); return m })
      toast.success('Added to pipeline')
    } else {
      const d = await r.json().catch(() => ({}))
      toast.error(d.error || 'Could not add to pipeline')
    }
  }

  // The decisive step: open the original listing and mark it applied.
  const applyNow = async (lead: Lead) => {
    if (!ent.sourceLinks || !lead.source_url) {
      toast.error('Upgrade to see where to apply')
      return
    }
    if (applyingId) return
    window.open(lead.source_url, '_blank', 'noopener,noreferrer')
    setApplyingId(lead.id)
    try {
      const r = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, status: 'applied' }) })
      if (r.ok) {
        setLeads(prev => prev.filter(l => l.id !== lead.id))
        toast.success('Opened listing — added to your pipeline')
      } else {
        const d = await r.json().catch(() => ({}))
        toast.error(d.error || 'Could not record application')
      }
    } finally {
      setApplyingId(null)
    }
  }

  const setReminder = async (leadId: string, hours: number | null) => {
    setRemindOpen(null)
    const follow_up_at = hours == null ? null : new Date(Date.now() + hours * 3600000).toISOString()
    try {
      const res = await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, follow_up_at }) })
      if (res.ok) {
        setAppMap(prev => {
          const m = new Map(prev)
          const cur = m.get(leadId)
          m.set(leadId, { ...(cur || { id: '', freelancer_id: '', lead_id: leadId, status: 'interested', outcome: null, outcome_at: null, created_at: '' }), follow_up_at } as Application)
          return m
        })
        toast.success(hours == null ? 'Reminder cleared' : 'Reminder set')
      } else if (res.status === 403) {
        toast.error('Reminders are a Pro feature — upgrade to use them')
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Could not set reminder')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const startEditNote = (leadId: string, current: string) => { setNoteEditId(leadId); setNoteDraft(current) }

  const saveNote = async (leadId: string) => {
    if (savingNote) return
    setSavingNote(true)
    const note = noteDraft.trim()
    try {
      const r = await fetch('/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, note }) })
      if (r.ok) {
        setAppMap(prev => {
          const m = new Map(prev)
          const cur = m.get(leadId)
          if (cur) m.set(leadId, { ...cur, note: note || null })
          return m
        })
        setNoteEditId(null)
        toast.success(note ? 'Note saved' : 'Note cleared')
      } else {
        const d = await r.json().catch(() => ({}))
        toast.error(d.error || 'Could not save note')
      }
    } finally {
      setSavingNote(false)
    }
  }

  // Sources present in the shortlist, for the From filter.
  const availableSources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of leads) { const k = canonSource(l); counts.set(k, (counts.get(k) || 0) + 1) }
    return Array.from(counts.entries()).map(([id, count]) => ({ id, count, ...sourceMeta(id) })).sort((a, b) => b.count - a.count)
  }, [leads])

  const selSrc = sourceFilter === 'all' ? null : (availableSources.find(s => s.id === sourceFilter) || { id: sourceFilter, count: 0, ...sourceMeta(sourceFilter) })

  const visible = useMemo(() => {
    let ls = leads.slice()
    if (search) {
      const q = search.toLowerCase()
      ls = ls.filter(l => l.title.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q) || (l.client_name || '').toLowerCase().includes(q))
    }
    if (sourceFilter !== 'all') ls = ls.filter(l => canonSource(l) === sourceFilter)
    if (sortMode === 'recent') ls.sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime())
    else if (sortMode === 'budget') ls.sort((a, b) => (b.budget_max || b.budget_min || 0) - (a.budget_max || a.budget_min || 0))
    else ls.sort((a, b) => computeMatchExplanation(b, profile).score - computeMatchExplanation(a, profile).score)
    return ls
  }, [leads, search, sourceFilter, sortMode, profile])

  if (loading) {
    return (
      <div className="sv-list" style={{ marginTop: 20 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="sv-card sv-skel-card">
            <div className="sv-score-bar skel" />
            <div className="sv-card-inner">
              <div className="skel" style={{ height: 14, width: 90, borderRadius: 6 }} />
              <div className="skel" style={{ height: 18, width: '70%', borderRadius: 6 }} />
              <div className="skel" style={{ height: 14, width: '45%', borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><i className="ti ti-bookmark"></i></div>
        <h3>Your shortlist is empty</h3>
        <p>Bookmark leads you want to revisit. They&apos;ll wait here until you&apos;re ready to apply.</p>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard')}>
          Browse leads
        </button>
      </div>
    )
  }

  const hotLeads = leads.filter(l => (Date.now() - new Date(l.posted_date).getTime()) / 3600000 < 48)

  return (
    <>
      {/* Header */}
      <div className="sv-header">
        <div className="sv-header-left">
          <p className="sv-sub">
            <span className="sv-count">{leads.length}</span> saved
            {hotLeads.length > 0 && <span className="sv-hot-badge"><i className="ti ti-flame" />{hotLeads.length} posted recently</span>}
          </p>
        </div>
        <button className="btn btn-ghost sv-feed-btn" onClick={() => router.push('/dashboard')}>
          <i className="ti ti-plus" /> Add more
        </button>
      </div>

      {/* Toolbar: search · sort · source */}
      <div className="sv-toolbar">
        <div className="sv-search">
          <i className="ti ti-search" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your shortlist…" />
          {search && <button className="sv-search-clear" onClick={() => setSearch('')}><i className="ti ti-x" /></button>}
        </div>
        <div className="seg sv-seg">
          {([['score', 'Best match'], ['recent', 'Newest'], ['budget', 'Top budget']] as [typeof sortMode, string][]).map(([k, lbl]) => (
            <button key={k} className={`seg-btn ${sortMode === k ? 'on' : ''}`} onClick={() => setSortMode(k)}>{lbl}</button>
          ))}
        </div>
        {availableSources.length > 1 && (
          <div className="src-dd-wrap">
            <button className={`chip chip-src src-dd-toggle ${sourceFilter !== 'all' ? 'on' : ''}`} onClick={() => setSrcOpen(o => !o)} onBlur={() => setTimeout(() => setSrcOpen(false), 150)} aria-expanded={srcOpen}>
              {selSrc ? <><span className="sd" style={{ background: selSrc.color }} />{selSrc.label}</> : <>All sources</>}
              <span className="ct">{selSrc ? selSrc.count : leads.length}</span>
              <i className="ti ti-chevron-down" />
            </button>
            {srcOpen && (
              <div className="suggest show src-dd-menu" role="listbox">
                <div className={`suggest-item ${sourceFilter === 'all' ? 'sel' : ''}`} onMouseDown={() => { setSourceFilter('all'); setSrcOpen(false) }}>
                  <span className="sd sd-all" />All sources<span className="tag">{leads.length}</span>
                </div>
                {availableSources.map(s => (
                  <div key={s.id} className={`suggest-item ${sourceFilter === s.id ? 'sel' : ''}`} onMouseDown={() => { setSourceFilter(s.id); setSrcOpen(false) }}>
                    <span className="sd" style={{ background: s.color }} />{s.label}<span className="tag">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {visible.length === 0 && (
        <div className="empty" style={{ padding: '40px 20px' }}>
          <div className="empty-icon"><i className="ti ti-filter-off"></i></div>
          <h3>No saved leads match</h3>
          <p>Try a different search or clear the filters.</p>
          <button className="btn btn-ghost" style={{ display: 'inline-flex' }} onClick={() => { setSearch(''); setSourceFilter('all') }}>Clear filters</button>
        </div>
      )}

      {/* Cards */}
      <div className="sv-list">
        {visible.map(lead => {
          const m = computeMatchExplanation(lead, profile)
          const sc = m.score
          const si = sourceMeta(canonSource(lead))
          const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
          const urg = urgencyLabel(lead.posted_date)
          const exp = expiryInfo(lead)
          const company = lead.client_name
          const app = appMap.get(lead.id)
          const inPipeline = app?.status === 'interested' || app?.status === 'applied' || app?.status === 'hired'
          const reminder = app?.follow_up_at ? reminderLabel(app.follow_up_at) : null
          const matchedSkills = m.skillMatch.matched.length
          const totalSkills = (lead.skills_required || []).length

          return (
            <div key={lead.id} className="sv-card" onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>
              <div className="sv-score-bar" style={{ background: scoreColor(sc) }} />

              <div className="sv-card-inner">
                {/* Top row */}
                <div className="sv-card-top">
                  <span className="src-badge" style={srcBadgeStyle(si.color)}>{si.label.toUpperCase()}</span>
                  {company && <span className="sv-company"><i className="ti ti-building" />{company}</span>}
                  {exp
                    ? <span className={`sv-expiry ${exp.tone}`}><i className="ti ti-clock-exclamation" />{exp.label}</span>
                    : urg && <span className={`sv-urg ${urg.hot ? 'hot' : ''}`}>{urg.hot && <i className="ti ti-flame" />}{urg.label}</span>}
                  <span className="sv-score-chip" style={{ color: scoreColor(sc), borderColor: `${scoreColor(sc)}33` }}>{sc}</span>
                </div>

                {/* Title */}
                <h3 className="sv-card-title">{lead.title}</h3>

                {/* Meta row */}
                <div className="sv-card-meta">
                  {budget && <span className="sv-budget"><i className="ti ti-currency-pound" />{budget}</span>}
                  {lead.client_location && <span className="sv-meta-chip"><i className="ti ti-map-pin" />{lead.client_location}</span>}
                  {totalSkills > 0 && (
                    <span className="sv-meta-chip" style={{ color: matchedSkills === totalSkills ? 'var(--hi)' : matchedSkills > 0 ? 'var(--mid)' : 'var(--slate)' }}>
                      <i className="ti ti-code" />{matchedSkills}/{totalSkills} skills
                    </span>
                  )}
                  {reminder && (
                    <span className={`sv-remind-chip ${reminder.overdue ? 'overdue' : ''}`}>
                      <i className="ti ti-alarm" />Apply {reminder.label.toLowerCase()}
                    </span>
                  )}
                </div>

                {/* Personal note */}
                {noteEditId === lead.id ? (
                  <div className="sv-note-edit" onClick={e => e.stopPropagation()}>
                    <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} maxLength={500} autoFocus
                      placeholder="Why this lead? e.g. great rate — DM the founder Monday" />
                    <div className="sv-note-edit-actions">
                      <button className="sv-note-save" disabled={savingNote} onClick={() => saveNote(lead.id)}>Save note</button>
                      <button className="sv-note-cancel" onClick={() => setNoteEditId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : app?.note ? (
                  <button className="sv-note" onClick={e => { e.stopPropagation(); startEditNote(lead.id, app.note!) }}>
                    <i className="ti ti-note" /><span>{app.note}</span><i className="ti ti-pencil sv-note-pencil" />
                  </button>
                ) : (
                  <button className="sv-note-add" onClick={e => { e.stopPropagation(); startEditNote(lead.id, '') }}>
                    <i className="ti ti-plus" /> Add note
                  </button>
                )}

                {/* Actions */}
                <div className="sv-card-actions" onClick={e => e.stopPropagation()}>
                  <button className="sv-apply-btn" disabled={applyingId === lead.id} onClick={() => applyNow(lead)}>
                    <i className="ti ti-external-link" /> {ent.sourceLinks ? 'Apply now' : 'Unlock to apply'}
                  </button>

                  {inPipeline
                    ? <button className="sv-pipeline-btn on" onClick={() => router.push('/dashboard/applied')} title="View in pipeline">
                        <i className="ti ti-circle-check" /> In pipeline
                      </button>
                    : <button className="sv-pipeline-btn" onClick={() => moveToPipeline(lead.id)} title="Track without applying yet">
                        <i className="ti ti-bookmarks" /> Pipeline
                      </button>}

                  {/* Reminder */}
                  <div className="sv-remind-wrap" style={{ position: 'relative' }}>
                    <button
                      className={`sv-icon-btn ${reminder ? 'on' : ''} ${!canRemind ? 'locked' : ''}`}
                      title={canRemind ? 'Set an apply-by reminder' : 'Reminders are a Pro feature'}
                      onClick={() => {
                        if (!canRemind) { toast('Reminders are a Pro feature — upgrade to use them', { icon: '🔒' }); return }
                        setRemindOpen(remindOpen === lead.id ? null : lead.id)
                      }}
                    >
                      <i className="ti ti-bell" />
                      {!canRemind && <i className="ti ti-lock sv-lock-badge" />}
                    </button>
                    {canRemind && remindOpen === lead.id && (
                      <div className="sv-remind-drop">
                        <div className="sv-remind-head">Remind me to apply</div>
                        {REMIND_OPTS.map(([label, hours]) => (
                          <button key={label} onClick={() => setReminder(lead.id, hours)}>{label}</button>
                        ))}
                        {reminder && <button className="sv-remind-clear" onClick={() => setReminder(lead.id, null)}>Clear reminder</button>}
                      </div>
                    )}
                  </div>

                  <button className="sv-icon-btn sv-remove-icon" title="Remove from saved" onClick={() => unsave(lead.id)}>
                    <i className="ti ti-bookmark-off" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
