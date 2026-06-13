'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Profile, Application } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead } from '@/lib/utils'
import toast from 'react-hot-toast'

const sourceFilters = ['All', 'LinkedIn', 'Upwork', 'Freelancer', 'PPH']

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [newCount, setNewCount] = useState(0)
  const [limitReached, setLimitReached] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      if (prof && (!prof.skills || prof.skills.length === 0)) router.push('/dashboard/onboarding')

      const lastSeen = parseInt(localStorage.getItem('lastSeen') || '0')
      const res = await fetch('/api/applications')
      const apps: Application[] = res.ok ? await res.json() : []
      setApplications(apps)

      const { data: leadsData } = await supabase.from('leads').select('*').eq('status', 'active').gte('posted_date', new Date(Date.now() - 7 * 86400000).toISOString()).order('posted_date', { ascending: false })
      setLeads(leadsData || [])

      if (lastSeen > 0) {
        const newLeads = (leadsData || []).filter(l => new Date(l.posted_date).getTime() > lastSeen)
        setNewCount(newLeads.length)
      }
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const appMap = new Map(applications.map(a => [a.lead_id, a]))

  const filtered = leads.filter(l => {
    const source = getSourceInfo(l.source_url)
    if (sourceFilter !== 'All' && source.label !== sourceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q) || l.client_location?.toLowerCase().includes(q)
    }
    return true
  })

  const limit = profile?.subscription_status === 'free' ? 5 : 100

  const handleSave = async (lead: Lead) => {
    const existing = appMap.get(lead.id)
    if (existing?.status === 'saved') {
      const r = await fetch('/api/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id }) })
      if (r.ok) { setApplications(prev => prev.filter(a => a.lead_id !== lead.id)); toast('Removed from saved') }
    } else {
      const r = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, status: 'saved' }) })
      if (r.ok) { const app = await r.json(); setApplications(prev => [...prev.filter(a => a.lead_id !== lead.id), app]); toast.success('Lead saved') }
    }
  }

  const handleApply = (lead: Lead) => {
    if (profile?.subscription_status === 'free') {
      const appCount = applications.filter(a => a.status !== 'saved').length
      if (appCount >= 5 && limit <= 5) { setLimitReached(true); toast.error('Application limit reached'); return }
    }
    router.push(`/dashboard/lead/${lead.id}`)
  }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-3" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading leads&hellip;</span>
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      <div ref={containerRef} className="flex-1 overflow-y-auto dash-page">
        {/* Stats */}
        <div className="dash-stats">
          {[
            { label: 'Total Leads', value: leads.length.toString(), color: 'var(--lime-deep)' },
            { label: 'Applied', value: applications.filter(a => a.status !== 'saved').length.toString(), color: 'var(--amber)' },
            { label: 'Saved', value: applications.filter(a => a.status === 'saved').length.toString(), color: 'var(--slate-500)' },
            { label: 'New', value: newCount.toString(), color: 'var(--green-score)' },
          ].map(s => (
            <div key={s.label} className="dash-stat">
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {leads.length === 0 && (
          <div className="card flex items-center gap-3 p-4 mb-4" style={{ background: 'rgba(255,176,32,.08)', borderColor: 'rgba(255,176,32,.25)' }}>
            <i className="ti ti-alert-triangle" style={{ color: 'var(--amber)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--slate-700)' }}>No leads found</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>Leads are currently refreshing. Check back soon.</p>
            </div>
            <button onClick={async () => { toast.success('Refreshing&hellip;'); router.refresh() }} className="btn-p btn-sm">Refresh</button>
          </div>
        )}

        {/* Search + source filters */}
        <div className="dash-toolbar">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--slate-400)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search leads&hellip;" />
          </div>
          <div className="flex gap-1.5">
            {sourceFilters.map(f => (
              <button key={f} onClick={() => setSourceFilter(f)}
                className={`dash-filter ${sourceFilter === f ? 'active' : 'inactive'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Lead feed */}
        <div className="space-y-3">
          {filtered.slice(0, limit).map(lead => (
            <div key={lead.id} onClick={() => setSelected(lead)} className="dash-lead">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: getSourceInfo(lead.source_url).bg, color: getSourceInfo(lead.source_url).color }}>
                      {getSourceInfo(lead.source_url).label}
                    </span>
                    {isNewLead(lead.posted_date) && <span className="dash-badge-new text-[9px] px-1.5 py-0.5 rounded">New</span>}
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--slate-400)' }}>{timeAgo(lead.posted_date)}</span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug line-clamp-1" style={{ color: 'var(--ink-900)' }}>{lead.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                      <span className="dash-badge-status" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                    )}
                    {lead.client_location && <span className="text-[10px]" style={{ color: 'var(--slate-500)' }}>{lead.client_location}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {appMap.has(lead.id) && appMap.get(lead.id)!.status !== 'saved' ? (
                    <span className="dash-badge-status text-center" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>
                      {appMap.get(lead.id)!.status === 'hired' ? 'Won' : appMap.get(lead.id)!.status}
                    </span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); handleApply(lead) }} className="btn-p btn-sm !px-4 !py-1.5 text-[11px]">Apply</button>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleSave(lead) }}
                    className="flex items-center justify-center text-[11px] p-1.5 rounded-lg transition-all min-h-[30px] min-w-[30px]"
                    style={{ background: appMap.get(lead.id)?.status === 'saved' ? 'rgba(196,240,0,.12)' : 'var(--slate-100)', color: appMap.get(lead.id)?.status === 'saved' ? 'var(--lime-deep)' : 'var(--slate-500)' }}>
                    <i className={`ti ${appMap.get(lead.id)?.status === 'saved' ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: '14px' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && leads.length > 0 && (
          <div className="text-center py-16">
            <i className="ti ti-search text-3xl" style={{ color: 'var(--slate-300)' }} />
            <p className="text-sm mt-2 font-medium" style={{ color: 'var(--slate-500)' }}>No leads match your filters.</p>
            <button onClick={() => { setSearch(''); setSourceFilter('All') }} className="btn-line btn-sm mt-3">Clear filters</button>
          </div>
        )}

        {/* Limit banner */}
        {profile?.subscription_status === 'free' && leads.length >= limit && (
          <div className="card p-5 mt-4 text-center" style={{ background: 'var(--slate-100)', borderColor: 'var(--slate-200)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>You&apos;ve used your free preview</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>Upgrade to see all leads</p>
            <button onClick={() => router.push('/dashboard/billing')} className="btn-p btn-sm mt-3 !px-6">View Plans</button>
          </div>
        )}

        {/* Limit modal */}
        {limitReached && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setLimitReached(false)}>
            <div className="card p-6 max-w-sm w-full text-center animate-scaleIn" onClick={e => e.stopPropagation()}>
              <i className="ti ti-lock text-2xl" style={{ color: 'var(--amber)' }} />
              <h3 className="text-lg font-bold mt-2" style={{ color: 'var(--ink-900)' }}>Application limit reached</h3>
              <p className="text-xs mt-2" style={{ color: 'var(--slate-500)' }}>Free plan limit exceeded. Upgrade to Pro.</p>
              <button onClick={() => router.push('/dashboard/billing')} className="btn-amber mt-4 w-full justify-center">Upgrade</button>
              <button onClick={() => setLimitReached(false)} className="btn-line mt-2 w-full justify-center">Dismiss</button>
            </div>
          </div>
        )}

        {/* Upgrade banner */}
        {profile?.subscription_status === 'free' && (
          <div className="card p-5 mt-4" style={{ background: 'linear-gradient(135deg, var(--ink-900), var(--ink-800))', border: 'none' }}>
            <p className="text-sm font-semibold text-white">Upgrade to Pro</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-300)' }}>Unlimited applications and advanced insights.</p>
            <button onClick={() => router.push('/dashboard/billing')} className="btn-p btn-sm mt-3">See Plans</button>
          </div>
        )}
      </div>

      {/* Right panel */}
      {selected && (
        <aside className="hidden md:block w-[300px] shrink-0 overflow-y-auto border-l px-5 py-5" style={{ borderColor: 'var(--slate-200)' }}>
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mb-4 transition-all btn-line btn-sm"
            style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', border: 'none' }}>
            <i className="ti ti-x" /> Close
          </button>
          <div className="space-y-1 mb-3">
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: getSourceInfo(selected.source_url).bg, color: getSourceInfo(selected.source_url).color }}>
              {getSourceInfo(selected.source_url).label}
            </span>
            {isNewLead(selected.posted_date) && <span className="dash-badge-new text-[9px] px-1.5 py-0.5 rounded">New</span>}
          </div>
          <h2 className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink-900)' }}>{selected.title}</h2>
          {selected.client_location && <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>{selected.client_location}</p>}
          <p className="text-xs mt-1" style={{ color: 'var(--slate-400)' }}>{getSourceInfo(selected.source_url).label} &middot; {new Date(selected.posted_date).toLocaleDateString()}</p>
          {formatBudgetGBP(selected.budget_min, selected.budget_max) && (
            <p className="dash-badge-status mt-3" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>{formatBudgetGBP(selected.budget_min, selected.budget_max)}</p>
          )}
          <div className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--slate-600)', maxHeight: '240px', overflowY: 'auto' }}>{selected.description?.slice(0, 500)}</div>
          {selected.skills_required && selected.skills_required.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selected.skills_required.map(sk => (
                <span key={sk} className="badge-skill text-[10px]">{sk}</span>
              ))}
            </div>
          )}
          {selected.source_url && (
            <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="btn-line btn-sm mt-4 w-full justify-center">
              <i className="ti ti-external-link" /> View Original
            </a>
          )}
        </aside>
      )}
    </div>
  )
}
