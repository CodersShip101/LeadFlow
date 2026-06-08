'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo } from '@/lib/utils'
import { Send, Trophy, ArrowLeft, Check } from 'lucide-react'

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  interested: { label: 'Interested', color: '#1B6B4A', bg: '#EBF5F0' },
  applied:    { label: 'Applied', color: '#D97706', bg: '#FEF3E2' },
  hired:      { label: 'Hired', color: '#059669', bg: '#ECFDF5' },
}

type Tab = 'all' | 'interested' | 'applied' | 'hired'

export default function AppliedPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('all')
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
        setLeads(leads || [])
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

  const filteredLeads = useMemo(() => {
    let list = leads
    if (activeTab !== 'all') {
      list = list.filter(lead => appMap.get(lead.id)?.status === activeTab)
    }
    return list.sort((a, b) => {
      const appA = appMap.get(a.id), appB = appMap.get(b.id)
      return (appB ? new Date(appB.created_at).getTime() : 0) - (appA ? new Date(appA.created_at).getTime() : 0)
    })
  }, [leads, activeTab, appMap])

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
      toast.success(status === 'applied' ? 'Marked as applied' : 'Marked as hired!')
    }
  }, [])

  const counts = useMemo(() => ({
    interested: applications.filter(a => a.status === 'interested').length,
    applied: applications.filter(a => a.status === 'applied').length,
    hired: applications.filter(a => a.status === 'hired').length,
  }), [applications])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="animate-spin h-8 w-8 border-4 rounded-full" style={{ borderColor: '#1B6B4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex-1 pb-20 md:pb-0" style={{ background: '#F2F3F7' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1.5 text-xs font-medium mb-4" style={{ color: '#6B7280' }}>
          <ArrowLeft size={12} /> Dashboard
        </button>
        <h1 className="text-xl font-bold mb-4" style={{ color: '#1A1D23' }}>Applications</h1>

        <div className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid #ECEEF2' }}>
          {[
            { key: 'all' as Tab, label: 'All', count: applications.filter(a => a.status !== 'saved').length },
            { key: 'interested' as Tab, label: 'Interested', count: counts.interested },
            { key: 'applied' as Tab, label: 'Applied', count: counts.applied },
            { key: 'hired' as Tab, label: 'Won', count: counts.hired },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 text-sm font-medium transition-all -mb-px"
              style={{
                color: activeTab === tab.key ? '#1B6B4A' : '#6B7280',
                borderBottom: activeTab === tab.key ? '2px solid #1B6B4A' : '2px solid transparent',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs" style={{ color: activeTab === tab.key ? '#1B6B4A' : '#AAB0BB' }}>({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {filteredLeads.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#AAB0BB' }}>
            <div className="flex justify-center mb-3">
              {activeTab === 'all' ? <Send size={32} /> : activeTab === 'hired' ? <Trophy size={32} /> : <Check size={32} />}
            </div>
            <div className="text-sm font-medium">
              {activeTab === 'all' ? "You haven't expressed interest in any leads yet" :
               activeTab === 'interested' ? 'No leads marked as interested' :
               activeTab === 'applied' ? 'No applications yet' : 'No wins yet'}
            </div>
            <div className="text-xs mt-1">
              {activeTab === 'all' ? 'Browse the feed and click Interested on leads you like' :
               activeTab === 'interested' ? '' :
               activeTab === 'applied' ? 'Click "Mark as Applied" on leads you\'ve pursued' :
               'Mark leads as hired when you land them!'}
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#1B6B4A' }}
            >
              Go to feed
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLeads.map(lead => {
              const source = getSourceInfo(lead.source_url)
              const app = appMap.get(lead.id)
              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg px-4 py-3 transition-all cursor-pointer"
                  style={{ border: '1px solid #ECEEF2' }}
                  onClick={() => router.push(`/dashboard/lead/${lead.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <button onClick={e => { e.stopPropagation(); if (lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }} className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium shrink-0 transition-opacity hover:opacity-80" style={{ background: source.bg, color: source.color }} title={`View on ${source.label}`}>{source.label[0]}</button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold truncate" style={{ color: '#1A1D23' }}>{lead.title}</h3>
                        {app?.status && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: statusConfig[app.status]?.bg, color: statusConfig[app.status]?.color }}>
                            {statusConfig[app.status]?.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs line-clamp-1 mt-0.5" style={{ color: '#6B7280' }}>{lead.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F2F3F7', color: '#6B7280' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                        )}
                        {lead.skills_required?.slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#EBF1FC', color: '#2563EB' }}>{s}</span>
                        ))}
                        <span className="text-[10px]" style={{ color: '#AAB0BB' }}>{timeAgo(lead.posted_date)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {app?.status === 'interested' && (
                        <button
                          onClick={e => { e.stopPropagation(); updateApplication(lead.id, 'applied') }}
                          className="text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap"
                          style={{ background: '#FEF3E2', color: '#D97706' }}
                        >
                          Mark applied
                        </button>
                      )}
                      {app?.status === 'applied' && (
                        <button
                          onClick={e => { e.stopPropagation(); updateApplication(lead.id, 'hired') }}
                          className="text-[10px] font-medium px-2 py-1 rounded whitespace-nowrap"
                          style={{ background: '#EBF5F0', color: '#1B6B4A' }}
                        >
                          Mark hired
                        </button>
                      )}
                      {app && (
                        <span className="text-[10px] whitespace-nowrap" style={{ color: '#AAB0BB' }}>
                          {timeAgo(app.created_at)}
                        </span>
                      )}
                    </div>
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
