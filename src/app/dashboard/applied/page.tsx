'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Application } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead, isUKLead } from '@/lib/utils'

const columns = [
  { key: 'interested', label: 'Interested', icon: 'ti-heart', accent: '#059669', bg: '#F0FDF7', border: '#BBE0CE' },
  { key: 'applied', label: 'Applied', icon: 'ti-send', accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  { key: 'hired', label: 'Won', icon: 'ti-trophy', accent: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
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
      const activeIds = apps.filter(a => a.status !== 'saved').map(a => a.lead_id)
      if (activeIds.length > 0) {
        const { data: leads } = await supabase.from('leads').select('*').in('id', activeIds).eq('status', 'active')
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
      if (app && app.status !== 'saved' && groups[app.status]) groups[app.status].push(lead)
    })
    return groups
  }, [leads, appMap])

  const wonCount = grouped.hired.length
  const totalActive = applications.filter(a => a.status !== 'saved').length

  const updateApp = useCallback(async (leadId: string, status: string) => {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, status }),
    })
    if (res.ok) {
      const app = await res.json()
      setApplications(prev => [...prev.filter(a => a.lead_id !== leadId), app])
      toast.success(status === 'applied' ? 'Marked as applied' : status === 'hired' ? 'Nice — won!' : 'Marked as interested')
    }
  }, [])

  if (loading) return (
    <div className="pb-20 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="px-4 md:px-8 pt-6 pb-2">
        <div className="h-7 w-28 skel" /><div className="h-3 w-36 mt-2 skel" />
      </div>
    </div>
  )

  return (
    <div className="flex-1 pb-24 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm mb-4">
          <i className="ti ti-arrow-left" /> Feed
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Pipeline</h1>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{totalActive} active</p>
          </div>
          {wonCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#ECFDF5' }}>
              <i className="ti ti-trophy" style={{ fontSize: '14px', color: '#059669' }} />
              <span className="text-xs font-semibold" style={{ color: '#059669' }}>{wonCount} won</span>
            </div>
          )}
        </div>

        {totalActive === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#F3F4F6' }}>
              <i className="ti ti-send" style={{ fontSize: '20px', color: '#9CA3AF' }} />
            </div>
            <div className="text-sm font-medium" style={{ color: '#6B7280' }}>No leads in pipeline</div>
            <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Click Interested on leads in your feed</div>
            <button onClick={() => router.push('/dashboard')} className="btn-primary-sm mt-4">Go to feed</button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4" style={{ alignItems: 'start' }}>
            {columns.map(col => {
              const colLeads = grouped[col.key] || []
              return (
                <div key={col.key} className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: col.border, background: col.bg }}>
                    <i className={`ti ${col.icon}`} style={{ fontSize: '14px', color: col.accent }} />
                    <span className="text-xs font-semibold" style={{ color: col.accent }}>{col.label}</span>
                    <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full bg-white" style={{ color: col.accent }}>{colLeads.length}</span>
                  </div>
                  <div className="p-2.5 space-y-2 min-h-[100px]">
                    {colLeads.length === 0 ? (
                      <div className="text-center py-8 text-xs" style={{ color: '#9CA3AF' }}>No leads yet</div>
                    ) : (
                      colLeads.map(lead => {
                        const source = getSourceInfo(lead.source_url)
                        return (
                          <div key={lead.id}
                            className="rounded-lg p-3 transition-all cursor-pointer hover:shadow-sm"
                            style={{ background: '#F9FAFB', border: '1px solid #F3F4F6' }}
                            onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: source.bg, color: source.color }}>{source.label}</span>
                              {isNewLead(lead.posted_date) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#ECFDF5', color: '#059669' }}>New</span>}
                            </div>
                            <h4 className="text-xs font-semibold truncate" style={{ color: '#111827' }}>{lead.title}</h4>
                            {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                              <div className="text-[10px] font-medium mt-0.5" style={{ color: '#059669' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</div>
                            )}
                            <div className="flex items-center gap-1.5 mt-2">
                              {col.key === 'interested' && (
                                <button onClick={e => { e.stopPropagation(); updateApp(lead.id, 'applied') }}
                                  className="btn-ghost-sm text-[10px] px-2 py-1 min-h-[26px]">Mark applied</button>
                              )}
                              {col.key === 'applied' && (
                                <button onClick={e => { e.stopPropagation(); updateApp(lead.id, 'hired') }}
                                  className="btn-ghost-sm text-[10px] px-2 py-1 min-h-[26px]">Mark won</button>
                              )}
                              <span className="text-[9px]" style={{ color: '#9CA3AF' }}>{timeAgo(lead.posted_date)}</span>
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
