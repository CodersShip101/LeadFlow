'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Application } from '@/types'
import { formatBudgetGBP, timeAgo } from '@/lib/utils'

const SRC: Record<string, { name: string; cls: string; ava: string; ini: string }> = {
  reddit: { name: 'Reddit', cls: 'sb-reddit', ava: '#FF5A3C', ini: 'R' },
  reed:   { name: 'Reed',   cls: 'sb-reed',   ava: '#3B7BE0', ini: 'R' },
  wwr:    { name: 'WWR',    cls: 'sb-wwr',     ava: '#E8A020', ini: 'W' },
  rok:    { name: 'Remote OK', cls: 'sb-rok',  ava: '#9B6BE0', ini: 'O' },
}

function srcKey(url: string | null): string {
  const l = (url || '').toLowerCase()
  if (l.includes('reddit')) return 'reddit'
  if (l.includes('reed')) return 'reed'
  if (l.includes('weworkremotely') || l.includes('wwr')) return 'wwr'
  return 'rok'
}

const COLS = [
  { key: 'interested', label: 'Interested', icon: 'ti-eye',    color: 'var(--lime-deep)', tint: 'rgba(196,240,0,.05)', next: 'applied',  nextLabel: 'Mark applied' },
  { key: 'applied',    label: 'Applied',    icon: 'ti-send',   color: 'var(--mid)',       tint: 'rgba(216,146,10,.05)', next: 'hired',  nextLabel: 'Mark as won' },
  { key: 'hired',      label: 'Won',        icon: 'ti-trophy', color: 'var(--hi)',        tint: 'rgba(91,160,46,.07)', next: null,      nextLabel: '' },
]

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragCol, setDragCol] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      let { data: apps, error } = await supabase
        .from('applications')
        .select('id, lead_id, status, outcome, outcome_at, created_at')
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
                      const si = SRC[srcKey(lead.source_url)] || SRC.reddit
                      const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
                      const app = appMap.get(lead.id)
                      const daysSince = app ? Math.floor((Date.now() - new Date(app.created_at).getTime()) / 86400000) : 0
                      const isStale = daysSince >= 7 && col.key !== 'hired'

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
                            <span className="src-ava" style={{ background: si.ava, width: 18, height: 18, fontSize: 9 }}>{si.ini}</span>
                            <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
                            <span className="kc-age" style={{ color: isStale ? 'var(--coral)' : 'var(--slate-2)' }}>
                              {isStale && <i className="ti ti-alert-triangle" />}
                              {daysSince === 0 ? 'Today' : `${daysSince}d`}
                            </span>
                          </div>

                          {/* Title */}
                          <div className="kc-title">{lead.title}</div>

                          {/* Budget */}
                          {budget && (
                            <div className="kc-budget">
                              <i className="ti ti-currency-pound" />{budget}
                            </div>
                          )}

                          {/* Quick-advance + detail */}
                          {col.next && (
                            <div className="kc-actions" onClick={e => e.stopPropagation()}>
                              <button className="kc-advance-btn" onClick={() => updateApp(lead.id, col.next!)}>
                                <i className={`ti ${COLS.find(c => c.key === col.next)?.icon}`} />
                                {col.nextLabel}
                              </button>
                            </div>
                          )}

                          {col.key === 'hired' && (
                            <div className="kc-won-badge">
                              <i className="ti ti-trophy" /> Won
                            </div>
                          )}
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
