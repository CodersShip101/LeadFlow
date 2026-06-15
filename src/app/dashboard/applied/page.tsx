'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Application } from '@/types'
import { formatBudgetGBP, timeAgo } from '@/lib/utils'

const SRC: Record<string, { name: string; cls: string; ava: string; ini: string }> = {
  reddit: { name: 'Reddit', cls: 'sb-reddit', ava: '#FF5A3C', ini: 'R' },
  reed: { name: 'Reed', cls: 'sb-reed', ava: '#3B7BE0', ini: 'R' },
  wwr: { name: 'WWR', cls: 'sb-wwr', ava: '#E8A020', ini: 'W' },
  rok: { name: 'Remote OK', cls: 'sb-rok', ava: '#9B6BE0', ini: 'O' },
}

function srcKey(surl: string | null): string {
  const l = (surl || '').toLowerCase()
  if (l.includes('reddit')) return 'reddit'
  if (l.includes('reed')) return 'reed'
  if (l.includes('weworkremotely') || l.includes('wwr')) return 'wwr'
  return 'rok'
}

function srcInfo(surl: string | null) { return SRC[srcKey(surl)] || SRC.reddit }

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

const stageIdxMap: Record<string, number> = { interested: 0, applied: 1, hired: 2 }
const stageLabels = ['Interested', 'Applied', 'Won']

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

  const totalActive = applications.filter(a => a.status !== 'saved').length
  const wonCount = grouped.hired.length

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

  if (loading) return null

  if (totalActive === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><i className="ti ti-send"></i></div>
        <h3>No leads in your pipeline yet</h3>
        <p>Browse the feed and click Apply on leads you like.</p>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard')}>
          <i className="ti ti-arrow-left"></i> Go to feed
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="greeting">
        <h2>Pipeline</h2>
        <p>{totalActive} active · {wonCount} won. Drag cards between stages as things progress.</p>
      </div>
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
                    const si = srcInfo(lead.source_url)
                    const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
                    const stageIdx = stageIdxMap[col.key] ?? 0
                    const stageLbl = stageLabels[stageIdx]
                    return (
                      <div key={lead.id}
                        className="kan-card"
                        draggable
                        onDragStart={e => handleDragStart(e, lead.id, col.key)}
                        onDragEnd={handleDragEnd}
                        onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>
                        <div className="kc-top">
                          <span className="src-ava" style={{ background: si.ava, width: 18, height: 18, fontSize: 9 }}>{si.ini}</span>
                          <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
                          <span className="lc-time" style={{ marginLeft: 'auto' }}>{timeAgo(lead.posted_date)}</span>
                        </div>
                        <div className="kc-title">{lead.title}</div>
                        {budget && <div className="kc-foot"><span className="budget">{budget}</span></div>}
                        <div className="stage-track">
                          <span className={`stage-dot ${stageIdx >= 0 ? 'done' : ''} ${stageIdx === 0 ? 'now' : ''}`}></span>
                          <span className={`stage-line ${stageIdx >= 1 ? 'done' : ''}`}></span>
                          <span className={`stage-dot ${stageIdx >= 1 ? 'done' : ''} ${stageIdx === 1 ? 'now' : ''}`}></span>
                          <span className={`stage-line ${stageIdx >= 2 ? 'done' : ''}`}></span>
                          <span className={`stage-dot ${stageIdx >= 2 ? 'done' : ''} ${stageIdx === 2 ? 'now' : ''}`}></span>
                          <span className="stage-lbl">{stageLbl}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
