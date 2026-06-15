'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Application } from '@/types'
import { formatBudgetGBP, timeAgo } from '@/lib/utils'
import { computeMatchExplanation } from '@/types'
import toast from 'react-hot-toast'

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

function scoreColor(s: number) {
  return s >= 8 ? { c: 'var(--hi)', bg: 'var(--hi-bg)' } : s >= 5 ? { c: 'var(--mid)', bg: 'var(--mid-bg)' } : { c: 'var(--lo)', bg: 'var(--lo-bg)' }
}

function gaugeSVG(score: number) {
  const pct = score / 10, r = 18, circ = 2 * Math.PI * r, off = circ * (1 - pct), col = scoreColor(score).c
  return (
    <div className="gauge-ring">
      <svg width="42" height="42" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--line)" strokeWidth={4} />
        <circle cx="21" cy="21" r={r} fill="none" stroke={col} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .6s var(--ease)' }} />
      </svg>
      <span className="gauge-num" style={{ color: col }}>{score}</span>
    </div>
  )
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
    if (r.ok) { setLeads(prev => prev.filter(l => l.id !== leadId)); toast('Removed from saved') }
  }

  if (loading) return null

  if (leads.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><i className="ti ti-bookmark"></i></div>
        <h3>No saved leads yet</h3>
        <p>Tap the bookmark on any lead to park it here — handy for leads you want to revisit before your application limit resets.</p>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard')}>
          <i className="ti ti-arrow-left"></i> Browse leads
        </button>
      </div>
    )
  }

  return (
    <>
      <div className="greeting">
        <h2>Saved leads</h2>
        <p>{leads.length} bookmarked for later.</p>
      </div>
      <div className="section-card">
        {leads.map(lead => {
          const match = computeMatchExplanation(lead, null)
          const si = srcInfo(lead.source_url)
          const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
          return (
            <div key={lead.id} className="saved-row">
              {gaugeSVG(match.score)}
              <div className="sr-main">
                <div className="sr-title">{lead.title}</div>
                <div className="lc-meta" style={{ margin: 0 }}>
                  <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
                  {budget && <span className="budget">{budget}</span>}
                  <span className="lc-time">{timeAgo(lead.posted_date)}</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
                Open
              </button>
              <button className="btn-icon tip" data-tip="Remove" aria-label="Remove from saved"
                style={{ color: 'var(--coral)' }} onClick={() => unsave(lead.id)}>
                <i className="ti ti-trash"></i>
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
