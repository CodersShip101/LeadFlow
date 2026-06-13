'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead, formatDate, isUKLead } from '@/lib/utils'

interface Column {
  key: string
  label: string
  icon: string
  accent: string
  bg: string
  border: string
}

const columns: Column[] = [
  { key: 'interested', label: 'Interested', icon: 'ti ti-heart', accent: 'var(--lime-deep)', bg: 'rgba(196,240,0,.12)', border: 'rgba(196,240,0,.25)' },
  { key: 'applied', label: 'Applied', icon: 'ti ti-send', accent: 'var(--amber)', bg: 'rgba(255,176,32,.1)', border: 'rgba(255,176,32,.25)' },
  { key: 'hired', label: 'Won', icon: 'ti ti-trophy', accent: 'var(--green-score)', bg: 'rgba(61,219,122,.1)', border: 'rgba(61,219,122,.25)' },
]

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
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
        setLeads((leads || []).filter(lead => isUKLead(lead.client_location, lead.source_url)))
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--paper)' }}>
      <div className="flex items-center gap-2" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} /> Loading...
      </div>
    </div>
  )

  return (
    <div className="flex-1 pb-20 md:pb-0" style={{ background: 'var(--paper)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mb-4 transition-all"
          style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>
          <i className="ti ti-arrow-left" /> Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--ink-900)' }}>Pipeline</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>{totalActive} active lead{totalActive !== 1 ? 's' : ''}</p>
          </div>
          {wonCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'rgba(61,219,122,.1)' }}>
              <i className="ti ti-trophy" style={{ fontSize: '14px', color: 'var(--green-score)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--green-score)' }}>{wonCount} won</span>
            </div>
          )}
        </div>

        {totalActive === 0 ? (
          <div className="text-center py-20">
            <i className="ti ti-send" style={{ fontSize: '28px', color: 'var(--slate-300)', display: 'block', margin: '0 auto 12px' }} />
            <div className="text-sm font-medium" style={{ color: 'var(--slate-500)' }}>No leads in your pipeline yet</div>
            <div className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>Browse the feed and click Interested on leads you like</div>
            <button onClick={() => router.push('/dashboard')} className="mt-4 px-5 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>Go to feed</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
            {columns.map(col => {
              const colLeads = grouped[col.key] || []
              return (
                <div key={col.key} className="rounded-xl overflow-hidden" style={{ background: 'var(--paper-card)', border: '1px solid var(--slate-200)' }}>
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: col.border, background: col.bg }}>
                    <i className={col.icon} style={{ fontSize: '14px', color: col.accent }} />
                    <span className="text-xs font-semibold" style={{ color: col.accent }}>{col.label}</span>
                    <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: 'var(--paper-card)', color: col.accent }}>{colLeads.length}</span>
                  </div>

                  {/* Cards */}
                  <div className="p-2.5 space-y-2 min-h-[120px]">
                    {colLeads.length === 0 ? (
                      <div className="text-center py-8 text-[11px]" style={{ color: 'var(--slate-400)' }}>No leads yet</div>
                    ) : (
                      colLeads.map(lead => {
                        const source = getSourceInfo(lead.source_url)
                        const app = appMap.get(lead.id)
                        return (
                          <div
                            key={lead.id}
                            className="rounded-lg px-3 py-2.5 cursor-pointer transition-all hover:shadow-sm active:scale-[0.99]"
                            style={{ border: '1px solid var(--slate-100)', background: 'var(--paper-card)' }}
                            onClick={() => router.push(`/dashboard/lead/${lead.id}`)}
                          >
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <button
                                onClick={e => { e.stopPropagation(); if (lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }}
                                className="text-[8px] font-semibold px-1.5 py-0.5 rounded shrink-0 transition-opacity hover:opacity-80"
                                style={{ background: source.bg, color: source.color }}
                                title={`View on ${source.label}`}
                              >{source.label}</button>
                              {isNewLead(lead.posted_date) && (
                                <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: 'rgba(196,240,0,.15)', color: 'var(--lime-deep)' }}>New</span>
                              )}
                              <span className="ml-auto text-[9px]" style={{ color: 'var(--slate-400)' }}>{timeAgo(lead.posted_date)}</span>
                            </div>
                            <div className="text-xs font-semibold leading-snug line-clamp-1" style={{ color: 'var(--ink-900)' }}>{lead.title}</div>
                            {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                              <div className="text-[10px] font-medium mt-1" style={{ color: 'var(--slate-500)' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {lead.skills_required?.slice(0, 2).map(s => (
                                <span key={s} className="text-[8px] px-1 py-0.5 rounded" style={{ background: 'var(--slate-100)', color: 'var(--slate-400)' }}>{s}</span>
                              ))}
                            </div>
                            {/* Action button */}
                            <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--slate-100)' }}>
                              {col.key === 'interested' && (
                                <button onClick={e => { e.stopPropagation(); updateApplication(lead.id, 'applied') }}
                                  className="w-full text-[10px] font-medium min-h-[36px] py-1.5 rounded transition-all hover:opacity-80 active:scale-[0.97]"
                                  style={{ background: 'rgba(255,176,32,.1)', color: 'var(--amber)' }}>Mark as Applied</button>
                              )}
                              {col.key === 'applied' && (
                                <button onClick={e => { e.stopPropagation(); updateApplication(lead.id, 'hired') }}
                                  className="w-full text-[10px] font-medium min-h-[36px] py-1.5 rounded transition-all hover:opacity-80 active:scale-[0.97]"
                                  style={{ background: 'rgba(61,219,122,.1)', color: 'var(--green-score)' }}>Mark as Won</button>
                              )}
                              {col.key === 'hired' && (
                                <div className="flex items-center gap-1.5 justify-center text-[10px] font-medium py-1" style={{ color: 'var(--green-score)' }}>
                                  <i className="ti ti-check" style={{ fontSize: '11px' }} /> Won
                                </div>
                              )}
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
        )}
      </div>
    </div>
  )
}
