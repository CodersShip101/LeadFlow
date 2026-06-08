'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeQualityScore } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead, formatDate, isUKLead } from '@/lib/utils'
import { Bookmark, ArrowLeft, ExternalLink } from 'lucide-react'

export default function SavedPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profile)
      const res = await fetch('/api/applications')
      if (!res.ok) return
      const apps: Application[] = await res.json()
      setApplications(apps)
      const savedLeadIds = apps.filter(a => a.status === 'saved').map(a => a.lead_id)
      if (savedLeadIds.length > 0) {
        const { data: leads } = await supabase.from('leads').select('*').in('id', savedLeadIds).eq('status', 'active')
        setLeads((leads || []).filter(lead => isUKLead(lead.client_location, lead.source_url)))
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => {
      const da = new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
      if (da !== 0) return da
      return computeQualityScore(b) - computeQualityScore(a)
    })
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
      toast.success('Lead removed from saved')
    }
  }, [])

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
        <h1 className="text-xl font-bold" style={{ color: '#1A1D23' }}>Saved Leads</h1>
        <p className="text-xs mt-1" style={{ color: '#AAB0BB' }}>{sortedLeads.length} saved lead{sortedLeads.length !== 1 ? 's' : ''}</p>

        {sortedLeads.length === 0 ? (
          <div className="text-center py-20" style={{ color: '#AAB0BB' }}>
            <Bookmark size={32} className="mx-auto mb-3" />
            <div className="text-sm font-medium">No saved leads yet</div>
            <div className="text-xs mt-1">Star a lead from the dashboard to save it for later</div>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#1B6B4A' }}
            >
              Go to feed
            </button>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {sortedLeads.map(lead => {
              const source = getSourceInfo(lead.source_url)
              const score = computeQualityScore(lead)
              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg px-4 py-3 transition-all cursor-pointer"
                  style={{ border: '1px solid #ECEEF2' }}
                  onClick={() => router.push(`/dashboard/lead/${lead.id}`)}
                >
                  <div className="flex items-start gap-3">
                    <button onClick={e => { e.stopPropagation(); if (lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }} className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 transition-opacity hover:opacity-80" style={{ background: source.bg, color: source.color }} title={`View on ${source.label}`}>{source.label}</button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isNewLead(lead.posted_date) && (
                          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>New</span>
                        )}
                        <h3 className="text-sm font-semibold truncate" style={{ color: '#1A1D23' }}>{lead.title}</h3>
                        <span className="text-[10px] font-medium" style={{ color: score >= 8 ? '#1B6B4A' : '#AAB0BB' }}>{score}/10</span>
                      </div>
                      <p className="text-xs line-clamp-1 mt-0.5" style={{ color: '#6B7280' }}>{lead.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F2F3F7', color: '#6B7280' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                        )}
                        {lead.skills_required?.slice(0, 2).map(s => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#EBF1FC', color: '#2563EB' }}>{s}</span>
                        ))}
                        <span className="text-[10px]" style={{ color: '#AAB0BB' }} title={formatDate(lead.posted_date)}>{timeAgo(lead.posted_date)}</span>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleUnsave(lead.id) }}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                      title="Remove from saved"
                    >
                      <Bookmark size={14} color="#1B6B4A" fill="#1B6B4A" />
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
