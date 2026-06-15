'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo } from '@/lib/utils'
import ScoreGauge from '@/components/ScoreGauge'
import { computeMatchExplanation } from '@/types'

interface Column {
  key: string
  label: string
  color: string
}

const columns: Column[] = [
  { key: 'interested', label: 'Interested', color: 'var(--lime-deep)' },
  { key: 'applied', label: 'Applied', color: 'var(--mid)' },
  { key: 'hired', label: 'Won', color: 'var(--hi)' },
]

const SRC_CLS: Record<string, string> = {
  reddit: 'sb-reddit', reed: 'sb-reed', wwr: 'sb-wwr', remoteok: 'sb-rok', remotive: 'sb-rok',
}

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
      const res = await fetch('/api/applications')
      if (!res.ok) return
      const apps: Application[] = await res.json()
      setApplications(apps)
      const activeLeadIds = apps.filter(a => a.status !== 'saved').map(a => a.lead_id)
      if (activeLeadIds.length > 0) {
        const { data: leads } = await supabase.from('leads').select('*').in('id', activeLeadIds).eq('status', 'active')
        setLeads((leads || []).filter(lead => true))
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
    const groups: Record<string, Lead[]> = { interested: [], applied: [], hired: [] }
    leads.forEach(lead => {
      const app = appMap.get(lead.id)
      if (app && app.status !== 'saved' && groups[app.status]) {
        groups[app.status].push(lead)
      }
    })
    return groups
  }, [leads, appMap])

  const wonCount = grouped.hired.length
  const totalActive = applications.filter(a => a.status !== 'saved').length

  const updateApplication = useCallback(async (leadId: string, status: string) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, status }),
    })
    if (res.ok) {
      const app = await res.json()
      setApplications(prev => {
        const filtered = prev.filter(a => a.lead_id !== leadId)
        return [...filtered, app]
      })
      toast.success(status === 'applied' ? 'Marked as applied' : status === 'hired' ? 'Nice — marked as hired!' : 'Marked as interested')
    }
  }, [])

  const handleDragStart = (e: React.DragEvent, leadId: string, col: string) => {
    setDragId(leadId)
    setDragCol(col)
    e.dataTransfer.effectAllowed = 'move'
    requestAnimationFrame(() => {
      const el = e.currentTarget as HTMLElement
      el.classList.add('dragging')
    })
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const el = e.currentTarget as HTMLElement
    el.classList.remove('dragging')
    setDragId(null)
    setDragCol(null)
    setOverCol(null)
  }

  const handleDragOver = (e: React.DragEvent, col: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverCol(col)
  }

  const handleDragLeave = () => setOverCol(null)

  const handleDrop = (e: React.DragEvent, toCol: string) => {
    e.preventDefault()
    setOverCol(null)
    if (dragCol && toCol && dragCol !== toCol && dragId) {
      updateApplication(dragId, toCol)
    }
    setDragId(null)
    setDragCol(null)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center min-h-screen" style={{ background: 'var(--paper)' }}>
      <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  return (
    <div className="flex-1 pb-20 md:pb-0" style={{ background: 'var(--paper)' }}>
      <div className="dash-page">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1>Pipeline</h1>
            <p style={{ color: 'var(--slate)', fontSize: 14, marginTop: 4 }}>
              {totalActive} active &middot; drag cards between stages
            </p>
          </div>
          {wonCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--hi-bg)' }}>
              <i className="ti ti-trophy" style={{ fontSize: 14, color: 'var(--hi)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--hi)' }}>{wonCount} won</span>
            </div>
          )}
        </div>

        {totalActive === 0 ? (
          <div className="empty">
            <div className="empty-icon"><i className="ti ti-send" /></div>
            <h3>No leads in your pipeline yet</h3>
            <p>Browse the feed and click Apply on leads you like.</p>
            <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ display: 'inline-flex' }}>Go to feed</button>
          </div>
        ) : (
          <div className="kanban">
            {columns.map(col => {
              const colLeads = grouped[col.key] || []
              return (
                <div key={col.key} className="kan-col"
                  onDragOver={e => handleDragOver(e, col.key)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, col.key)}>
                  <div className="kan-head">
                    <span className="kan-dot" style={{ background: col.color }} />
                    <span className="kan-title">{col.label}</span>
                    <span className="kan-count">{colLeads.length}</span>
                  </div>
                  <div className={`kan-body ${overCol === col.key ? 'dragover' : ''}`}>
                    {colLeads.length === 0 ? (
                      <div className="kan-empty">Drop leads here</div>
                    ) : (
                      colLeads.map(lead => {
                        const source = getSourceInfo(lead.source_url)
                        const srcCls = SRC_CLS[source.label.toLowerCase().replace(/\s+/g, '').replace('remoteok', 'rok')] || 'sb-reddit'
                        const match = computeMatchExplanation(lead, null)
                        const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
                        return (
                          <div key={lead.id}
                            className="kan-card"
                            draggable
                            onDragStart={e => handleDragStart(e, lead.id, col.key)}
                            onDragEnd={handleDragEnd}
                            onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>
                            {/* Top row: source + date + score */}
                            <div className="kc-top">
                              <span className={`src-badge ${srcCls}`}>{source.label.toUpperCase()}</span>
                              <span className="kc-meta-right">
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--slate-2)' }}>{timeAgo(lead.posted_date)}</span>
                                <ScoreGauge score={match.score} size="sm" />
                              </span>
                            </div>

                            {/* Title */}
                            <div className="kc-title">{lead.title}</div>

                            {/* Meta row: budget + location */}
                            {(budget || lead.client_location) && (
                              <div className="kc-meta">
                                {budget && <span className="kc-chip" style={{ background: 'var(--lime-dim)', color: 'var(--lime-ink)' }}>{budget}</span>}
                                {lead.client_location && (
                                  <span className="kc-chip" style={{ background: 'var(--paper-2)', color: 'var(--slate)' }}>
                                    <i className="ti ti-map-pin" style={{ fontSize: 10 }} /> {lead.client_location}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Skills preview */}
                            {lead.skills_required && lead.skills_required.length > 0 && (
                              <div className="kc-skills">
                                {lead.skills_required.slice(0, 3).map(s => (
                                  <span key={s} className="kc-skill">{s}</span>
                                ))}
                                {lead.skills_required.length > 3 && (
                                  <span className="kc-skill kc-skill-more">+{lead.skills_required.length - 3}</span>
                                )}
                              </div>
                            )}

                            {/* Stage timeline */}
                            {(() => {
                              const stageIdx = col.key === 'hired' ? 2 : col.key === 'applied' ? 1 : 0
                              const stageLbl = ['Interested', 'Applied', 'Won'][stageIdx]
                              return (
                                <div className="stage-track">
                                  <span className={`stage-dot ${stageIdx >= 0 ? 'done' : ''} ${stageIdx === 0 ? 'now' : ''}`}></span>
                                  <span className={`stage-line ${stageIdx >= 1 ? 'done' : ''}`}></span>
                                  <span className={`stage-dot ${stageIdx >= 1 ? 'done' : ''} ${stageIdx === 1 ? 'now' : ''}`}></span>
                                  <span className={`stage-line ${stageIdx >= 2 ? 'done' : ''}`}></span>
                                  <span className={`stage-dot ${stageIdx >= 2 ? 'done' : ''} ${stageIdx === 2 ? 'now' : ''}`}></span>
                                  <span className="stage-lbl">{stageLbl}</span>
                                </div>
                              )
                            })()}
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
