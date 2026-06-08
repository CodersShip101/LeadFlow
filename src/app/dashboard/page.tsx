'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeQualityScore } from '@/types'
import { isUKLead } from '@/lib/utils'
import LeadCard from '@/components/LeadCard'
import UpgradeModal from '@/components/UpgradeModal'

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSkill, setFilterSkill] = useState('')
  const [budgetFilter, setBudgetFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'match' | 'budget'>('newest')
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('lr') || '0') : 0)
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [limitModal, setLimitModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showMoreSkills, setShowMoreSkills] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isFree = profile?.subscription_status === 'free'

  const appMap = useMemo(() => {
    const m = new Map<string, Application>()
    applications.forEach(a => m.set(a.lead_id, a))
    return m
  }, [applications])

  const sortedLeads = useMemo(() => {
    const copy = [...leads]
    switch (sortBy) {
      case 'newest': return copy.sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime())
      case 'match': return copy.sort((a, b) => computeQualityScore(b) - computeQualityScore(a))
      case 'budget': return copy.sort((a, b) => (b.budget_max || 0) - (a.budget_max || 0))
    }
  }, [leads, sortBy])

  const visible = isFree ? sortedLeads.slice(0, 3) : sortedLeads

  const filteredLeads = useMemo(() => {
    return visible.filter((lead) => {
      if (filterSkill && lead.skills_required) {
        if (!lead.skills_required.some(s => s.toLowerCase().includes(filterSkill.toLowerCase()))) return false
      }
      if (budgetFilter && (lead.budget_min || 0) < parseInt(budgetFilter)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!lead.title.toLowerCase().includes(q) && !lead.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [visible, filterSkill, budgetFilter, searchQuery])

  const stats = useMemo(() => {
    const applied = applications.filter(a => a.status === 'interested' || a.status === 'applied' || a.status === 'hired')
    const won = applications.filter(a => a.status === 'hired' || a.outcome === 'won')
    return {
      new: leads.filter(l => Date.now() - new Date(l.posted_date).getTime() < 86400000).length,
      applied: applied.length,
      saved: applications.filter(a => a.status === 'saved').length,
      won: won.length,
    }
  }, [leads, applications])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      const { data: l } = await supabase.from('leads').select('*').eq('status', 'active').order('posted_date', { ascending: false })
      setLeads((l || []).filter(lead => isUKLead(lead.client_location, lead.source_url)))
      const r = await fetch('/api/applications')
      if (r.ok) setApplications(await r.json())
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const updateApp = useCallback(async (leadId: string, status: string) => {
    const res = await fetch('/api/applications', {
      method: status === 'remove' ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, ...(status !== 'remove' ? { status } : {}) }),
    })
    if (res.ok) {
      if (status === 'remove') {
        setApplications(prev => prev.filter(a => a.lead_id !== leadId))
      } else {
        const app = await res.json()
        setApplications(prev => [...prev.filter(a => a.lead_id !== leadId), app])
      }
    }
  }, [])

  const toggleBookmark = useCallback((id: string) => {
    const a = appMap.get(id)
    if (a?.status === 'saved') { updateApp(id, 'remove'); toast.success('Removed') }
    else { updateApp(id, 'saved'); toast.success('Saved') }
  }, [appMap, updateApp])

  const toggleInterest = useCallback((id: string) => {
    const a = appMap.get(id)
    if (a && a.status !== 'saved') { updateApp(id, 'remove'); toast.success('Removed'); return }
    if (isFree && applications.filter(a => (a.status === 'interested' || a.status === 'applied' || a.status === 'hired')).length >= 3) {
      setLimitModal(true); return
    }
    updateApp(id, 'interested')
    toast.success('Added to pipeline')
  }, [appMap, updateApp, isFree, applications])

  const doRefresh = useCallback(async (silent = false) => {
    const now = Date.now()
    if (now - lastRefresh < 300000 && !silent) {
      const m = Math.ceil((300000 - (now - lastRefresh)) / 60000)
      toast.error(`${m}min until next refresh`); return
    }
    if (now - lastRefresh < 60000) return
    setRefreshing(true)
    try {
      const r = await fetch('/api/scrape-leads', { method: 'POST' })
      const d = await r.json()
      localStorage.setItem('lr', String(now))
      setLastRefresh(now)
      const { data: l } = await supabase.from('leads').select('*').eq('status', 'active').order('posted_date', { ascending: false })
      setLeads((l || []).filter(lead => isUKLead(lead.client_location, lead.source_url)))
      if (d.inserted > 0) { toast.success(`${d.inserted} new lead${d.inserted > 1 ? 's' : ''} found`) }
    } catch { /* ignore */ }
    setRefreshing(false)
  }, [lastRefresh, supabase])

  useEffect(() => {
    doRefresh(true)
    const interval = setInterval(() => doRefresh(true), 600000)
    const onFocus = () => doRefresh(true)
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus) }
  }, [])

  const allSkills = useMemo(() => {
    const s = new Set<string>()
    leads.forEach(l => l.skills_required?.forEach(sk => s.add(sk)))
    return Array.from(s).sort().slice(0, 12)
  }, [leads])

  const activities = useMemo(() => {
    const acts: { icon: string; color: string; text: string; time: string }[] = []
    if (leads.length > 0) {
      acts.push({ icon: 'ti-sparkles', color: 'g', text: `<strong>${leads.length} active leads</strong> across sources`, time: `${leads.length} total` })
    }
    applications.filter(a => a.status === 'interested' || a.status === 'applied').slice(0, 3).forEach(a => {
      const lead = leads.find(l => l.id === a.lead_id)
      acts.push({
        icon: a.status === 'applied' ? 'ti-send' : 'ti-heart',
        color: 'a',
        text: `${a.status === 'applied' ? 'Applied to' : 'Interested in'} <strong>${lead?.title?.slice(0, 40) || 'a lead'}</strong>`,
        time: timeAgoShort(a.created_at),
      })
    })
    if (acts.length === 0) {
      acts.push({ icon: 'ti-info-circle', color: 'b', text: 'No activity yet', time: '' })
    }
    return acts
  }, [applications, leads])

  const nextHiddenLead = useMemo(() => {
    if (!isFree || leads.length <= 3) return null
    return leads[3]
  }, [isFree, leads])

  if (loading) return (
    <div className="pb-20 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="px-4 md:px-8 pt-6 pb-2">
        <div className="h-7 w-40 skel" />
        <div className="h-3 w-52 rounded mt-2 skel" />
      </div>
      <div className="flex gap-2 px-4 md:px-8 mt-4 overflow-x-auto pb-2">
        {[1,2,3,4].map(i => <div key={i} className="shrink-0 w-[160px] h-[72px] rounded-xl skel" />)}
      </div>
      <div className="px-4 md:px-8 mt-4 space-y-2">
        {[1,2,3].map(i => <div key={i} className="h-[120px] rounded-xl skel" />)}
      </div>
    </div>
  )

  return (
    <>
      <div className="flex items-end justify-between px-4 md:px-8 pt-6 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>Feed</h1>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            {leads.length} active · Last scraped {timeAgoShort(lastRefresh || undefined)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost-sm" onClick={() => setShowFilters(!showFilters)}>
            <i className="ti ti-adjustments-horizontal" /> Filters
          </button>
          <button className="btn-primary-sm" onClick={() => doRefresh(false)} disabled={refreshing}>
            <i className={`ti ti-refresh ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Scraping...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-8 mt-4">
        {[
          { label: 'New today', value: stats.new, color: '#059669' },
          { label: 'Applied', value: stats.applied, color: '#2563EB' },
          { label: 'Saved', value: stats.saved, color: '#7C3AED' },
          { label: 'Won', value: stats.won, color: '#1B6B4A' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>{s.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: s.value > 0 ? s.color : '#111827' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Scrape strip */}
      <div className="mx-4 md:mx-8 mt-4 flex items-center gap-3 card px-4 py-2.5">
        <i className="ti ti-radar" style={{ fontSize: '14px', color: '#059669' }} />
        <div className="flex items-center gap-1.5 flex-1">
          {['Reddit', 'Reed', 'Remotive', 'WWR', 'Indeed', 'CWJobs'].map((s, i) => (
            <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${i < 4 ? 'bg-[#ECFDF5] text-[#059669]' : i === 4 ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#9CA3AF]'}`}>
              {s}
            </span>
          ))}
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 ml-2">
            <div className="h-1.5 rounded-full transition-all" style={{ background: '#1B6B4A', width: '66%' }} />
          </div>
          <span className="text-[11px]" style={{ color: '#9CA3AF' }}>{leads.length} found</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 md:px-8 mt-4 flex-wrap">
        <div className="relative flex-1 max-w-[180px]">
          <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2" style={{ fontSize: '14px', color: '#9CA3AF', pointerEvents: 'none' }} />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search leads..."
            className="w-full rounded-lg border pl-8 pr-3 py-1.5 text-xs outline-none transition-all" 
            style={{ borderColor: '#E5E7EB', background: '#FFFFFF', color: '#111827' }} />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-lg border px-3 py-1.5 text-xs outline-none cursor-pointer"
          style={{ borderColor: '#E5E7EB', background: '#FFFFFF', color: '#6B7280' }}>
          <option value="newest">Newest</option>
          <option value="match">Best match</option>
          <option value="budget">Highest budget</option>
        </select>
      </div>

      {showFilters && (
        <div className="flex items-center gap-2 px-4 md:px-8 mt-2 flex-wrap animate-fade-in">
          {allSkills.slice(0, 4).map(s => (
            <button key={s} onClick={() => setFilterSkill(filterSkill === s ? '' : s)}
              className={`fpill ${filterSkill === s ? 'on' : ''}`}>{s}</button>
          ))}
          <button className={`fpill ${budgetFilter === '500' ? 'on' : ''}`} onClick={() => setBudgetFilter(budgetFilter === '500' ? '' : '500')}>
            £500+
          </button>
        </div>
      )}

      {/* Lead cards + right panel */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-24 md:pb-8 space-y-2">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: '#9CA3AF' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: '#F3F4F6' }}>
                <i className="ti ti-filter" style={{ fontSize: '18px', color: '#9CA3AF' }} />
              </div>
              <div className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                {searchQuery || filterSkill || budgetFilter ? 'No matches' : 'No leads yet'}
              </div>
              <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                {searchQuery || filterSkill || budgetFilter ? 'Try adjusting your filters' : 'Leads appear here once scraped'}
              </div>
              {searchQuery || filterSkill || budgetFilter ? (
                <button onClick={() => { setSearchQuery(''); setFilterSkill(''); setBudgetFilter('') }} className="btn-ghost-sm mt-4">
                  Clear filters
                </button>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#9CA3AF' }}>
                  <i className="ti ti-loader animate-spin" style={{ fontSize: '12px', color: '#059669' }} />
                  Searching for UK leads...
                </div>
              )}
            </div>
          ) : (
            <>
              {filteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} profile={profile} application={appMap.get(lead.id) || null}
                  isFreeUser={isFree} index={sortedLeads.indexOf(lead)}
                  onBookmark={toggleBookmark} onInterest={toggleInterest} onUpgrade={() => setUpgradeModal(true)} />
              ))}
              {isFree && leads.length > 3 && nextHiddenLead && (
                <div className="rounded-xl px-5 py-4 flex items-center gap-4 mt-3" style={{ border: '1px dashed #A7F3D0', background: 'linear-gradient(135deg, #F0FDF7, transparent 60%)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: '#111827' }}>
                      <span style={{ color: '#059669' }}>{leads.length - 3} more leads</span> behind Pro
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      Includes: <strong>{nextHiddenLead.title?.slice(0, 30)}</strong>
                      {nextHiddenLead.budget_max && <> · £{nextHiddenLead.budget_max}/day</>} and {leads.length - 4} others
                    </div>
                  </div>
                  <button onClick={() => router.push('/dashboard/billing')} className="btn-primary-sm">Unlock Pro →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right panel */}
        <aside className="hidden xl:block w-[240px] border-l shrink-0 overflow-y-auto" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
          <div className="p-4">
            <div className="card p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#9CA3AF' }}>Calendar</span>
                <div className="flex gap-1" style={{ color: '#9CA3AF' }}>
                  <button className="p-0.5 hover:text-gray-600"><i className="ti ti-chevron-left" style={{ fontSize: '14px' }} /></button>
                  <button className="p-0.5 hover:text-gray-600"><i className="ti ti-chevron-right" style={{ fontSize: '14px' }} /></button>
                </div>
              </div>
              <CalendarMini leadIds={new Set(leads.filter(l => {
                const d = new Date(l.posted_date)
                const now = new Date()
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
              }).map(l => new Date(l.posted_date).getDate()))} />
            </div>

            <div className="card p-4 mb-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {(showMoreSkills ? allSkills : allSkills.slice(0, 6)).map(s => (
                  <button key={s} onClick={() => setFilterSkill(filterSkill === s ? '' : s)}
                    className={`fpill ${filterSkill === s ? 'on' : ''}`}>{s}</button>
                ))}
                {allSkills.length > 6 && (
                  <button onClick={() => setShowMoreSkills(!showMoreSkills)}
                    className="text-[11px] font-medium min-h-[32px] px-3 rounded-full transition-all duration-150 hover:bg-gray-100 active:scale-[0.97]"
                    style={{ color: '#6B7280' }}>{showMoreSkills ? 'Less' : `+${allSkills.length - 6}`}</button>
                )}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Activity</div>
              <div className="space-y-1">
                {activities.map((act, i) => (
                  <div key={i} className="flex gap-2 py-1.5 items-start">
                    <div className={`aico ${act.color}`}><i className={`ti ${act.icon}`} style={{ fontSize: '13px' }} /></div>
                    <div className="min-w-0">
                      <div className="text-[12px]" style={{ color: '#6B7280', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: act.text }} />
                      {act.time && <div className="text-[10px]" style={{ color: '#9CA3AF', marginTop: '1px' }}>{act.time}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />

      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setLimitModal(false)}>
          <div className="bg-white rounded-2xl max-w-xs w-full shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp .3s ease' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FFFBEB' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '22px', color: '#D97706' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: '#111827' }}>Weekly limit reached</h3>
            <p className="text-xs mb-5" style={{ color: '#6B7280' }}>Free users get 3 per week. Upgrade for unlimited.</p>
            <button onClick={() => { setLimitModal(false); router.push('/dashboard/billing') }} className="btn-primary w-full justify-center mb-2">
              Upgrade to Pro
            </button>
            <button onClick={() => setLimitModal(false)} className="btn-ghost w-full justify-center">Dismiss</button>
          </div>
        </div>
      )}
    </>
  )
}

function CalendarMini({ leadIds }: { leadIds: Set<number> }) {
  const today = new Date()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const m = today.getMonth(), y = today.getFullYear()
  const first = new Date(y, m, 1).getDay()
  const total = new Date(y, m + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < first; i++) days.push(null)
  for (let d = 1; d <= total; d++) days.push(d)
  return (
    <>
      <div className="text-xs font-semibold mb-2" style={{ color: '#111827' }}>{months[m]} {y}</div>
      <div className="grid grid-cols-7 gap-0 text-center mb-1">
        {['M','T','W','T','F','S','S'].map(d => <span key={d} className="text-[10px] py-1" style={{ color: '#9CA3AF' }}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0 text-center">
        {days.map((d, i) => (
          <div key={i} className={`cday text-xs py-1 rounded relative ${d === today.getDate() ? 'today' : ''} ${d ? '' : 'empty'} ${d && leadIds.has(d) ? 'dot' : ''}`}
            style={{ color: d === today.getDate() ? 'white' : d ? '#111827' : 'transparent' }}>
            {d || ''}
          </div>
        ))}
      </div>
    </>
  )
}

function timeAgoShort(dateStr?: string | number) {
  if (!dateStr) return 'just now'
  const now = Date.now()
  const then = typeof dateStr === 'number' ? dateStr : new Date(dateStr).getTime()
  const diff = now - then
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
