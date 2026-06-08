'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeQualityScore } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead, formatDate, isUKLead } from '@/lib/utils'

export default function SavedPage() {
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
      const savedIds = apps.filter(a => a.status === 'saved').map(a => a.lead_id)
      if (savedIds.length > 0) {
        const { data: leads } = await supabase.from('leads').select('*').in('id', savedIds).eq('status', 'active')
        setLeads((leads || []).filter(lead => isUKLead(lead.client_location, lead.source_url)))
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime())
  }, [leads])

  const handleUnsave = useCallback(async (leadId: string) => {
    const res = await fetch('/api/applications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId }),
    })
    if (res.ok) {
      setApplications(prev => prev.filter(a => a.lead_id !== leadId))
      setLeads(prev => prev.filter(l => l.id !== leadId))
      toast.success('Lead removed')
    }
  }, [])

  if (loading) return (
    <div className="pb-20 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="px-4 md:px-8 pt-6 pb-2">
        <div className="h-7 w-32 skel" /><div className="h-3 w-40 mt-2 skel" />
      </div>
      <div className="px-4 md:px-8 mt-4 space-y-2">
        {[1,2].map(i => <div key={i} className="h-[100px] rounded-xl skel" />)}
      </div>
    </div>
  )

  return (
    <div className="flex-1 pb-24 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm mb-4">
          <i className="ti ti-arrow-left" /> Feed
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Saved leads</h1>
        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{sortedLeads.length} saved</p>

        {sortedLeads.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#F3F4F6' }}>
              <i className="ti ti-bookmark" style={{ fontSize: '20px', color: '#9CA3AF' }} />
            </div>
            <div className="text-sm font-medium" style={{ color: '#6B7280' }}>No saved leads</div>
            <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Bookmark leads from your feed to save them here</div>
            <button onClick={() => router.push('/dashboard')} className="btn-primary-sm mt-4">Go to feed</button>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {sortedLeads.map(lead => {
              const source = getSourceInfo(lead.source_url)
              const score = computeQualityScore(lead)
              return (
                <div key={lead.id} className="card card-hover p-4 cursor-pointer" onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>
                  <div className="flex items-start gap-3">
                    <button onClick={e => { e.stopPropagation(); if (lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }}
                      className="tag shrink-0" style={{ background: source.bg, color: source.color }}>{source.label}</button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isNewLead(lead.posted_date) && <span className="tag" style={{ background: '#ECFDF5', color: '#059669' }}>New</span>}
                        <h3 className="text-sm font-semibold truncate" style={{ color: '#111827' }}>{lead.title}</h3>
                        <span className={`text-[10px] font-semibold ${score >= 8 ? 'text-[#059669]' : 'text-[#9CA3AF]'}`}>{score}/10</span>
                      </div>
                      <p className="text-xs line-clamp-1 mt-0.5" style={{ color: '#6B7280' }}>{lead.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                          <span className="tag" style={{ background: '#F3F4F6', color: '#6B7280' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                        )}
                        {lead.skills_required?.slice(0, 2).map(s => (
                          <span key={s} className="tag" style={{ background: '#EFF6FF', color: '#2563EB' }}>{s}</span>
                        ))}
                        <span className="text-[10px]" style={{ color: '#9CA3AF' }} title={formatDate(lead.posted_date)}>{timeAgo(lead.posted_date)}</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleUnsave(lead.id) }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-[0.93]" title="Remove">
                      <i className="ti ti-bookmark-filled" style={{ fontSize: '14px', color: '#1B6B4A' }} />
                    </button>
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
