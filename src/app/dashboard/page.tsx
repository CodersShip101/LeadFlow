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
  const [lastSeenDate, setLastSeenDate] = useState<number>(0)
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
      setLastSeenDate(lastSeen)

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
      <div className="flex items-center gap-2" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} /> Loading leads...
      </div>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      {/* Feed */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-20 md:pb-8">
        {/* Stats */}
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {[
            { label: 'Total Leads', value: leads.length.toString(), color: 'var(--lime)' },
            { label: 'Applied', value: applications.filter(a => a.status !== 'saved').length.toString(), color: 'var(--amber)' },
            { label: 'Saved', value: applications.filter(a => a.status === 'saved').length.toString(), color: 'var(--slate-500)' },
            { label: 'New', value: newCount.toString(), color: 'var(--green-score)' },
          ].map(s => (
            <div key={s.label} className="shrink-0 min-w-[120px] flex-1 p-4 rounded-xl" style={{ background: 'var(--paper-card)', border: '1px solid var(--slate-200)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--slate-500)' }}>{s.label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Scrape status */}
        {leads.length === 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl mb-4" style={{ background: 'rgba(255,176,32,.1)', border: '1px solid rgba(255,176,32,.25)' }}>
            <i className="ti ti-alert-triangle" style={{ color: 'var(--amber)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--slate-700)' }}>No leads found</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>Leads are currently refreshing. Check back soon.</p>
            </div>
            <button onClick={async () => { toast.success('Refreshing...'); setLoading(true); router.refresh() }}
              className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>Refresh</button>
          </div>
        )}

        {/* Search + source filters */}
        <div className="flex gap-2 items-center mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--slate-400)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }}
              placeholder="Search leads..." />
          </div>
          <div className="flex gap-1.5">
            {sourceFilters.map(f => (
              <button key={f} onClick={() => setSourceFilter(f)}
                className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all active:scale-[0.95] whitespace-nowrap"
                style={{ background: sourceFilter === f ? 'var(--lime)' : 'var(--slate-100)', color: sourceFilter === f ? 'var(--ink-950)' : 'var(--slate-600)' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Lead feed */}
        <div className="space-y-2.5">
          {filtered.slice(0, limit).map(lead => (
            <div key={lead.id} onClick={() => setSelected(lead)}
              className="px-4 py-3 cursor-pointer rounded-xl transition-all" style={{ background: 'var(--paper-card)', border: '1px solid var(--slate-200)' }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: getSourceInfo(lead.source_url).bg, color: getSourceInfo(lead.source_url).color }}>
                      {getSourceInfo(lead.source_url).label}
                    </span>
                    {isNewLead(lead.posted_date) && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(196,240,0,.15)', color: 'var(--lime-deep)' }}>New</span>}
                    <span className="text-[10px] ml-auto" style={{ color: 'var(--slate-500)' }}>{timeAgo(lead.posted_date)}</span>
                  </div>
                  <h3 className="text-sm font-semibold leading-snug line-clamp-1" style={{ color: 'var(--ink-900)' }}>{lead.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                      <span className="text-xs font-medium" style={{ color: 'var(--lime-deep)' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                    )}
                    {lead.client_location && <span className="text-[10px]" style={{ color: 'var(--slate-500)' }}>{lead.client_location}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {appMap.has(lead.id) && appMap.get(lead.id)!.status !== 'saved' ? (
                    <span className="text-[10px] font-medium px-2 py-1 rounded" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>
                      {appMap.get(lead.id)!.status === 'hired' ? 'Won' : appMap.get(lead.id)!.status}
                    </span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); handleApply(lead) }}
                      className="text-[11px] px-3 py-1.5 min-h-[32px] rounded-lg font-semibold"
                      style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>Apply</button>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleSave(lead) }}
                    className="text-[11px] px-2 py-1 min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center font-semibold"
                    style={{ background: 'var(--slate-100)', color: appMap.get(lead.id)?.status === 'saved' ? 'var(--lime-deep)' : 'var(--slate-500)' }}>
                    <i className={`ti ${appMap.get(lead.id)?.status === 'saved' ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: '14px' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && <div className="text-center py-12"><i className="ti ti-search text-2xl" style={{ color: 'var(--slate-300)' }} /><p className="text-sm mt-2" style={{ color: 'var(--slate-500)' }}>No leads match your filters.</p></div>}

        {/* Limit banner */}
        {profile?.subscription_status === 'free' && leads.length >= limit && (
          <div className="p-4 rounded-xl mt-4 text-center" style={{ background: 'var(--slate-100)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--ink-900)' }}>You&apos;ve used your free preview</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-600)' }}>Upgrade to see all leads</p>
            <button onClick={() => router.push('/dashboard/billing')} className="text-sm mt-3 px-6 py-2.5 rounded-lg font-semibold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>View Plans</button>
          </div>
        )}

        {/* Limit modal */}
        {limitReached && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setLimitReached(false)}>
            <div className="max-w-sm w-full text-center p-6 rounded-xl animate-scale-in" style={{ background: 'var(--paper-card)', border: '1px solid var(--slate-200)' }} onClick={e => e.stopPropagation()}>
              <i className="ti ti-lock text-2xl" style={{ color: 'var(--amber)' }} />
              <h3 className="text-lg font-bold mt-2" style={{ color: 'var(--ink-900)' }}>Application limit reached</h3>
              <p className="text-xs mt-2" style={{ color: 'var(--slate-600)' }}>Free plan limit exceeded. Upgrade to Pro.</p>
              <button onClick={() => router.push('/dashboard/billing')} className="mt-4 w-full py-2.5 rounded-lg font-semibold justify-center flex items-center gap-2" style={{ background: 'var(--amber)', color: 'var(--ink-950)' }}>Upgrade</button>
              <button onClick={() => setLimitReached(false)} className="mt-2 w-full py-2.5 rounded-lg font-semibold justify-center flex items-center gap-2" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Upgrade banner */}
        {profile?.subscription_status === 'free' && (
          <div className="p-4 rounded-xl mt-4" style={{ background: 'linear-gradient(135deg, var(--ink-900), var(--ink-800))' }}>
            <p className="text-sm font-medium text-white">Upgrade to Pro</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-300)' }}>Unlimited applications and advanced insights.</p>
            <button onClick={() => router.push('/dashboard/billing')} className="text-sm mt-3 px-5 py-2 rounded-lg font-semibold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>See Plans</button>
          </div>
        )}
      </div>

      {/* Right panel */}
      {selected && (
        <aside className="hidden md:block w-[280px] lg:w-[320px] shrink-0 overflow-y-auto border-l px-4 py-4" style={{ borderColor: 'var(--slate-200)' }}>
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mb-4 transition-all"
            style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}><i className="ti ti-x" /> Close</button>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>{selected.title}</h2>
          {selected.client_location && <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>{selected.client_location}</p>}
          <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>{getSourceInfo(selected.source_url).label} &middot; {new Date(selected.posted_date).toLocaleDateString()}</p>
          {formatBudgetGBP(selected.budget_min, selected.budget_max) && (
            <p className="text-sm font-semibold mt-3" style={{ color: 'var(--lime-deep)' }}>{formatBudgetGBP(selected.budget_min, selected.budget_max)}</p>
          )}
          <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--slate-600)' }}>{selected.description?.slice(0, 500)}</p>
          {selected.skills_required && selected.skills_required.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {selected.skills_required.map(sk => (
                <span key={sk} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-dim)' }}>{sk}</span>
              ))}
            </div>
          )}
          {selected.source_url && (
            <a href={selected.source_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold mt-4 px-4 py-2 rounded-lg"
              style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>
              <i className="ti ti-external-link" /> View Original
            </a>
          )}
        </aside>
      )}
    </div>
  )
}
