'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead } from '@/lib/utils'
import { ALL_SKILLS } from '@/lib/skills'
import ScoreGauge from '@/components/ScoreGauge'
import toast from 'react-hot-toast'

const sourceFilters = ['All', 'Reddit', 'Reed', 'WWR', 'Remote OK']
const scoreFilters = ['All', 'Score 8+', 'Score 7+', 'Saved', 'New'] as const
type ScoreFilter = typeof scoreFilters[number]

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

function barColor(v: number) {
  if (v >= 8) return 'var(--hi)'
  if (v >= 5) return 'var(--mid)'
  return 'var(--coral)'
}

const SRC_CLS: Record<string, string> = {
  reddit: 'sb-reddit', reed: 'sb-reed', wwr: 'sb-wwr', remoteok: 'sb-rok', remotive: 'sb-rok',
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
  const [searchFocused, setSearchFocused] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [isFirstSession, setIsFirstSession] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const appCount = applications.filter(a => a.status !== 'saved').length

  useEffect(() => {
    try {
      setRecentSearches(JSON.parse(localStorage.getItem('recentSearches') || '[]'))
      setIsFirstSession(!localStorage.getItem('firstSessionDone'))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocused(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      try { setViewed(new Set(JSON.parse(localStorage.getItem('viewedLeads') || '[]'))) } catch { /* ignore */ }

      const res = await fetch('/api/applications')
      const apps: Application[] = res.ok ? await res.json() : []
      setApplications(apps)

      const { data: leadsData } = await supabase.from('leads').select('*').eq('status', 'active').gte('posted_date', new Date(Date.now() - 7 * 86400000).toISOString()).order('posted_date', { ascending: false })
      setLeads(leadsData || [])

      const lastSeen = parseInt(localStorage.getItem('lastSeen') || '0')
      if (lastSeen > 0) {
        setNewCount((leadsData || []).filter(l => new Date(l.posted_date).getTime() > lastSeen).length)
      }
      setLoading(false)
      localStorage.setItem('lastSeen', Date.now().toString())
      localStorage.setItem('firstSessionDone', '1')
    }
    load()
  }, [supabase, router])

  const searchSubmit = useCallback((q: string) => {
    setSearch(q)
    setSearchFocused(false)
    if (!q.trim()) return
    const next = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5)
    setRecentSearches(next)
    localStorage.setItem('recentSearches', JSON.stringify(next))
  }, [recentSearches])

  const appMap = useMemo(() => new Map(applications.map(a => [a.lead_id, a])), [applications])

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

  const handleApply = (lead: Lead) => {
    if (profile?.subscription_status === 'free') {
      const appCount = applications.filter(a => a.status !== 'saved').length
      if (appCount >= 5 && limit <= 5) { setLimitReached(true); toast.error('Application limit reached'); return }
    }
    markViewed(lead.id)
    router.push(`/dashboard/lead/${lead.id}`)
  }

  const openDetail = (lead: Lead) => { markViewed(lead.id); setSelected(lead) }

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

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
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
        {/* Greeting — stage-aware */}
        <div className="dash-greet">
          {leads.length === 0 && profile?.onboarding_completed ? (
            <>
              <h1>Your feed is being built, {firstName} 🚀</h1>
              <p>We&apos;re scanning Reddit, Reed, We Work Remotely, and Remote OK. Your first leads land within 30 minutes.</p>
            </>
          ) : isFirstSession && leads.length > 0 ? (
            <>
              <h1>Welcome, {firstName} 👋</h1>
              <p>We found <span className="hl">{leads.length} leads</span> for you this week — ranked by how well they match your skills.</p>
            </>
          ) : appCount > 3 ? (
            <>
              <h1>Back at it, {firstName} 💪</h1>
              <p>
                {newCount > 0
                  ? <><span className="hl">{newCount} new</span> since your last visit. {appCount} in your pipeline.</>
                  : `${appCount} applications in your pipeline — keep going!`}
              </p>
            </>
          ) : (
            <>
              <h1>Good to see you, {firstName}</h1>
              <p>
                {newCount > 0
                  ? <><span className="hl">{newCount} new lead{newCount > 1 ? 's' : ''}</span> since your last visit.</>
                  : 'You\u2019re all caught up \u2014 here\u2019s your ranked feed.'}
              </p>
            </>
          )}
        </div>

        {/* Stat tiles */}
        <div className="dash-stats">
          {[
            { label: 'This week', value: leads.length.toString(), color: 'var(--lime-deep)' },
            { label: 'Scored 7+', value: score7plus.toString(), color: 'var(--hi)' },
            { label: 'Top score', value: topScore > 0 ? `${topScore}` : '\u2014', color: 'var(--mid)' },
            { label: 'Saved', value: applications.filter(a => a.status === 'saved').length.toString(), color: 'var(--slate)' },
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
          {scoreFilters.map(f => (
            <button key={f} onClick={() => setScoreFilter(f)} className={`dash-filter ${scoreFilter === f ? 'active' : ''}`}>{f}</button>
          ))}
          <div className="tool-sep" />
          {sourceFilters.map(f => (
            <button key={f} onClick={() => setSourceFilter(f)} className={`dash-filter ${sourceFilter === f ? 'active' : ''}`}>{f}</button>
          ))}
        </div>

        {/* Smarter search */}
        <div className="relative mb-4" ref={searchRef}>
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--slate-2)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchSubmit(search) } }}
            className="input pl-9" placeholder="Search leads\u2026" />
          {search && (
            <button onClick={() => { setSearch(''); setSearchFocused(true) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
              style={{ color: 'var(--slate-2)' }}><i className="ti ti-x" /></button>
          )}
          {searchFocused && !search && (
            <div className="ob-search-dropdown">
              {recentSearches.length > 0 && (
                <div className="ob-search-section">
                  <div className="ob-search-section-label">Recent <i className="ti ti-clock" /></div>
                  {recentSearches.map(q => (
                    <button key={q} type="button" className="ob-search-suggestion" onClick={() => searchSubmit(q)}>
                      <i className="ti ti-history" />{q}
                    </button>
                  ))}
                </div>
              )}
              <div className="ob-search-section">
                <div className="ob-search-section-label">Popular skills <i className="ti ti-trending-up" /></div>
                <div className="ob-search-pills">
                  {ALL_SKILLS.slice(0, 12).map(s => (
                    <button key={s} type="button" className="ob-search-pill" onClick={() => searchSubmit(s)}>{s}</button>
                  ))}
                </div>
              </div>
              <div className="ob-search-section">
                <div className="ob-search-section-label">Quick filters</div>
                <div className="ob-search-pills">
                  <button className="ob-search-pill" onClick={() => { setScoreFilter('Score 8+'); setSearchFocused(false) }}>Score 8+</button>
                  <button className="ob-search-pill" onClick={() => { setSourceFilter('Reddit'); setSearchFocused(false) }}>Reddit</button>
                  <button className="ob-search-pill" onClick={() => { setSourceFilter('Remote OK'); setSearchFocused(false) }}>Remote OK</button>
                  <button className="ob-search-pill" onClick={() => { setScoreFilter('New'); setSearchFocused(false) }}>New today</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* First-run empty state */}
        {leads.length === 0 && (
          <div className="empty">
            <div className="empty-icon"><i className="ti ti-radar" /></div>
            <h3>We&apos;re scanning 4 sources for you</h3>
            <p>Your first scored leads appear within 30 minutes &mdash; we&apos;ll email you when they&apos;re ready.</p>
            <button onClick={() => router.refresh()} className="btn btn-ghost" style={{ display: 'inline-flex' }}><i className="ti ti-refresh" /> Check now</button>
          </div>
        )}

        {/* Feed */}
        <div className={`feed-wrap ${selected ? 'detail-open' : ''}`}>
          <div className="feed-list">
            {filtered.slice(0, limit).map(lead => {
              const src = getSourceInfo(lead.source_url)
              const app = appMap.get(lead.id)
              const match = computeMatchExplanation(lead, profile)
              const applied = app && app.status !== 'saved'
              const saved = app?.status === 'saved'
              const isViewed = viewed.has(lead.id)
              const isNew = isNewLead(lead.posted_date)
              const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
              const srcCls = SRC_CLS[src.label.toLowerCase().replace(/\s+/g, '').replace('remoteok', 'rok')] || 'sb-reddit'

              return (
                <article key={lead.id} onClick={() => openDetail(lead)}
                  className={`lead-card ${selected?.id === lead.id ? 'sel' : ''}`}>
                  <div className="lc-top">
                    <span className={`src-badge ${srcCls}`}>{src.label.toUpperCase()}</span>
                    {applied ? <span className="lead-state st-applied">{app!.status === 'hired' ? 'Won' : app!.status}</span>
                      : saved ? <span className="lead-state st-saved">Saved</span>
                      : isViewed ? <span className="lead-state st-viewed">Viewed</span>
                      : isNew ? <span className="lead-state st-new">New</span> : null}
                    <span className="lc-time">{timeAgo(lead.posted_date)}</span>
                  </div>

                  <div className="lc-title">
                    <ScoreGauge score={match.score} />
                    <span className="tt">{lead.title}</span>
                  </div>

                  <p className="lc-desc">{lead.description}</p>

                  <div className="lc-meta">
                    {budget && <span className="budget">{budget}</span>}
                    {lead.client_location && <span className="meta-chip"><i className="ti ti-map-pin" /> {lead.client_location}</span>}
                    {lead.project_type && <span className="meta-chip"><i className="ti ti-briefcase" /> {lead.project_type}</span>}
                  </div>

                  <div className="skills-row">
                    {lead.skills_required?.slice(0, 3).map(sk => {
                      const m = profile?.skills?.some(ps => ps.toLowerCase() === sk.toLowerCase())
                      return <span key={sk} className={`skill ${m ? 'match' : ''}`}>{sk}</span>
                    })}
                    {(lead.skills_required?.length || 0) > 3 && <span className="skill">+{lead.skills_required!.length - 3}</span>}
                  </div>

                  <div className="lc-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleSave(lead)} className={`btn-icon ${saved ? 'on' : ''}`} title={saved ? 'Saved' : 'Save'}>
                      <i className={`ti ti-bookmark${saved ? '-filled' : ''}`} />
                    </button>
                    {applied ? (
                      <span className="applied-tag"><i className="ti ti-circle-check-filled" /> In your pipeline</span>
                    ) : (
                      <button onClick={() => handleApply(lead)} className="btn btn-primary">
                        <i className="ti ti-send" /> Apply
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* No matches state */}
          {filtered.length === 0 && leads.length > 0 && (
            <div className="empty">
              <div className="empty-icon"><i className="ti ti-filter-off" /></div>
              <h3>No leads match these filters</h3>
              <p>Try widening your score threshold or switching sources.</p>
              <button onClick={() => { setSearch(''); setSourceFilter('All'); setScoreFilter('All') }} className="btn btn-ghost" style={{ display: 'inline-flex' }}>Clear filters</button>
            </div>
          )}

          {/* Docked detail panel */}
          {selected && (() => {
            const m = computeMatchExplanation(selected, profile)
            const src = getSourceInfo(selected.source_url)
            const srcCls = SRC_CLS[src.label.toLowerCase().replace(/\s+/g, '').replace('remoteok', 'rok')] || 'sb-reddit'
            const isFree = profile?.subscription_status === 'free'
            return (
              <aside className="detail-panel">
                <div className="dp-head">
                  <span className={`src-badge ${srcCls}`}>{src.label.toUpperCase()}</span>
                  <ScoreGauge score={m.score} size="sm" />
                  <button className="dp-close" onClick={() => setSelected(null)}><i className="ti ti-x" /></button>
                </div>
                <div className="dp-body">
                  <div className="dp-title">{selected.title}</div>
                  <div className="dp-sub">
                    <i className="ti ti-map-pin" style={{ fontSize: 14 }} />
                    {selected.client_location} &middot; {selected.project_type} &middot; {timeAgo(selected.posted_date)}
                  </div>

                  {formatBudgetGBP(selected.budget_min, selected.budget_max) && (
                    <span className="budget">{formatBudgetGBP(selected.budget_min, selected.budget_max)}</span>
                  )}

                  <div className="dp-section-label">Why this score</div>
                  <div className="dp-why">
                    <div className="dp-why-expl">{m.why}</div>
                    <div className="subscore-full">
                      {m.subScores.map(s => {
                        const pct = s.value * 10
                        const barCls = s.value >= 7 ? '' : s.value >= 4 ? 'warn' : 'weak'
                        return (
                          <div key={s.label}>
                            <div className="ssf-head">
                              <span className="ssf-label">{s.label}<span className="ssf-weight">{Math.round(s.weight * 100)}%</span></span>
                              <span className="ssf-score" style={{ color: barColor(s.value) }}>{s.value}/10</span>
                            </div>
                            <div className="ssf-bar"><div className={`ssf-fill ${barCls}`} style={{ width: `${pct}%`, background: barColor(s.value) }} /></div>
                            <div className="ssf-detail">{s.detail}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="dp-section-label">Skill match</div>
                  <div className="skill-detail">
                    {m.skillMatch.matched.map(s => <span key={s} className="skill-yes"><i className="ti ti-check" />{s}</span>)}
                    {m.skillMatch.missing.map(s => <span key={s} className="skill-no">{s}</span>)}
                  </div>

                  <div className="dp-section-label">Description</div>
                  <p className="dp-desc">{selected.description?.slice(0, 500)}</p>

                  <div className="dp-section-label">Source</div>
                  {isFree ? (
                    <div className="lock-card">
                      <div className="lk-icon"><i className="ti ti-lock" /></div>
                      <div><h4>Source hidden on Free</h4><p>Upgrade to apply directly at the source.</p></div>
                    </div>
                  ) : selected.source_url ? (
                    <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ width: '100%' }}>
                      <i className="ti ti-external-link" /> Open original listing
                    </a>
                  ) : null}
                </div>
                <div className="dp-actions">
                  <button onClick={() => handleApply(selected)} className="btn btn-primary" style={{ width: '100%' }}>
                    <i className="ti ti-send" /> Apply & track
                  </button>
                  <button onClick={() => handleSave(selected)} className="btn btn-ghost" style={{ width: '100%' }}>
                    <i className={`ti ti-bookmark${appMap.get(selected.id)?.status === 'saved' ? '-filled' : ''}`} />
                    {appMap.get(selected.id)?.status === 'saved' ? 'Saved' : 'Save for later'}
                  </button>
                </div>
              </aside>
            )
          })()}
        </div>

        {/* Limit / upgrade banners */}
        {profile?.subscription_status === 'free' && filtered.length > limit && (
          <div className="empty" style={{ padding: '30px 20px' }}>
            <h3>{filtered.length - limit} more leads behind Pro</h3>
            <p>Upgrade to see every scored lead with direct source links.</p>
            <button onClick={() => router.push('/dashboard/billing')} className="btn btn-primary" style={{ display: 'inline-flex' }}>View Plans</button>
          </div>
        )}

        {limitReached && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setLimitReached(false)}>
            <div className="section-card p-6 max-w-sm w-full text-center" style={{ animation: 'scaleIn .2s var(--ease)' }} onClick={e => e.stopPropagation()}>
              <div className="empty-icon" style={{ marginBottom: 16 }}><i className="ti ti-bolt" /></div>
              <h3 style={{ fontSize: 20 }}>Application limit reached</h3>
              <p style={{ marginTop: 8 }}>Upgrade to Pro for unlimited applications and source links.</p>
              <button onClick={() => { setLimitReached(false); router.push('/dashboard/billing') }} className="btn btn-primary" style={{ width: '100%', marginTop: 16 }}>Upgrade to Pro</button>
              <button onClick={() => setLimitReached(false)} className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }}>Dismiss</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
