'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Application } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead } from '@/lib/utils'
import ScoreGauge from '@/components/ScoreGauge'
import { computeMatchExplanation } from '@/types'
import toast from 'react-hot-toast'

const SRC_CLS: Record<string, string> = {
  reddit: 'sb-reddit', reed: 'sb-reed', wwr: 'sb-wwr', remoteok: 'sb-rok', remotive: 'sb-rok',
}

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
      <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  return (
    <div className="flex-1 dash-page">
      <div className="dash-header">
        <div>
          <h1>Saved leads</h1>
          <p style={{ color: 'var(--slate)', fontSize: 13, marginTop: 4 }}>Bookmarked for later review</p>
        </div>
      </div>

      {leads.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><i className="ti ti-bookmark" /></div>
          <h3>No saved leads yet</h3>
          <p>Bookmark leads from your feed to keep them here.</p>
          <button onClick={() => router.push('/dashboard')} className="btn btn-primary" style={{ display: 'inline-flex' }}>Browse leads</button>
        </div>
      ) : (
        <div className="section-card">
          {leads.map(lead => {
            const src = getSourceInfo(lead.source_url)
            const srcCls = SRC_CLS[src.label.toLowerCase().replace(/\s+/g, '').replace('remoteok', 'rok')] || 'sb-reddit'
            const match = computeMatchExplanation(lead, null)
            return (
              <div key={lead.id} onClick={() => router.push(`/dashboard/lead/${lead.id}`)}
                className="saved-row">
                <ScoreGauge score={match.score} size="sm" />
                <div className="sr-main">
                  <div className="sr-title">{lead.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`src-badge ${srcCls}`}>{src.label.toUpperCase()}</span>
                    {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                      <span className="budget">{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--slate-2)' }}>{timeAgo(lead.posted_date)}</span>
                  </div>
                </div>
                <button onClick={e => { e.stopPropagation(); unsave(lead.id) }}
                  className="btn-icon" style={{ color: 'var(--coral)' }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
