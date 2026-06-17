'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Application, Profile } from '@/types'
import { formatBudgetGBP, timeAgo } from '@/lib/utils'
import { computeMatchExplanation } from '@/types'
import toast from 'react-hot-toast'

const SRC: Record<string, { name: string; cls: string; ava: string; ini: string }> = {
  reddit: { name: 'Reddit', cls: 'sb-reddit', ava: '#FF5A3C', ini: 'R' },
  reed:   { name: 'Reed',   cls: 'sb-reed',   ava: '#3B7BE0', ini: 'R' },
  wwr:    { name: 'WWR',    cls: 'sb-wwr',     ava: '#E8A020', ini: 'W' },
  rok:    { name: 'Remote OK', cls: 'sb-rok',  ava: '#9B6BE0', ini: 'O' },
}

function srcKey(url: string | null): string {
  const l = (url || '').toLowerCase()
  if (l.includes('reddit')) return 'reddit'
  if (l.includes('reed')) return 'reed'
  if (l.includes('weworkremotely') || l.includes('wwr')) return 'wwr'
  return 'rok'
}

function scoreColor(s: number) {
  if (s >= 8) return 'var(--hi)'
  if (s >= 5) return 'var(--mid)'
  return 'var(--slate)'
}

function urgencyLabel(posted: string): { label: string; hot: boolean } | null {
  const h = (Date.now() - new Date(posted).getTime()) / 3600000
  if (h < 24) return { label: 'Posted today', hot: true }
  if (h < 48) return { label: 'Yesterday', hot: true }
  if (h < 96) return { label: `${Math.round(h / 24)}d old`, hot: false }
  return { label: `${Math.round(h / 24)}d old — act soon`, hot: false }
}

export default function SavedPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [appMap, setAppMap] = useState<Map<string, Application>>(new Map())
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const [appsRes, profileRes] = await Promise.all([
        fetch('/api/applications'),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      if (!appsRes.ok) return
      const apps: Application[] = await appsRes.json()
      setProfile(profileRes.data)
      const map = new Map<string, Application>()
      apps.forEach(a => map.set(a.lead_id, a))
      setAppMap(map)
      const savedIds = apps.filter(a => a.status === 'saved').map(a => a.lead_id)
      if (savedIds.length > 0) {
        const { data } = await supabase.from('leads').select('*').in('id', savedIds)
        // sort by posted_date desc (newest first)
        const sorted = (data || []).sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime())
        setLeads(sorted)
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const unsave = async (leadId: string) => {
    const r = await fetch('/api/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId }) })
    if (r.ok) { setLeads(prev => prev.filter(l => l.id !== leadId)); toast('Removed from saved') }
  }

  const moveToPipeline = async (leadId: string) => {
    const r = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: leadId, status: 'interested' }) })
    if (r.ok) {
      const app = await r.json()
      setAppMap(prev => { const m = new Map(prev); m.set(leadId, app); return m })
      toast.success('Added to pipeline')
    }
  }

  if (loading) return null

  const hotLeads = leads.filter(l => (Date.now() - new Date(l.posted_date).getTime()) / 3600000 < 48)

  if (leads.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><i className="ti ti-bookmark"></i></div>
        <h3>Your shortlist is empty</h3>
        <p>Bookmark leads you want to revisit. They'll wait here until you're ready to apply.</p>
        <button className="btn btn-primary" style={{ display: 'inline-flex' }} onClick={() => router.push('/dashboard')}>
          <i className="ti ti-arrow-left"></i> Browse leads
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="sv-header">
        <div className="sv-header-left">
          <h2 className="sv-title">Shortlist</h2>
          <p className="sv-sub">
            <span className="sv-count">{leads.length}</span> saved
            {hotLeads.length > 0 && <span className="sv-hot-badge"><i className="ti ti-flame" />{hotLeads.length} posted recently</span>}
          </p>
        </div>
        <button className="btn btn-ghost sv-feed-btn" onClick={() => router.push('/dashboard')}>
          <i className="ti ti-plus" /> Add more
        </button>
      </div>

      {/* Cards */}
      <div className="sv-list">
        {leads.map(lead => {
          const m = computeMatchExplanation(lead, profile)
          const sc = m.score
          const si = SRC[srcKey(lead.source_url)] || SRC.reddit
          const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
          const urg = urgencyLabel(lead.posted_date)
          const inPipeline = appMap.get(lead.id)?.status === 'interested' || appMap.get(lead.id)?.status === 'applied' || appMap.get(lead.id)?.status === 'hired'
          const matchedSkills = m.skillMatch.matched.length
          const totalSkills = (lead.skills_required || []).length

          return (
            <div key={lead.id} className="sv-card" onClick={() => router.push(`/dashboard/lead/${lead.id}`)}>
              {/* Score strip on left */}
              <div className="sv-score-bar" style={{ background: scoreColor(sc) }} />

              <div className="sv-card-inner">
                {/* Top row */}
                <div className="sv-card-top">
                  <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
                  {urg && (
                    <span className={`sv-urg ${urg.hot ? 'hot' : ''}`}>
                      {urg.hot && <i className="ti ti-flame" />}{urg.label}
                    </span>
                  )}
                  <span className="sv-score-chip" style={{ color: scoreColor(sc), borderColor: `${scoreColor(sc)}33` }}>
                    {sc}
                  </span>
                </div>

                {/* Title */}
                <h3 className="sv-card-title">{lead.title}</h3>

                {/* Meta row */}
                <div className="sv-card-meta">
                  {budget && <span className="sv-budget"><i className="ti ti-currency-pound" />{budget}</span>}
                  {lead.client_location && <span className="sv-meta-chip"><i className="ti ti-map-pin" />{lead.client_location}</span>}
                  {totalSkills > 0 && (
                    <span className="sv-meta-chip" style={{ color: matchedSkills === totalSkills ? 'var(--hi)' : matchedSkills > 0 ? 'var(--mid)' : 'var(--slate)' }}>
                      <i className="ti ti-code" />{matchedSkills}/{totalSkills} skills
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="sv-card-actions" onClick={e => e.stopPropagation()}>
                  {inPipeline
                    ? <button className="sv-pipeline-btn on" onClick={() => router.push('/dashboard/applied')}>
                        <i className="ti ti-circle-check-filled" /> In pipeline
                        <i className="ti ti-arrow-right sv-arr" />
                      </button>
                    : <button className="sv-pipeline-btn" onClick={() => moveToPipeline(lead.id)}>
                        <i className="ti ti-send" /> Move to pipeline
                      </button>}
                  <button className="sv-remove-btn" title="Remove from saved" onClick={() => unsave(lead.id)}>
                    <i className="ti ti-bookmark-off" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
