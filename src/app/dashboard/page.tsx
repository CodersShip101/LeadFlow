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
import { Loader2, AlertTriangle } from 'lucide-react'

const today = new Date()
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getCalendarDays() {
  const y = today.getFullYear(), m = today.getMonth()
  const first = new Date(y, m, 1).getDay()
  const total = new Date(y, m + 1, 0).getDate()
  const daysArr: (number | null)[] = []
  for (let i = 0; i < first; i++) daysArr.push(null)
  for (let d = 1; d <= total; d++) daysArr.push(d)
  const pad = 7 - ((first + total) % 7 || 7)
  for (let i = 0; i < pad; i++) daysArr.push(null)
  return { month: months[m], year: y, days: daysArr }
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSkill, setFilterSkill] = useState('')
  const [filterType, setFilterType] = useState('')
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
  const cal = useMemo(() => getCalendarDays(), [])

  const isFree = profile?.subscription_status === 'free'

  const appMap = useMemo(() => {
    const m = new Map<string, Application>()
    applications.forEach(a => m.set(a.lead_id, a))
    return m
  }, [applications])

  const sortedLeads = useMemo(() => {
    const copy = [...leads]
    switch (sortBy) {
      case 'newest':
        return copy.sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime())
      case 'match':
        return copy.sort((a, b) => computeQualityScore(b) - computeQualityScore(a))
      case 'budget':
        return copy.sort((a, b) => (b.budget_max || 0) - (a.budget_max || 0))
    }
  }, [leads, sortBy])

  const visible = isFree ? sortedLeads.slice(0, 3) : sortedLeads

  const filteredLeads = useMemo(() => {
    return visible.filter((lead) => {
      if (filterSkill && lead.skills_required) {
        if (!lead.skills_required.some(s => s.toLowerCase().includes(filterSkill.toLowerCase()))) return false
      }
      if (filterType && lead.project_type !== filterType) return false
      if (budgetFilter && (lead.budget_min || 0) < parseInt(budgetFilter)) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!lead.title.toLowerCase().includes(q) && !lead.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [visible, filterSkill, filterType, budgetFilter, searchQuery])

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

  // Calendar: days that have lead activity
  const leadDays = useMemo(() => {
    const s = new Set<number>()
    leads.forEach(l => {
      const d = new Date(l.posted_date)
      if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
        s.add(d.getDate())
      }
    })
    return s
  }, [leads])

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
    if (isFree && applications.filter(a => (a.status === 'interested' || a.status === 'applied' || a.status === 'hired') && new Date(a.created_at) >= new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay() + 1)).length >= 3) {
      setLimitModal(true); return
    }
    updateApp(id, 'interested')
    toast.success('Added')
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

  // Build activity feed from real applications + scrapes
  const activities = useMemo(() => {
    const acts: { icon: string; color: string; text: string; time: string }[] = []
    if (leads.length > 0) {
      acts.push({
        icon: 'ti-sparkles', color: 'g',
        text: `<strong>${leads.length} active leads</strong> across sources`,
        time: `${leads.length} total`,
      })
    }
    applications
      .filter(a => a.status === 'interested' || a.status === 'applied')
      .slice(0, 3)
      .forEach(a => {
        const lead = leads.find(l => l.id === a.lead_id)
        acts.push({
          icon: a.status === 'applied' ? 'ti-send' : 'ti-heart',
          color: a.status === 'applied' ? 'a' : 'a',
          text: `${a.status === 'applied' ? 'Applied to' : 'Interested in'} <strong>${lead?.title?.slice(0, 40) || 'a lead'}</strong>`,
          time: timeAgoShort(a.created_at),
        })
      })
    if (acts.length === 0) {
      acts.push({ icon: 'ti-info-circle', color: 'b', text: 'No activity yet', time: '' })
    }
    return acts
  }, [applications, leads])

  // Next hidden lead for upgrade tease
  const nextHiddenLead = useMemo(() => {
    if (!isFree || leads.length <= 3) return null
    return leads[3]
  }, [isFree, leads])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="animate-spin h-8 w-8 border-4 rounded-full" style={{ borderColor: '#1B6B4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <>
      {/* ── PAGE HEADER ── */}
      <div className="flex items-end justify-between px-4 md:px-8 pt-6 pb-2">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight leading-none" style={{ color: '#1A1D23', letterSpacing: '-0.03em' }}>
            Your <span style={{ color: '#1B6B4A' }}>leads</span>
          </h1>
          <div className="text-xs mt-1.5" style={{ color: '#AAB0BB' }}>
            {days[today.getDay()]}, {today.getDate()} {months[today.getMonth()]} · {leads.length} active · last scraped {timeAgoShort(lastRefresh || undefined)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost-sm" onClick={() => {}}><i className="ti ti-adjustments-horizontal" /> Filters</button>
          <button className="btn-primary-sm" onClick={() => doRefresh(false)} disabled={refreshing}>
            <i className={`ti ti-refresh ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Scraping...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── SCRAPE STRIP ── */}
      <div className="mx-4 md:mx-8 mt-3 flex items-center gap-2.5 bg-white rounded-lg px-4 py-2" style={{ border: '1px solid #ECEEF2' }}>
        <i className="ti ti-radar" style={{ fontSize: '14px', color: '#1B6B4A' }} />
        <div className="flex items-center gap-1.5">
          {['Reddit', 'Reed', 'Remotive', 'WWR', 'Indeed', 'CWJobs'].map((s, i) => (
            <span key={s} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${i < 4 ? 'dot-done' : i === 4 ? 'dot-active' : 'dot-wait'}`}>
              {s}
            </span>
          ))}
        </div>
        <div className="flex-1 h-1.5 rounded-full" style={{ background: '#ECEEF2' }}>
          <div className="h-1.5 rounded-full transition-all" style={{ background: '#1B6B4A', width: '66%' }} />
        </div>
        <span className="text-[11px]" style={{ color: '#AAB0BB' }}>5 of 6 · {leads.length} found</span>
      </div>

      {/* ── STAT CARDS with sparklines ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 md:px-8 mt-4">
        {[
          { label: 'New today', value: stats.new, spark: 'M2 22 L10 18 L18 20 L26 14 L34 16 L42 8 L50 10 L58 4', color: '#1B6B4A', delta: stats.new > 0 ? `+${stats.new} vs yesterday` : null },
          { label: 'Applied', value: stats.applied, spark: 'M2 20 L10 20 L18 16 L26 16 L34 12 L42 12 L50 12 L58 8', color: '#2563EB', delta: 'awaiting reply' },
          { label: 'Saved', value: stats.saved, spark: 'M2 24 L10 20 L18 18 L26 18 L34 14 L42 14 L50 10 L58 10', color: '#2563EB', delta: 'review backlog' },
          { label: 'Won this month', value: stats.won, spark: 'M2 26 L10 26 L18 26 L26 26 L34 14 L42 14 L50 14 L58 14', color: '#1B6B4A', delta: stats.won > 0 ? '£3,200 earned' : null },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4" style={{ border: '1px solid #ECEEF2' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#AAB0BB' }}>{s.label}</div>
            <div className="flex items-end justify-between mt-1">
              <span className="text-[30px] font-serif leading-none tracking-tight" style={{ color: s.value > 0 ? s.color : '#1A1D23', fontFamily: 'var(--font-serif)' }}>
                {s.value}
              </span>
              <svg className="w-[60px] h-[28px]" viewBox="0 0 60 28" preserveAspectRatio="none">
                <path d={s.spark} stroke={s.color} opacity=".6" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {s.delta && (
              <div className="flex items-center gap-1 mt-1 text-[10.5px]" style={{ color: s.color === '#1B6B4A' ? '#1B6B4A' : '#AAB0BB' }}>
                {s.delta === 'awaiting reply' ? null : s.delta?.startsWith('+') ? <i className="ti ti-arrow-up" style={{ fontSize: '10px' }} /> : null}
                {s.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Section divider ── */}
      <div className="section-divider mx-4 md:mx-8 mt-5">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#AAB0BB' }}>Filters & sorting</span>
      </div>

      {/* ── FILTER ROW ── */}
      <div className="flex items-center gap-2 px-4 md:px-8 mt-3 flex-wrap">
        <div className="relative flex-1 max-w-[160px]">
          <i className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2" style={{ fontSize: '14px', color: '#AAB0BB', pointerEvents: 'none' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-full border pl-8 pr-3 py-1.5 text-xs outline-none transition-all"
            style={{ borderColor: '#ECEEF2', background: '#F5F5F7', color: '#1A1D23' }}
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`fpill flex items-center gap-1 ${showFilters || filterSkill || filterType || budgetFilter ? 'on' : ''}`}
        >
          <i className="ti ti-adjustments-horizontal" style={{ fontSize: '12px' }} />
          Filters
          {(filterSkill || filterType || budgetFilter) && <span className="text-[9px] font-bold ml-0.5">·</span>}
        </button>
        <div className="w-px h-4" style={{ background: '#ECEEF2' }} />
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="ml-auto rounded-full border px-3 py-1.5 text-xs outline-none cursor-pointer"
          style={{ borderColor: '#ECEEF2', background: '#F5F5F7', color: '#6B7280' }}>
          <option value="newest">Newest first</option>
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
          <div className="w-px h-4" style={{ background: '#ECEEF2' }} />
          <button className={`fpill ${filterType === 'contract' ? 'on' : ''}`} onClick={() => setFilterType(filterType === 'contract' ? '' : 'contract')}>
            Contract
          </button>
          <button className={`fpill ${budgetFilter === '500' ? 'on' : ''}`} onClick={() => setBudgetFilter(budgetFilter === '500' ? '' : '500')}>
            £500+
          </button>
        </div>
      )}

      {/* ── Section divider ── */}
      {filteredLeads.length > 0 && (
        <div className="section-divider mx-4 md:mx-8 mt-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#AAB0BB' }}>
            {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── LEAD CARDS + RIGHT PANEL ── */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-20 md:pb-8 space-y-1.5">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: '#AAB0BB' }}>
              <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-3" style={{ background: '#F5F5F7' }}>
                <i className="ti ti-filter" style={{ fontSize: '18px', color: '#AAB0BB' }} />
              </div>
              <div className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                {searchQuery || filterSkill || filterType || budgetFilter ? 'No matches found' : 'No leads yet'}
              </div>
              <div className="text-xs mt-1" style={{ color: '#AAB0BB' }}>
                {searchQuery || filterSkill || filterType || budgetFilter ? 'Try adjusting your filters' : 'Leads will appear here once scraped'}
              </div>
              {searchQuery || filterSkill || filterType || budgetFilter ? (
                <button onClick={() => { setSearchQuery(''); setFilterSkill(''); setFilterType(''); setBudgetFilter('') }}
                  className="btn-int on text-xs px-4 py-2 mt-4">Clear filters</button>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: '#AAB0BB' }}>
                  <Loader2 size={12} className="animate-spin" style={{ color: '#1B6B4A' }} />
                  AI is searching for UK leads...
                </div>
              )}
            </div>
          ) : (
            <>
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  profile={profile}
                  application={appMap.get(lead.id) || null}
                  isFreeUser={isFree}
                  index={sortedLeads.indexOf(lead)}
                  onBookmark={toggleBookmark}
                  onInterest={toggleInterest}
                  onUpgrade={() => setUpgradeModal(true)}
                />
              ))}

              {/* Contextual upgrade banner — teases the next hidden lead */}
              {isFree && leads.length > 3 && nextHiddenLead && (
                <div className="rounded-xl px-5 py-4 flex items-center gap-4 mt-2" style={{ border: '1px dashed #BBE0CE', background: 'linear-gradient(120deg, #F0FDF7, transparent 60%)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold" style={{ color: '#1A1D23' }}>
                      <strong style={{ color: '#1B6B4A' }}>{leads.length - 3} more leads</strong> hidden behind Pro
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                      Includes: <strong style={{ color: '#1A1D23' }}>{nextHiddenLead.title?.slice(0, 30)}</strong>
                      {nextHiddenLead.budget_max && <> · £{nextHiddenLead.budget_max}/day</>}
                      {' '}and {leads.length - 4} others
                    </div>
                  </div>
                  <button onClick={() => router.push('/dashboard/billing')}
                    className="btn-int on text-xs px-4 py-2 shrink-0">Unlock Pro →</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── RIGHT PANEL ── */}
        <aside className="hidden xl:block w-[220px] border-l shrink-0 overflow-y-auto" style={{ borderColor: '#ECEEF2', background: '#F2F3F7' }}>
          {/* Calendar */}
          <div className="p-4 bg-white m-3 mb-0 rounded-xl" style={{ border: '1px solid #ECEEF2' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: '#1A1D23' }}>{cal.month} {cal.year}</span>
              <div className="flex gap-1" style={{ color: '#AAB0BB' }}>
                <button className="p-0.5"><i className="ti ti-chevron-left" style={{ fontSize: '14px' }} /></button>
                <button className="p-0.5"><i className="ti ti-chevron-right" style={{ fontSize: '14px' }} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0 text-center mb-1">
              {['M','T','W','T','F','S','S'].map(d => (
                <span key={d} className="text-[10px] py-1" style={{ color: '#AAB0BB' }}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0 text-center">
              {cal.days.map((d, i) => (
                <div key={i} className={`cday text-xs py-1 rounded relative ${d === today.getDate() ? 'today' : ''} ${d ? '' : 'empty'} ${d && leadDays.has(d) ? 'dot' : ''}`}
                  style={{
                    color: d === today.getDate() ? 'white' : d ? '#1A1D23' : 'transparent',
                  }}
                >{d || ''}</div>
              ))}
            </div>
          </div>

          {/* Skills cloud — progressive disclosure: show top 6, then "Show all" */}
          <div className="p-4 bg-white mx-3 mb-0 rounded-xl" style={{ border: '1px solid #ECEEF2' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#AAB0BB' }}>Filter by skill</div>
            <div className="flex flex-wrap gap-1.5">
              {(showMoreSkills ? allSkills : allSkills.slice(0, 6)).map(s => (
                <button key={s} onClick={() => setFilterSkill(filterSkill === s ? '' : s)}
                  className={`fpill text-[11px] px-2.5 py-1 ${filterSkill === s ? 'on' : ''}`}
                  style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '20px', border: '1px solid #ECEEF2', background: filterSkill === s ? '#EBF5F0' : 'transparent', color: filterSkill === s ? '#1B6B4A' : '#6B7280' }}
                >{s}</button>
              ))}
              {allSkills.length > 6 && !showMoreSkills && (
                <button onClick={() => setShowMoreSkills(true)}
                  className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors hover:opacity-80"
                  style={{ color: '#6B7280' }}>+{allSkills.length - 6} more</button>
              )}
              {showMoreSkills && allSkills.length > 6 && (
                <button onClick={() => setShowMoreSkills(false)}
                  className="text-[10px] font-medium px-2 py-1 rounded-full transition-colors hover:opacity-80"
                  style={{ color: '#6B7280' }}>Show less</button>
              )}
            </div>
          </div>

          {/* Real activity feed */}
          <div className="p-4 bg-white mx-3 mb-3 rounded-xl" style={{ border: '1px solid #ECEEF2' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#AAB0BB' }}>Recent activity</div>
            <div className="space-y-1">
              {activities.map((act, i) => (
                <div key={i} className="flex gap-2 py-1.5 items-start">
                  <div className={`aico ${act.color}`}><i className={`ti ${act.icon}`} style={{ fontSize: '13px' }} /></div>
                  <div className="min-w-0">
                    <div className="text-[12px]" style={{ color: '#6B7280', lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: act.text }} />
                    {act.time && <div className="text-[10px]" style={{ color: '#AAB0BB', marginTop: '1px' }}>{act.time}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      <UpgradeModal open={upgradeModal} onClose={() => setUpgradeModal(false)} />

      {limitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }} onClick={() => setLimitModal(false)}>
          <div className="bg-white rounded-xl max-w-xs w-full mx-4 shadow-xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#FEF3E2' }}>
              <AlertTriangle size={22} style={{ color: '#D97706' }} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: '#1A1D23' }}>Weekly limit reached</h3>
            <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Free users get 3 per week. Upgrade for unlimited.</p>
            <button onClick={() => { setLimitModal(false); router.push('/dashboard/billing') }}
              className="btn-int on text-sm w-full py-2.5 mb-2">Upgrade</button>
            <button onClick={() => setLimitModal(false)}
              className="w-full py-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-green-600" style={{ color: '#6B7280' }}>Later</button>
          </div>
        </div>
      )}
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
