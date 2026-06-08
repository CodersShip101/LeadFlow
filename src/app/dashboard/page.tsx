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
import {
  Trophy, RefreshCw, Search, X, Filter, Sparkles,
  ChevronLeft, ChevronRight,
  Send, Lock, Bookmark, AlertTriangle
} from 'lucide-react'

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
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<number>(() => typeof window !== 'undefined' ? parseInt(localStorage.getItem('lr') || '0') : 0)
  const [upgradeModal, setUpgradeModal] = useState(false)
  const [limitModal, setLimitModal] = useState(false)
  const [showMobileSearch, setShowMobileSearch] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const cal = useMemo(() => getCalendarDays(), [])

  const isFree = profile?.subscription_status === 'free'

  const appMap = useMemo(() => {
    const m = new Map<string, Application>()
    applications.forEach(a => m.set(a.lead_id, a))
    return m
  }, [applications])

  const sortedLeads = useMemo(() =>
    [...leads].sort((a, b) => {
      const da = new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
      if (da !== 0) return da
      return computeQualityScore(b) - computeQualityScore(a)
    }), [leads])

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

  const doRefresh = useCallback(async () => {
    const now = Date.now()
    if (now - lastRefresh < 3600000) {
      const m = Math.ceil((3600000 - (now - lastRefresh)) / 60000)
      toast.error(`${m}min until next refresh`); return
    }
    setRefreshing(true)
    try {
      const r = await fetch('/api/scrape-leads', { method: 'POST' })
      const d = await r.json()
      if (d.inserted > 0) toast.success(`${d.inserted} new leads`)
      else toast.success('Up to date')
      localStorage.setItem('lr', String(now))
      setLastRefresh(now)
      const { data: l } = await supabase.from('leads').select('*').eq('status', 'active').order('posted_date', { ascending: false })
      setLeads((l || []).filter(lead => isUKLead(lead.client_location, lead.source_url)))
    } catch { toast.error('Failed') }
    setRefreshing(false)
  }, [lastRefresh, supabase])

  const allSkills = useMemo(() => {
    const s = new Set<string>()
    leads.forEach(l => l.skills_required?.forEach(sk => s.add(sk)))
    return Array.from(s).sort().slice(0, 12)
  }, [leads])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="animate-spin h-8 w-8 border-4 rounded-full" style={{ borderColor: '#1B6B4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <>
      {/* Topbar */}
      <header className="flex items-center gap-3 px-4 md:px-8 h-14 bg-white border-b shrink-0" style={{ borderColor: '#ECEEF2' }}>
        <div className="flex-1 hidden md:block">
          <div className="text-sm font-medium" style={{ color: '#6B7280' }}>
            {(() => { const h = today.getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()}, {profile?.email?.split('@')[0] || 'there'}
          </div>
          <div className="text-xs" style={{ color: '#AAB0BB' }}>{days[today.getDay()]}, {months[today.getMonth()]} {today.getDate()}</div>
        </div>

        {/* Search */}
        <div className={`relative ${showMobileSearch ? 'flex-1' : 'w-auto'} md:flex-1 md:max-w-[220px]`}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: '#AAB0BB' }} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className={`${showMobileSearch ? 'w-full' : 'w-0 md:w-full'} md:w-full rounded-lg border pl-8 pr-2 py-1.5 text-xs outline-none transition-all`}
            style={{ borderColor: '#ECEEF2', background: '#F5F5F7', color: '#1A1D23' }}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={12} style={{ color: '#AAB0BB' }} /></button>}
        </div>
        <button className="md:hidden p-1 rounded" style={{ color: '#6B7280' }} onClick={() => setShowMobileSearch(!showMobileSearch)}>
          <Search size={15} />
        </button>

        {/* Filters */}
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="hidden sm:block rounded-lg border px-2 py-1.5 text-xs outline-none" style={{ borderColor: '#ECEEF2', background: '#F5F5F7', color: '#6B7280' }}>
          <option value="">Type</option>
          <option value="contract">Contract</option>
          <option value="one-off">One-off</option>
          <option value="ongoing">Ongoing</option>
        </select>
        <select value={budgetFilter} onChange={e => setBudgetFilter(e.target.value)}
          className="hidden sm:block rounded-lg border px-2 py-1.5 text-xs outline-none" style={{ borderColor: '#ECEEF2', background: '#F5F5F7', color: '#6B7280' }}>
          <option value="">Budget</option>
          <option value="500">£500+</option>
          <option value="1000">£1k+</option>
          <option value="2500">£2.5k+</option>
          <option value="5000">£5k+</option>
        </select>
        <button onClick={doRefresh} disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-60 transition-opacity hover:opacity-90"
          style={{ background: '#1B6B4A' }}>
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">{refreshing ? '' : 'Refresh'}</span>
        </button>
      </header>

      {/* Stat cards */}
      <div className="flex gap-3 px-4 md:px-8 pt-5 overflow-x-auto">
        {[
          { label: 'New today', value: stats.new, icon: Sparkles, bg: '#EBF5F0', color: '#1B6B4A', trend: stats.new > 0 ? `↑ ${stats.new}` : null },
          { label: 'Applied', value: stats.applied, icon: Send, bg: '#EBF1FC', color: '#2563EB', trend: null },
          { label: 'Saved', value: stats.saved, icon: Bookmark, bg: '#FEF3E2', color: '#D97706', trend: null },
          { label: 'Won', value: stats.won, icon: Trophy, bg: '#F0EFFE', color: '#7C3AED', trend: null },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="flex items-center gap-3 bg-white rounded-xl p-4 flex-1 min-w-[130px]" style={{ border: '1px solid #ECEEF2' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.color }}>
                <Icon size={18} />
              </div>
              <div>
                <div className="text-[22px] font-bold leading-none" style={{ color: '#1A1D23', fontWeight: 700 }}>{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: '#AAB0BB' }}>{s.label}</div>
                {s.trend && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>{s.trend}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Skill filter chips */}
      {allSkills.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 md:px-8 pt-4 overflow-x-auto scrollbar-hide">
          {allSkills.map(s => (
            <button key={s} onClick={() => setFilterSkill(filterSkill === s ? '' : s)}
              className="text-[10px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-all shrink-0"
              style={{
                background: filterSkill === s ? '#1B6B4A' : '#F5F5F7',
                color: filterSkill === s ? 'white' : '#6B7280',
              }}
            >{s}</button>
          ))}
          {(searchQuery || filterSkill || filterType || budgetFilter) && (
            <button onClick={() => { setSearchQuery(''); setFilterSkill(''); setFilterType(''); setBudgetFilter('') }}
              className="text-[10px] px-2 py-1 rounded-full whitespace-nowrap shrink-0" style={{ color: '#6B7280' }}>Clear</button>
          )}
        </div>
      )}

      {/* Lead cards + Right panel wrapper */}
      <div className="flex-1 flex min-h-0">
        {/* Lead cards */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-4 pb-20 md:pb-8 space-y-2">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20" style={{ color: '#AAB0BB' }}>
              <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-3" style={{ background: '#F5F5F7' }}>
                <Filter size={20} />
              </div>
              <div className="text-sm font-semibold" style={{ color: '#6B7280' }}>
                {searchQuery || filterSkill || filterType || budgetFilter ? 'No matches found' :
                 'No leads yet'}
              </div>
              <div className="text-xs mt-1" style={{ color: '#AAB0BB' }}>
                {searchQuery || filterSkill || filterType || budgetFilter ? 'Try adjusting your filters' :
                 'Leads will appear here once scraped'}
              </div>
              {searchQuery || filterSkill || filterType || budgetFilter ? (
                <button onClick={() => { setSearchQuery(''); setFilterSkill(''); setFilterType(''); setBudgetFilter('') }}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#1B6B4A' }}>Clear filters</button>
              ) : (
                <button onClick={doRefresh} disabled={refreshing}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: '#1B6B4A' }}>Refresh leads</button>
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

              {/* Upgrade banner for free users */}
              {isFree && leads.length > 3 && (
                <div className="rounded-xl px-5 py-4 flex items-center gap-4" style={{ background: 'linear-gradient(90deg, #EBF5F0, #EBF1FC)', border: '1px solid #BBE0CE' }}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1B6B4A' }}>
                    <Lock size={16} color="white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: '#1A1D23' }}>{leads.length - 3} more leads on Pro</div>
                    <div className="text-xs" style={{ color: '#6B7280' }}>Upgrade to see all leads with full details</div>
                  </div>
                  <button onClick={() => router.push('/dashboard/billing')}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-white shrink-0 transition-opacity hover:opacity-90"
                    style={{ background: '#1B6B4A' }}>Upgrade</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Panel */}
        <aside className="hidden xl:block w-[220px] border-l shrink-0 flex flex-col overflow-y-auto" style={{ borderColor: '#ECEEF2', background: '#F2F3F7' }}>
          {/* Calendar */}
          <div className="p-4 bg-white m-3 mb-0 rounded-xl" style={{ border: '1px solid #ECEEF2' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: '#1A1D23' }}>{cal.month} {cal.year}</span>
              <div className="flex gap-1" style={{ color: '#AAB0BB' }}>
                <button className="p-0.5"><ChevronLeft size={13} /></button>
                <button className="p-0.5"><ChevronRight size={13} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0 text-center mb-1">
              {['S','M','T','W','T','F','S'].map(d => (
                <span key={d} className="text-[10px] py-1" style={{ color: '#AAB0BB' }}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-0 text-center">
              {cal.days.map((d, i) => (
                <span key={i} className="text-xs py-1 rounded"
                  style={{
                    color: d === today.getDate() ? 'white' : d ? '#1A1D23' : 'transparent',
                    background: d === today.getDate() ? '#1B6B4A' : 'transparent',
                    fontWeight: d === today.getDate() ? 600 : 400,
                  }}
                >{d || ''}</span>
              ))}
            </div>
          </div>

          {/* Recent activity */}
          <div className="p-4 bg-white mx-3 mb-0 rounded-xl" style={{ border: '1px solid #ECEEF2' }}>
            <div className="text-xs font-semibold mb-3" style={{ color: '#1A1D23' }}>Recent Activity</div>
            <div className="space-y-2.5">
              {[
                { text: 'New leads scraped', time: '2h ago', dot: '#1B6B4A' },
                { text: 'Profile updated', time: '1d ago', dot: '#2563EB' },
                { text: 'Lead interested', time: '2d ago', dot: '#D97706' },
              ].map((act, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: act.dot }} />
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium truncate" style={{ color: '#1A1D23' }}>{act.text}</div>
                    <div className="text-[10px]" style={{ color: '#AAB0BB' }}>{act.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Skills */}
          <div className="p-4 bg-white mx-3 mb-3 rounded-xl" style={{ border: '1px solid #ECEEF2' }}>
            <div className="text-xs font-semibold mb-3" style={{ color: '#1A1D23' }}>Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {allSkills.map(s => (
                <button key={s} onClick={() => setFilterSkill(filterSkill === s ? '' : s)}
                  className="text-[10px] px-2 py-1 rounded-lg font-medium transition-all"
                  style={{
                    background: filterSkill === s ? '#1B6B4A' : '#F5F5F7',
                    color: filterSkill === s ? 'white' : '#6B7280',
                  }}
                >{s}</button>
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
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white mb-2 transition-opacity hover:opacity-90" style={{ background: '#1B6B4A' }}>Upgrade</button>
            <button onClick={() => setLimitModal(false)}
              className="w-full py-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-50" style={{ color: '#6B7280' }}>Later</button>
          </div>
        </div>
      )}
    </>
  )
}
