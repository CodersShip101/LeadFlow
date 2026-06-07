'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile } from '@/types'

const today = new Date()
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getCalendarDays() {
  const y = today.getFullYear(), m = today.getMonth()
  const first = new Date(y, m, 1).getDay()
  const total = new Date(y, m + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < first; i++) days.push(null)
  for (let d = 1; d <= total; d++) days.push(d)
  return { month: months[m], year: y, days }
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getSourceInfo(url: string | null) {
  if (!url) return { label: 'Remote', color: '#7C3AED', bg: '#F0EFFE' }
  if (url.includes('reddit')) return { label: 'Reddit', color: '#D97706', bg: '#FEF3E2' }
  if (url.includes('remotive')) return { label: 'Remotive', color: '#1B6B4A', bg: '#EBF5F0' }
  if (url.includes('weworkremotely')) return { label: 'WWR', color: '#2563EB', bg: '#EBF1FC' }
  return { label: 'Remote', color: '#7C3AED', bg: '#F0EFFE' }
}

function formatBudget(min: number | null, max: number | null) {
  if (!min && !max) return null
  if (min && max) return `$${min}-${max}`
  if (min) return `From $${min}`
  return `Up to $${max}`
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSkill, setFilterSkill] = useState('')
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const cal = useMemo(() => getCalendarDays(), [])

  const isFree = profile?.subscription_status === 'free'
  const visibleLeads = isFree ? leads.slice(0, 3) : leads

  const filteredLeads = useMemo(() => {
    return visibleLeads.filter((lead) => {
      if (filterSkill && lead.skills_required) {
        const match = lead.skills_required.some((s) =>
          s.toLowerCase().includes(filterSkill.toLowerCase())
        )
        if (!match) return false
      }
      if (filterType && lead.project_type !== filterType) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!lead.title.toLowerCase().includes(q) && !lead.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [visibleLeads, filterSkill, filterType, searchQuery])

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => Date.now() - new Date(l.posted_date).getTime() < 86400000).length,
    applied: 0,
    saved: leads.filter(l => l.budget_min && l.budget_min > 500).length,
  }), [leads])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(profile)
      const { data: leads } = await supabase.from('leads').select('*').eq('status', 'active').order('posted_date', { ascending: false })
      setLeads(leads || [])
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const allSkills = useMemo(() => {
    const s = new Set<string>()
    leads.forEach(l => l.skills_required?.forEach(sk => s.add(sk)))
    return Array.from(s).slice(0, 10)
  }, [leads])

  const greeting = () => {
    const h = today.getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="animate-spin h-8 w-8 border-4 rounded-full" style={{ borderColor: '#1B6B4A', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F3F7', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-[210px] bg-white border-r shrink-0 flex flex-col" style={{ borderColor: '#ECEEF2' }}>
        <div className="flex items-center gap-2 px-5 h-16 border-b" style={{ borderColor: '#ECEEF2' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1B6B4A' }}>L</div>
          <span className="text-base font-semibold" style={{ color: '#1A1D23' }}>LeadFlow</span>
        </div>
        <nav className="flex-1 px-3 pt-6 space-y-1">
          {[
            { label: 'Dashboard', icon: '⊞', active: true },
            { label: 'Leads', icon: '⚡', count: leads.length },
            { label: 'Applications', icon: '📋' },
            { label: 'Messages', icon: '✉' },
            { label: 'Calendar', icon: '📅' },
            { label: 'Settings', icon: '⚙' },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors"
              style={{
                background: item.active ? '#EBF5F0' : 'transparent',
                color: item.active ? '#1B6B4A' : '#6B7280',
                fontWeight: item.active ? 500 : 400,
              }}
              onMouseEnter={e => { if (!item.active) e.currentTarget.style.background = '#F5F5F7' }}
              onMouseLeave={e => { if (!item.active) e.currentTarget.style.background = 'transparent' }}
            >
              <span className="text-base opacity-70">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.count !== undefined && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ background: '#1B6B4A' }}>{item.count}</span>
              )}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-5 py-4 border-t" style={{ borderColor: '#ECEEF2' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium" style={{ background: '#1B6B4A' }}>
            {(profile?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate" style={{ color: '#1A1D23' }}>{profile?.email?.split('@')[0] || 'User'}</div>
            <div className="text-xs" style={{ color: '#AAB0BB' }}>{isFree ? 'Free' : 'Pro'}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-8 h-16 bg-white border-b shrink-0" style={{ borderColor: '#ECEEF2' }}>
          <div className="flex-1">
            <div className="text-sm font-medium" style={{ color: '#6B7280' }}>{greeting()}, {profile?.email?.split('@')[0] || 'there'}</div>
            <div className="text-xs" style={{ color: '#AAB0BB' }}>{days[today.getDay()]}, {months[today.getMonth()]} {today.getDate()}</div>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-56 rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: '#ECEEF2', background: '#F2F3F7', color: '#1A1D23' }}
            />
          </div>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#ECEEF2', background: '#F2F3F7', color: '#6B7280' }}
          >
            <option value="">All types</option>
            <option value="one-off">One-off</option>
            <option value="ongoing">Ongoing</option>
          </select>
          <select
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#ECEEF2', background: '#F2F3F7', color: '#6B7280' }}
          >
            <option value="">All budgets</option>
          </select>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
            style={{ background: '#1B6B4A' }}
          >
            ↻ Refresh leads
          </button>
        </header>

        {/* Stats row */}
        <div className="flex gap-px px-8 pt-6 bg-[#F2F3F7]">
          {[
            { label: 'Total Leads', value: stats.total, icon: '⚡', bg: '#EBF5F0', color: '#1B6B4A' },
            { label: 'New Today', value: stats.new, icon: '🆕', bg: '#EBF1FC', color: '#2563EB' },
            { label: 'Applied', value: stats.applied, icon: '✓', bg: '#FEF3E2', color: '#D97706' },
            { label: 'Saved', value: stats.saved, icon: '☆', bg: '#F0EFFE', color: '#7C3AED' },
          ].map((stat) => (
            <div key={stat.label} className="flex-1 bg-white rounded-lg p-4 flex items-center gap-3" style={{ border: '1px solid #ECEEF2' }}>
              <div className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-sm" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
              <div>
                <div className="text-xl font-semibold" style={{ color: '#1A1D23' }}>{stat.value}</div>
                <div className="text-xs" style={{ color: '#AAB0BB' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Lead cards */}
        <div className="flex-1 overflow-y-auto px-8 pt-4 pb-8 space-y-3">
          {filteredLeads.length === 0 ? (
            <div className="text-center py-20" style={{ color: '#AAB0BB' }}>
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-sm font-medium">No leads match your filters</div>
              <div className="text-xs mt-1">Try adjusting your search or check back later</div>
            </div>
          ) : (
            filteredLeads.map((lead, index) => {
              const source = getSourceInfo(lead.source_url)
              const isLocked = isFree && index >= 3
              return (
                <div
                  key={lead.id}
                  className="bg-white rounded-xl p-4 transition-all"
                  style={{
                    border: '1px solid #ECEEF2',
                    opacity: isLocked ? 0.4 : 1,
                    filter: isLocked ? 'blur(0.5px)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isLocked) { e.currentTarget.style.borderColor = '#D0D4DE'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' } }}
                  onMouseLeave={e => { if (!isLocked) { e.currentTarget.style.borderColor = '#ECEEF2'; e.currentTarget.style.boxShadow = 'none' } }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium shrink-0" style={{ background: source.bg, color: source.color }}>{source.label[0]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold truncate" style={{ color: '#1A1D23' }}>{isLocked ? 'Pro Lead' : lead.title}</h3>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>{(lead.budget_min && lead.budget_max) ? '⭐'.repeat(3) : '⭐'}</span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: isLocked ? '#AAB0BB' : '#6B7280' }}>
                        {isLocked ? '████████████████████████████████████████████████████████████' : lead.description}
                      </p>
                      {!isLocked && (
                        <>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {formatBudget(lead.budget_min, lead.budget_max) && (
                              <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#F2F3F7', color: '#6B7280' }}>{formatBudget(lead.budget_min, lead.budget_max)}</span>
                            )}
                            {lead.client_location && (
                              <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#F2F3F7', color: '#6B7280' }}>{lead.client_location}</span>
                            )}
                            {lead.project_type && (
                              <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: '#F2F3F7', color: '#6B7280' }}>{lead.project_type}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {lead.skills_required?.slice(0, 4).map(skill => (
                              <span key={skill} className="text-[11px] px-2 py-0.5 rounded font-medium" style={{ background: '#EBF1FC', color: '#2563EB' }}>{skill}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!isLocked && (
                        <>
                          <button className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors" style={{ borderColor: '#1B6B4A', color: '#1B6B4A' }}>Interested</button>
                          <button className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors" style={{ background: '#F2F3F7', color: '#6B7280' }}>View</button>
                        </>
                      )}
                      <span className="text-[11px] whitespace-nowrap" style={{ color: '#AAB0BB' }}>{timeAgo(lead.posted_date)}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}

          {/* Free gate */}
          {isFree && leads.length > 3 && (
            <div className="rounded-xl p-6 text-white text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B6B4A 0%, #2563EB 100%)' }}>
              <div className="relative z-10">
                <div className="text-2xl mb-2">🔒</div>
                <div className="text-lg font-semibold">{leads.length - 3} more leads on Pro</div>
                <div className="text-sm mt-1 opacity-80">Upgrade to see all leads with full details</div>
                <button
                  onClick={() => router.push('/dashboard/billing')}
                  className="mt-4 px-6 py-2.5 bg-white text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
                  style={{ color: '#1B6B4A' }}
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <aside className="w-[220px] bg-white border-l shrink-0 flex flex-col overflow-y-auto" style={{ borderColor: '#ECEEF2' }}>
        {/* Calendar */}
        <div className="p-4 border-b" style={{ borderColor: '#ECEEF2' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: '#1A1D23' }}>{cal.month} {cal.year}</span>
            <div className="flex gap-1 text-xs" style={{ color: '#AAB0BB' }}>
              <button>‹</button>
              <button className="ml-2">›</button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0 text-center mb-1">
            {['S','M','T','W','T','F','S'].map(d => (
              <span key={d} className="text-[10px] py-1" style={{ color: '#AAB0BB' }}>{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0 text-center">
            {cal.days.map((d, i) => (
              <span
                key={i}
                className="text-xs py-1 rounded"
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
        <div className="p-4 border-b" style={{ borderColor: '#ECEEF2' }}>
          <div className="text-sm font-semibold mb-3" style={{ color: '#1A1D23' }}>Recent Activity</div>
          <div className="space-y-3">
            {[
              { text: 'New leads scraped', time: '2h ago', color: '#1B6B4A' },
              { text: 'Pro plan activated', time: '1d ago', color: '#2563EB' },
              { text: 'Profile updated', time: '2d ago', color: '#D97706' },
            ].map((act, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: act.color }} />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate" style={{ color: '#1A1D23' }}>{act.text}</div>
                  <div className="text-[10px]" style={{ color: '#AAB0BB' }}>{act.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skill filters */}
        <div className="p-4">
          <div className="text-sm font-semibold mb-3" style={{ color: '#1A1D23' }}>Skills</div>
          <div className="flex flex-wrap gap-1.5">
            {allSkills.map(skill => (
              <button
                key={skill}
                onClick={() => setFilterSkill(filterSkill === skill ? '' : skill)}
                className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all"
                style={{
                  background: filterSkill === skill ? '#1B6B4A' : '#F2F3F7',
                  color: filterSkill === skill ? 'white' : '#6B7280',
                }}
              >{skill}</button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
