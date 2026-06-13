'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead } from '@/lib/utils'
import ScoreBadge from '@/components/ScoreBadge'
import toast from 'react-hot-toast'

const sourceFilters = ['All', 'Reddit', 'Reed', 'WWR', 'Remote OK']
const scoreFilters = ['All', 'Score 8+', 'Score 7+', 'Saved', 'New'] as const
type ScoreFilter = typeof scoreFilters[number]

// Sources we advertise scanning, with their canonical labels from getSourceInfo
const trackedSources = [
  { key: 'Reddit', match: ['reddit'] },
  { key: 'Reed', match: ['reed'] },
  { key: 'WWR', match: ['weworkremotely', 'wwr'] },
  { key: 'Remote OK', match: ['remoteok', 'remote ok', 'remotive'] },
]

function freshness(lastScanMs: number | null): { status: 'healthy' | 'slow' | 'down'; text: string } {
  if (!lastScanMs) return { status: 'down', text: 'awaiting first scan' }
  const mins = Math.floor((Date.now() - lastScanMs) / 60000)
  const text = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
  if (mins > 720) return { status: 'slow', text }
  return { status: 'healthy', text }
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('All')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [newCount, setNewCount] = useState(0)
  const [viewed, setViewed] = useState<Set<string>>(new Set())
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
      try { setViewed(new Set(JSON.parse(localStorage.getItem('viewedLeads') || '[]'))) } catch { /* ignore */ }

      const res = await fetch('/api/applications')
      const apps: Application[] = res.ok ? await res.json() : []
      setApplications(apps)

      const { data: leadsData } = await supabase.from('leads').select('*').eq('status', 'active').gte('posted_date', new Date(Date.now() - 7 * 86400000).toISOString()).order('posted_date', { ascending: false })
      setLeads(leadsData || [])

      if (lastSeen > 0) {
        setNewCount((leadsData || []).filter(l => new Date(l.posted_date).getTime() > lastSeen).length)
      }
      setLoading(false)
      localStorage.setItem('lastSeen', Date.now().toString())
    }
    load()
  }, [supabase, router])

  const appMap = useMemo(() => new Map(applications.map(a => [a.lead_id, a])), [applications])

  // Last-scan time per source = newest lead from that source
  const sourceStatus = useMemo(() => trackedSources.map(s => {
    const newest = leads
      .filter(l => s.match.some(m => (l.source_url || '').toLowerCase().includes(m) || getSourceInfo(l.source_url).label.toLowerCase() === s.key.toLowerCase()))
      .reduce<number | null>((acc, l) => Math.max(acc || 0, new Date(l.posted_date).getTime()), null)
    return { key: s.key, ...freshness(newest) }
  }), [leads])

  const filtered = useMemo(() => leads.filter(l => {
    const app = appMap.get(l.id)
    const source = getSourceInfo(l.source_url)
    if (sourceFilter !== 'All' && source.label.toLowerCase() !== sourceFilter.toLowerCase()) return false
    const score = computeMatchExplanation(l, profile).score
    if (scoreFilter === 'Score 8+' && score < 8) return false
    if (scoreFilter === 'Score 7+' && score < 7) return false
    if (scoreFilter === 'Saved' && app?.status !== 'saved') return false
    if (scoreFilter === 'New' && !isNewLead(l.posted_date)) return false
    if (search) {
      const q = search.toLowerCase()
      return l.title.toLowerCase().includes(q) || l.description?.toLowerCase().includes(q) || l.client_location?.toLowerCase().includes(q)
    }
    return true
  }), [leads, appMap, sourceFilter, scoreFilter, search, profile])

  const limit = profile?.subscription_status === 'free' ? 5 : 100
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  const markViewed = (id: string) => {
    setViewed(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      localStorage.setItem('viewedLeads', JSON.stringify([...next]))
      return next
    })
  }

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
    markViewed(lead.id)
    router.push(`/dashboard/lead/${lead.id}`)
  }

  const openDetail = (lead: Lead) => { markViewed(lead.id); setSelected(lead) }

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-3" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading leads&hellip;</span>
      </div>
    </div>
  )

  const score7plus = leads.filter(l => computeMatchExplanation(l, profile).score >= 7).length
  const topScore = leads.reduce((m, l) => Math.max(m, computeMatchExplanation(l, profile).score), 0)

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      <div ref={containerRef} className="flex-1 overflow-y-auto dash-page">
        {/* Greeting */}
        <div className="dash-greet">
          <h1>Good to see you, {firstName} 👋</h1>
          <p>
            {newCount > 0
              ? <><span className="hl">{newCount} new lead{newCount > 1 ? 's' : ''}</span> since your last visit.</>
              : 'You’re all caught up — here’s your scored feed.'}
          </p>
        </div>

        {/* Metric tiles */}
        <div className="dash-stats">
          {[
            { label: 'This week', value: leads.length.toString(), color: 'var(--lime-deep)' },
            { label: 'Scored 7+', value: score7plus.toString(), color: 'var(--green-score)' },
            { label: 'Top score', value: topScore > 0 ? `${topScore}` : '—', color: 'var(--amber)' },
            { label: 'Saved', value: applications.filter(a => a.status === 'saved').length.toString(), color: 'var(--slate-500)' },
          ].map(s => (
            <div key={s.label} className="dash-stat">
              <div className="dash-stat-label">{s.label}</div>
              <div className="dash-stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Source status strip */}
        <div className="src-strip">
          {sourceStatus.map(s => (
            <div key={s.key} className="src-tile">
              <span className={`src-dot ${s.status}`} />
              <div className="src-tile-body">
                <div className="src-tile-name">{s.key}</div>
                <div className="src-tile-meta">Last scan: {s.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="dash-toolbar">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--slate-400)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" placeholder="Search leads&hellip;" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {scoreFilters.map(f => (
              <button key={f} onClick={() => setScoreFilter(f)} className={`dash-filter ${scoreFilter === f ? 'active' : 'inactive'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="dash-toolbar" style={{ marginTop: -8 }}>
          <div className="flex gap-1.5 flex-wrap">
            {sourceFilters.map(f => (
              <button key={f} onClick={() => setSourceFilter(f)} className={`dash-filter ${sourceFilter === f ? 'active' : 'inactive'}`}>{f}</button>
            ))}
          </div>
        </div>

        {/* First-run empty state */}
        {leads.length === 0 && (
          <div className="card text-center py-12 px-6 mt-2">
            <div className="auth-sent-icon" style={{ margin: '0 auto 16px' }}><i className="ti ti-radar" /></div>
            <p className="text-base font-semibold" style={{ color: 'var(--ink-900)' }}>We&apos;re scanning 4 sources for you now</p>
            <p className="text-sm mt-1.5 max-w-md mx-auto" style={{ color: 'var(--slate-500)' }}>
              Your first scored leads appear within 30 minutes — we&apos;ll email you the moment they&apos;re ready.
            </p>
            <button onClick={() => router.refresh()} className="btn-line btn-sm mt-4"><i className="ti ti-refresh" /> Check now</button>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-3">
          {filtered.slice(0, limit).map(lead => {
            const src = getSourceInfo(lead.source_url)
            const app = appMap.get(lead.id)
            const match = computeMatchExplanation(lead, profile)
            const applied = app && app.status !== 'saved'
            const saved = app?.status === 'saved'
            const isViewed = viewed.has(lead.id)
            const isNew = isNewLead(lead.posted_date)
            const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)

            return (
              <div key={lead.id} onClick={() => openDetail(lead)}
                className={`lead-card ${applied ? 'acted' : ''} ${isViewed && !applied ? 'viewed' : ''}`}>
                <div className="lead-card-top">
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: src.bg, color: src.color }}>{src.label}</span>
                  {applied ? <span className="lead-state st-applied">{app!.status === 'hired' ? 'Won' : app!.status}</span>
                    : saved ? <span className="lead-state st-saved">Saved</span>
                    : isViewed ? <span className="lead-state st-viewed">Viewed</span>
                    : isNew ? <span className="lead-state st-new">New</span> : null}
                  <div className="ml-auto flex items-center gap-1.5">
                    <ScoreBadge match={match} />
                    <span className="text-[10px]" style={{ color: 'var(--slate-400)' }}>{timeAgo(lead.posted_date)}</span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold leading-snug line-clamp-1" style={{ color: 'var(--ink-900)' }}>{lead.title}</h3>
                <p className="text-xs leading-relaxed line-clamp-2 mt-1" style={{ color: 'var(--slate-500)' }}>{lead.description}</p>

                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {budget && <span className="dash-badge-status" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>{budget}</span>}
                  {lead.client_location && <span className="text-[10px]" style={{ color: 'var(--slate-500)' }}><i className="ti ti-map-pin" /> {lead.client_location}</span>}
                  {lead.project_type && <span className="text-[10px]" style={{ color: 'var(--slate-500)' }}>{lead.project_type}</span>}
                </div>

                <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: '1px solid var(--slate-200)' }}>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {lead.skills_required?.slice(0, 3).map(sk => {
                      const m = profile?.skills?.some(ps => ps.toLowerCase() === sk.toLowerCase())
                      return <span key={sk} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: m ? 'rgba(196,240,0,.14)' : 'var(--slate-100)', color: m ? 'var(--lime-deep)' : 'var(--slate-500)', fontWeight: m ? 600 : 400 }}>{sk}</span>
                    })}
                    {(lead.skills_required?.length || 0) > 3 && <span className="text-[10px]" style={{ color: 'var(--slate-400)' }}>+{lead.skills_required!.length - 3}</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); handleSave(lead) }} className={`lead-iaction ${saved ? 'on' : ''}`} title={saved ? 'Saved' : 'Save'}>
                      <i className={`ti ${saved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: 14 }} />
                    </button>
                    {applied ? (
                      <span className="dash-badge-status text-center" style={{ background: 'rgba(22,163,74,.1)', color: '#15803d' }}>{app!.status === 'hired' ? 'Won' : app!.status}</span>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); handleApply(lead) }} className="btn-p btn-sm !px-4 !py-1.5 text-[11px]">Apply</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* No matches state */}
        {filtered.length === 0 && leads.length > 0 && (
          <div className="card text-center py-12 px-6 mt-2">
            <i className="ti ti-filter-off text-3xl" style={{ color: 'var(--slate-300)' }} />
            <p className="text-sm mt-3 font-semibold" style={{ color: 'var(--ink-900)' }}>No leads match these filters</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>Try broadening your score filter or switching source.</p>
            <button onClick={() => { setSearch(''); setSourceFilter('All'); setScoreFilter('All') }} className="btn-line btn-sm mt-4">Clear filters</button>
          </div>
        )}

        {/* Limit / upgrade banners */}
        {profile?.subscription_status === 'free' && filtered.length > limit && (
          <div className="card p-5 mt-4 text-center" style={{ background: 'var(--slate-100)', borderColor: 'var(--slate-200)' }}>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>{filtered.length - limit} more leads behind Pro</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>Upgrade to see every scored lead, with breakdowns and push alerts.</p>
            <button onClick={() => router.push('/dashboard/billing')} className="btn-p btn-sm mt-3 !px-6">View Plans</button>
          </div>
        )}

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
      </div>

      {/* Right detail panel */}
      {selected && (() => {
        const m = computeMatchExplanation(selected, profile)
        return (
          <aside className="hidden md:block w-[300px] shrink-0 overflow-y-auto border-l px-5 py-5" style={{ borderColor: 'var(--slate-200)' }}>
            <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg mb-4 btn-line btn-sm" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)', border: 'none' }}>
              <i className="ti ti-x" /> Close
            </button>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: getSourceInfo(selected.source_url).bg, color: getSourceInfo(selected.source_url).color }}>{getSourceInfo(selected.source_url).label}</span>
              <ScoreBadge match={m} size="sm" />
            </div>
            <h2 className="text-sm font-semibold leading-snug" style={{ color: 'var(--ink-900)' }}>{selected.title}</h2>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-400)' }}>{getSourceInfo(selected.source_url).label} &middot; {new Date(selected.posted_date).toLocaleDateString()}</p>

            {/* Inline sub-score summary */}
            <div className="mt-3 space-y-1.5">
              {m.subScores.map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-[10px] w-16 shrink-0" style={{ color: 'var(--slate-500)' }}>{s.label}</span>
                  <div className="score-bar flex-1"><span className={s.value >= 7 ? '' : s.value >= 4 ? 'warn' : 'weak'} style={{ width: `${s.value * 10}%` }} /></div>
                  <span className="text-[10px] font-mono font-semibold w-7 text-right" style={{ color: 'var(--slate-600)' }}>{s.value}</span>
                </div>
              ))}
            </div>

            {formatBudgetGBP(selected.budget_min, selected.budget_max) && (
              <p className="dash-badge-status mt-3 inline-block" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>{formatBudgetGBP(selected.budget_min, selected.budget_max)}</p>
            )}
            <div className="mt-4 text-xs leading-relaxed" style={{ color: 'var(--slate-600)', maxHeight: '220px', overflowY: 'auto' }}>{selected.description?.slice(0, 500)}</div>
            {selected.skills_required && selected.skills_required.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selected.skills_required.map(sk => <span key={sk} className="badge-skill text-[10px]">{sk}</span>)}
              </div>
            )}
            <div className="mt-4 space-y-2">
              <button onClick={() => handleApply(selected)} className="btn-p btn-sm w-full justify-center">View full lead &amp; apply</button>
              {selected.source_url && (
                <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="btn-line btn-sm w-full justify-center"><i className="ti ti-external-link" /> Open original</a>
              )}
            </div>
          </aside>
        )
      })()}
    </div>
  )
}
