'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Application } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function SavedPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const res = await fetch('/api/applications')
      if (!res.ok) return
      const apps: Application[] = await res.json()
      const savedIds = apps.filter(a => a.status === 'saved').map(a => a.lead_id)
      if (savedIds.length > 0) {
        const { data } = await supabase.from('leads').select('*').in('id', savedIds)
        setLeads(data || [])
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const unsave = async (leadId: string) => {
    const r = await fetch('/api/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId }) })
    if (r.ok) { setLeads(prev => prev.filter(l => l.id !== leadId)); toast('Lead removed from saved') }
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center pt-16">
      <div className="flex items-center gap-3" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  return (
    <div className="flex-1 dash-page">
      <div className="dash-header">
        <div>
          <h1>Saved Leads</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>Bookmarked for later review</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="text-center py-20">
          <i className="ti ti-bookmark text-3xl" style={{ color: 'var(--slate-300)' }} />
          <p className="text-sm mt-2 font-medium" style={{ color: 'var(--slate-500)' }}>No saved leads yet</p>
          <button onClick={() => router.push('/dashboard')} className="btn-p btn-sm mt-4">Browse leads</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {leads.map(lead => (
            <div key={lead.id} onClick={() => router.push(`/dashboard/lead/${lead.id}`)}
              className="dash-lead flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: getSourceInfo(lead.source_url).bg, color: getSourceInfo(lead.source_url).color }}>
                    {getSourceInfo(lead.source_url).label}
                  </span>
                  {isNewLead(lead.posted_date) && <span className="dash-badge-new text-[9px] px-1.5 py-0.5 rounded">New</span>}
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--slate-400)' }}>{timeAgo(lead.posted_date)}</span>
                </div>
                <h3 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--ink-900)' }}>{lead.title}</h3>
                {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                  <span className="dash-badge-status mt-1" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); unsave(lead.id) }}
                className="flex items-center justify-center min-h-[36px] min-w-[36px] p-2 rounded-lg transition-all"
                style={{ background: 'rgba(255,107,94,.1)', color: 'var(--coral)' }}>
                <i className="ti ti-trash" style={{ fontSize: '14px' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
