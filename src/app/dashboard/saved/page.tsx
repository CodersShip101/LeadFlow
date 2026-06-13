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
      <div className="flex items-center gap-2" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} /> Loading...
      </div>
    </div>
  )

  return (
    <div className="flex-1 px-4 md:px-8 pt-6 pb-20 md:pb-8">
      <h1 className="text-lg font-bold" style={{ color: 'var(--ink-900)' }}>Saved Leads</h1>
      <p className="text-xs mt-1 mb-4" style={{ color: 'var(--slate-500)' }}>Bookmarked for later review</p>
      {leads.length === 0 ? (
        <div className="text-center py-16">
          <i className="ti ti-bookmark text-2xl" style={{ color: 'var(--slate-300)' }} />
          <p className="text-sm mt-2" style={{ color: 'var(--slate-500)' }}>No saved leads yet</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>Browse leads</button>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <div key={lead.id} onClick={() => router.push(`/dashboard/lead/${lead.id}`)}
              className="px-4 py-3 cursor-pointer rounded-xl flex items-center gap-3 transition-all" style={{ background: 'var(--paper-card)', border: '1px solid var(--slate-200)' }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: getSourceInfo(lead.source_url).bg, color: getSourceInfo(lead.source_url).color }}>
                    {getSourceInfo(lead.source_url).label}
                  </span>
                  {isNewLead(lead.posted_date) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(196,240,0,.15)', color: 'var(--lime-deep)' }}>New</span>}
                  <span className="text-[10px] ml-auto" style={{ color: 'var(--slate-500)' }}>{timeAgo(lead.posted_date)}</span>
                </div>
                <h3 className="text-sm font-semibold line-clamp-1" style={{ color: 'var(--ink-900)' }}>{lead.title}</h3>
                {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                  <span className="text-xs font-medium" style={{ color: 'var(--lime-deep)' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                )}
              </div>
              <button onClick={e => { e.stopPropagation(); unsave(lead.id) }}
                className="text-xs min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0 px-2.5 py-1.5 rounded-lg font-semibold"
                style={{ background: 'var(--slate-100)', color: 'var(--coral)' }}>
                <i className="ti ti-trash" style={{ fontSize: '14px' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
