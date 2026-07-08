'use client'

import { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import LoadingDots from '@/components/LoadingDots'
import RefreshBar from '@/components/RefreshBar'
import { entitlementsFor, type Tier } from '@/lib/tiers'
import { isDirectApply, isBeginnerFriendly, isFresh, deriveExperienceLevel, sourceTrustLevel, deriveLocationFlexibility, extractCompanyName, competitionLevel } from '@/lib/lead-filters'
import { formatBudgetGBP, timeAgo } from '@/lib/utils'
import { useSearch } from '@/components/TopbarSearch'
import toast from 'react-hot-toast'

// Display metadata per source id (the value the scraper writes to leads.source).
// Reddit's sub-feeds all canonicalise to 'reddit'. Unknown ids fall back to a
// title-cased label + neutral colour, so new sources never break the UI.
const SOURCE_META: Record<string, { label: string; color: string }> = {
  reddit:        { label: 'Reddit',        color: '#C73A1F' },
  hackernews:    { label: 'Hacker News',   color: '#FF6600' },
  reed:          { label: 'Reed',          color: '#2A5FB8' },
  wwr:           { label: 'WWR',           color: '#9A6A0C' },
  remoteok:      { label: 'Remote OK',     color: '#7344C0' },
  remotive:      { label: 'Remotive',      color: '#159F94' },
  cwjobs:        { label: 'CWJobs',        color: '#0E7C5A' },
  indeed:        { label: 'Indeed',        color: '#2557A7' },
  himalayas:     { label: 'Himalayas',     color: '#5B6CFF' },
  arbeitnow:     { label: 'Arbeitnow',     color: '#C0392B' },
  jsearch:       { label: 'JSearch',       color: '#8E44AD' },
  jobicy:        { label: 'Jobicy',        color: '#D63384' },
  workingnomads: { label: 'Working Nomads',color: '#138A72' },
  jobspresso:    { label: 'Jobspresso',    color: '#6F4E37' },
  skipthedrive:  { label: 'SkipTheDrive',  color: '#2C82C9' },
  pythonjobs:    { label: 'Python Jobs',   color: '#3776AB' },
  larajobs:      { label: 'LaraJobs',      color: '#E04030' },
  authenticjobs: { label: 'Authentic Jobs',color: '#34495E' },
  nodesk:        { label: 'NoDesk',        color: '#1F2937' },
  workew:        { label: 'Workew',        color: '#00A38C' },
  adzuna:        { label: 'Adzuna',        color: '#7E57C2' },
  jooble:        { label: 'Jooble',        color: '#2D9CDB' },
  findwork:      { label: 'Findwork',      color: '#0B6E4F' },
}

function srcKey(surl: string | null): string {
  const l = (surl || '').toLowerCase()
  if (l.includes('reddit')) return 'reddit'
  if (l.includes('reed')) return 'reed'
  if (l.includes('weworkremotely') || l.includes('wwr')) return 'wwr'
  return 'remoteok'
}

// Canonical source id for a lead: prefer the scraper-set `source`, group Reddit
// sub-feeds, and fall back to guessing from the URL for legacy rows.
function canonSource(lead: { source?: string | null; source_url?: string | null }): string {
  const s = (lead.source || '').toLowerCase()
  if (s.startsWith('reddit')) return 'reddit'
  if (s && s !== 'direct' && s !== 'unknown') return s
  return srcKey(lead.source_url ?? null)
}

function sourceMeta(id: string): { label: string; color: string } {
  return SOURCE_META[id] || { label: id ? id.charAt(0).toUpperCase() + id.slice(1) : 'Other', color: '#6B7A8F' }
}

// Light tinted background for a source badge from its brand colour.
function srcBadgeStyle(color: string): React.CSSProperties {
  return { background: `color-mix(in srgb, ${color} 13%, white)`, color }
}

const SUB: Record<string, { label: string; w: number; icon: string }> = {
  skill: { label: 'Skill match', w: 35, icon: 'ti-target-arrow' },
  semantic: { label: 'Semantic', w: 20, icon: 'ti-brain' },
  rate: { label: 'Rate match', w: 25, icon: 'ti-currency-pound' },
  recency: { label: 'Recency', w: 12, icon: 'ti-clock' },
  detail: { label: 'Detail', w: 8, icon: 'ti-file-text' },
}

function scoreColor(s: number) {
  return s >= 8 ? { c: 'var(--hi)', bg: 'var(--hi-bg)' } : s >= 5 ? { c: 'var(--mid)', bg: 'var(--mid-bg)' } : { c: 'var(--lo)', bg: 'var(--lo-bg)' }
}

function barColor(v: number) {
  if (v >= 8) return 'var(--hi)'
  if (v >= 5) return 'var(--mid)'
  return 'var(--coral)'
}

// Compact inline badge for the lead list
function ScoreBadge({ score }: { score: number }) {
  const { c, bg } = scoreColor(score)
  return <span className="score-badge" style={{ color: c, background: bg }}><span className="sb-val">{score}</span><span className="sb-den">/10</span></span>
}

function matchLabel(score: number): string {
  if (score >= 8) return 'Strong match'
  if (score >= 6) return 'Good match'
  if (score >= 4) return 'Fair match'
  return 'Low match'
}

function SkillBar({ explanation }: { explanation: ReturnType<typeof computeMatchExplanation> }) {
  // Mirror the badge: the bar tracks the composite match score so two leads with
  // different scores (e.g. 7 vs 5) always look different.
  const score = explanation.score
  const pct = Math.max(4, (score / 10) * 100)
  return (
    <div className="skill-bar">
      <i className="ti ti-sparkles"></i>
      <div className="skill-bar-track"><div className="skill-bar-fill" style={{ width: `${pct}%`, background: barColor(score) }} /></div>
      <span className="skill-bar-label">{matchLabel(score)}</span>
    </div>
  )
}

// Full ring for the detail panel where there's more room
function verdictSentence(m: ReturnType<typeof computeMatchExplanation>, sc: number): string {
  const { matched, missing } = m.skillMatch
  const rateScore = m.subScores.find(s => s.label === 'Rate match')?.value ?? 5
  const freshScore = m.subScores.find(s => s.label === 'Recency')?.value ?? 5
  const skillPart = missing.length === 0 && matched.length > 0
    ? `all ${matched.length} required skill${matched.length > 1 ? 's' : ''} match`
    : matched.length > 0
    ? `${matched.length} of ${matched.length + missing.length} skills match`
    : 'no direct skill overlap'
  const ratePart = rateScore >= 8 ? 'budget exceeds your rate'
    : rateScore >= 6 ? 'budget is close to your rate'
    : 'budget is below your rate'
  const freshPart = freshScore >= 9 ? ', just posted' : freshScore >= 7 ? ', still fresh' : ''
  const opening = sc >= 8 ? 'Strong fit' : sc >= 6.5 ? 'Good fit' : sc >= 5 ? 'Partial fit' : 'Weak fit'
  return `${opening} — ${skillPart}, ${ratePart}${freshPart}.`
}

function verdictBorderColor(sc: number) {
  return sc >= 8 ? 'var(--hi)' : sc >= 5.5 ? 'var(--mid)' : 'var(--coral)'
}

function SkeletonFeed() {
  return (
    <div className="feed-list">
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="lead-card" style={{ pointerEvents: 'none' }}>
          <div className="lc-top" style={{ marginBottom: 14 }}>
            <div className="skel" style={{ width: 22, height: 22, borderRadius: 6 }} />
            <div className="skel" style={{ width: 54, height: 20, borderRadius: 5 }} />
            <div className="skel" style={{ width: 36, height: 16, borderRadius: 4, marginLeft: 'auto' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
            <div className="skel" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skel" style={{ height: 16, borderRadius: 5, marginBottom: 6 }} />
              <div className="skel" style={{ height: 14, width: '65%', borderRadius: 5 }} />
            </div>
          </div>
          <div className="skel" style={{ height: 34, borderRadius: 6, marginBottom: 12 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div className="skel" style={{ width: 72, height: 22, borderRadius: 5 }} />
            <div className="skel" style={{ width: 90, height: 22, borderRadius: 5 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[60, 72, 54].map(w => <div key={w} className="skel" style={{ width: w, height: 22, borderRadius: 99 }} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [feedError, setFeedError] = useState(false)
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())
  const [nextScanAt, setNextScanAt] = useState<number | null>(null)
  const [waitingCount, setWaitingCount] = useState(0)
  const [weeklyLeadCap, setWeeklyLeadCap] = useState<number | null>(null)
  const [weeklyRemaining, setWeeklyRemaining] = useState<number | null>(null)
  const [weekResetAt, setWeekResetAt] = useState<number | null>(null)
  const [capReached, setCapReached] = useState(false)
  const leadsCountRef = useRef(0)
  const [profile, setProfile] = useState<Profile | null>(null)
  const { query: search, setQuery: setSearch } = useSearch()
  const [locationSearch, setLocationSearch] = useState('')
  const [locOpen, setLocOpen] = useState(false)
  const [srcOpen, setSrcOpen] = useState(false)
  const [whatOpen, setWhatOpen] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [easyFilters, setEasyFilters] = useState<Set<string>>(new Set())
  const [applyingId, setApplyingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [newCount, setNewCount] = useState(0)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [sortMode, setSortMode] = useState<'score' | 'recent' | 'budget'>('score')
  const [moreOpen, setMoreOpen] = useState(false)
  const [similarLeads, setSimilarLeads] = useState<Lead[]>([])
  const [panelCopied, setPanelCopied] = useState(false)
  const touchStartY = useRef(0)
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const [remindOpen, setRemindOpen] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const appCount = applications.filter(a => a.status !== 'saved' && a.status !== 'lost').length
  const isFree = profile?.subscription_status === 'free'
  const plan = profile?.subscription_status || 'free'
  const ent = entitlementsFor(plan as Tier)
  // Source links are available to every tier (free included) — a lead you can't
  // open is useless. Gated on the entitlement, not the paid check.
  const showLinks = ent.sourceLinks
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const res = await fetch('/api/export/leads')
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Export failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flaiir-leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Leads exported')
    } catch {
      toast.error('Network error')
    } finally {
      setExporting(false)
    }
  }

  // Pull the per-user gated feed. The endpoint auto-delivers (advances the scan
  // mark) when the timer has elapsed, so this is what releases each batch.
  const syncFeed = useCallback(async (opts: { initial?: boolean } = {}) => {
    if (!opts.initial && document.hidden) return
    try {
      const fr = await fetch('/api/leads/feed')
      if (!fr.ok) { if (opts.initial) setFeedError(true); return }
      setFeedError(false)
      const fd = await fr.json()
      const incoming: Lead[] = fd.leads || []
      setNextScanAt(typeof fd.nextScanAt === 'number' ? fd.nextScanAt : null)
      setWaitingCount(fd.waitingCount ?? 0)
      setWeeklyLeadCap(typeof fd.weeklyLeadCap === 'number' ? fd.weeklyLeadCap : null)
      setWeeklyRemaining(typeof fd.weeklyRemaining === 'number' ? fd.weeklyRemaining : null)
      setWeekResetAt(typeof fd.weekResetAt === 'number' ? fd.weekResetAt : null)
      setCapReached(!!fd.capReached)

      const changed = incoming.length !== leadsCountRef.current || fd.delivered
      if (opts.initial || changed) {
        leadsCountRef.current = incoming.length
        setLeads(incoming)
      }

      if (fd.delivered && fd.deliveredCount > 0 && !opts.initial) {
        setNewCount(c => c + fd.deliveredCount)
      } else if (opts.initial) {
        // "New today" = posted since local midnight — stable across reloads
        // (the old since-last-visit counter reset to 0 on every reload).
        const midnight = new Date(); midnight.setHours(0, 0, 0, 0)
        setNewCount(incoming.filter(l => new Date(l.posted_date).getTime() >= midnight.getTime()).length)
      }
    } catch {
      // Network failure — keep showing what we have, but if we have nothing,
      // say so honestly instead of rendering the "empty feed" state.
      if (opts.initial) setFeedError(true)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      try { setViewedIds(new Set(JSON.parse(localStorage.getItem('viewedLeads') || '[]'))) } catch { /* ignore */ }
      try { setHiddenIds(new Set(JSON.parse(localStorage.getItem('hiddenLeads') || '[]'))) } catch { /* ignore */ }

      const res = await fetch('/api/applications')
      const apps: Application[] = res.ok ? await res.json() : []
      setApplications(apps)
      setSavedIds(new Set(apps.filter(a => a.status === 'saved').map(a => a.lead_id)))

      await syncFeed({ initial: true })
      setLoading(false)
    }
    load()
  }, [supabase, router, syncFeed])

  // Poll every 60s. When a user's scan timer elapses, the next poll delivers the
  // batch they don't have. RefreshBar also triggers an immediate pull at zero.
  useEffect(() => {
    const id = setInterval(() => { syncFeed() }, 60000)
    return () => clearInterval(id)
  }, [syncFeed])

  const appMap = useMemo(() => new Map(applications.map(a => [a.lead_id, a])), [applications])

  function leadState(lead: Lead): string {
    const app = appMap.get(lead.id)
    if (app && app.status !== 'saved') return 'applied'
    if (app?.status === 'saved') return 'saved'
    if (viewedIds.has(lead.id)) return 'viewed'
    return 'new'
  }

  const filtered = useMemo(() => {
    let ls = leads.filter(l => !hiddenIds.has(l.id))
    if (search) { const q = search.toLowerCase(); ls = ls.filter(l => l.title.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q)) }
    if (locationSearch) { const loc = locationSearch.toLowerCase(); ls = ls.filter(l => (l.client_location || '').toLowerCase().includes(loc)) }
        if (sourceFilter !== 'all') ls = ls.filter(l => canonSource(l) === sourceFilter)
    if (scoreFilter === '8') ls = ls.filter(l => computeMatchExplanation(l, profile).score >= 8)
    else if (scoreFilter === '7') ls = ls.filter(l => computeMatchExplanation(l, profile).score >= 7)
    else if (scoreFilter === 'new') ls = ls.filter(l => leadState(l) === 'new')
    else if (scoreFilter === 'saved') ls = ls.filter(l => leadState(l) === 'saved' || savedIds.has(l.id))
    if (easyFilters.has('direct')) ls = ls.filter(l => isDirectApply(l.source_url, l.description))
    if (easyFilters.has('beginner')) ls = ls.filter(l => isBeginnerFriendly(`${l.title} ${l.description || ''}`))
    if (easyFilters.has('fresh')) ls = ls.filter(l => isFresh(l.posted_date, 6))
    if (sortMode === 'recent') {
      ls.sort((a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime())
    } else if (sortMode === 'budget') {
      ls.sort((a, b) => {
        const bv = b.budget_max || b.budget_min || 0
        const av = a.budget_max || a.budget_min || 0
        return bv - av
      })
    } else {
      // Best match: score DESC, recency as tiebreaker
      ls.sort((a, b) => {
        const sa = computeMatchExplanation(a, profile).score
        const sb = computeMatchExplanation(b, profile).score
        if (sb !== sa) return sb - sa
        return new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
      })
    }
    return ls
  }, [leads, search, sourceFilter, scoreFilter, easyFilters, profile, viewedIds, savedIds, sortMode, hiddenIds])

  // Triage: hide a lead from the feed (local, reversible).
  const persistHidden = (n: Set<string>) => localStorage.setItem('hiddenLeads', JSON.stringify([...n]))
  const hideLead = (lead: Lead) => {
    setHiddenIds(prev => { const n = new Set(prev); n.add(lead.id); persistHidden(n); return n })
    toast(t => (
      <span className="toast-undo-wrap">Lead hidden
        <button className="toast-undo" onClick={() => {
          toast.dismiss(t.id)
          setHiddenIds(prev => { const n = new Set(prev); n.delete(lead.id); persistHidden(n); return n })
        }}>Undo</button>
      </span>
    ), { duration: 5000 })
  }
  const clearHidden = () => { setHiddenIds(new Set()); localStorage.removeItem('hiddenLeads') }

  const topScore = useMemo(() => leads.reduce((m, l) => Math.max(m, computeMatchExplanation(l, profile).score), 0), [leads, profile])
  const topId = useMemo(() => {
    if (!leads.length) return ''
    return leads.reduce((a, b) => computeMatchExplanation(a, profile).score > computeMatchExplanation(b, profile).score ? a : b).id
  }, [leads, profile])

  const score7plus = useMemo(() => leads.filter(l => computeMatchExplanation(l, profile).score >= 7).length, [leads, profile])

  const counts = useMemo(() => ({
    all: leads.length,
    '8': leads.filter(l => computeMatchExplanation(l, profile).score >= 8).length,
    '7': score7plus,
    new: leads.filter(l => leadState(l) === 'new').length,
    saved: savedIds.size,
  }), [leads, profile, score7plus, savedIds, leadState])

  const easyCounts = useMemo(() => ({
    direct: leads.filter(l => isDirectApply(l.source_url, l.description)).length,
    beginner: leads.filter(l => isBeginnerFriendly(`${l.title} ${l.description || ''}`)).length,
    fresh: leads.filter(l => isFresh(l.posted_date, 6)).length,
  }), [leads])

  const whatSuggestions = useMemo(() => {
    if (!search || search.length < 1) return []
    const q = search.toLowerCase()
    const pool = leads
    const groups = new Map<string, number>()
    const seen = new Set<string>()
    pool.forEach(l => {
      const title = l.title.trim()
      if (!title) return
      const key = title.toLowerCase()
      if (seen.has(key)) return
      if (key.includes(q)) {
        groups.set(title, pool.filter(x => x.title.toLowerCase() === key).length)
        seen.add(key)
      }
    })
    const matching = Array.from(groups.entries(), ([title, n]) => ({ title, n }))
    matching.sort((a, b) => b.n - a.n)
    return matching.slice(0, 6)
  }, [leads, search])

  const appliedSkills = useMemo(() => {
    const appliedLeads = applications
      .filter(a => a.status === 'applied' || a.status === 'in_talks' || a.status === 'hired')
      .map(a => leads.find(l => l.id === a.lead_id))
      .filter((l): l is Lead => !!l && !!l.skills_required && l.skills_required.length > 0)
      .reverse()
    const freq = new Map<string, number>()
    appliedLeads.forEach(l => l.skills_required!.forEach(s => freq.set(s, (freq.get(s) || 0) + 1)))
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([skill]) => skill)
  }, [applications, leads])

  const allLocations = useMemo(() => {
    const locs = new Set<string>()
    leads.forEach(l => { if (l.client_location) locs.add(l.client_location) })
    return [...locs].sort()
  }, [leads])

  const locSuggestions = useMemo(() => {
    if (!locationSearch) return allLocations.slice(0, 8)
    const q = locationSearch.toLowerCase()
    return allLocations.filter(l => l.toLowerCase().includes(q)).slice(0, 8)
  }, [allLocations, locationSearch])

  function toggleEasy(key: string) {
    setEasyFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function userSegment() {
    if (appCount >= 10) return 'power'
    if (appCount >= 1 || newCount > 0) return 'returning'
    return 'new'
  }

  const seg = userSegment()
  const firstName = (profile?.full_name?.split(' ')[0] || 'there').replace(/^\w/, c => c.toUpperCase())

  function subBars(lead: Lead, full: boolean) {
    const m = computeMatchExplanation(lead, profile)
    const profileRate = profile?.hourly_rate || 55
    return m.subScores.map(s => {
      const label = s.label
      const v = s.value
      if (!full) {
        const short = label.split(' ')[0]
        return (
          <div key={label} className="ssp-item">
            <div className="ssp-head"><span className="ssp-label">{short}</span><span className="ssp-val" style={{ color: barColor(v) }}>{v}</span></div>
            <div className="ssp-bar"><div className="ssp-fill" style={{ width: `${v * 10}%`, background: barColor(v) }}></div></div>
          </div>
        )
      }
      const subKey = label.toLowerCase().includes('skill') ? 'skill' : label.toLowerCase().includes('semantic') ? 'semantic' : label.toLowerCase().includes('rate') ? 'rate' : label.toLowerCase().includes('recency') ? 'recency' : 'detail'
      const detailMap: Record<string, string> = {
        skill: `${m.skillMatch.matched.length} of ${m.skillMatch.matched.length + m.skillMatch.missing.length} required skills match your profile`,
        semantic: m.subScores.find(s => s.label === 'Semantic')?.detail ?? 'TF-IDF similarity to your profile',
        rate: `Budget ${v >= 7 ? 'fits' : v >= 5 ? 'is near' : 'is below'} your £${profileRate}/hr target`,
        recency: `Posted ${timeAgo(lead.posted_date)}`,
        detail: `Listing is ${v >= 8 ? 'thorough' : v >= 5 ? 'adequate' : 'thin'} on scope`,
      }
      const subInfo = SUB[subKey] || { w: 25, icon: 'ti-info-circle' }
      return (
        <div key={label} className="ssf-row">
          <div className="ssf-head">
            <span className="ssf-icon" style={{ background: scoreColor(v).bg }}><i className={`ti ${subInfo.icon}`} style={{ color: barColor(v) }}></i></span>
            <span className="ssf-label">{label}<span className="ssf-weight">{subInfo.w}%</span></span>
            <span className="ssf-score" style={{ color: barColor(v) }}>{v}/10</span>
          </div>
          <div className="ssf-bar"><div className="ssf-fill" style={{ width: `${v * 10}%`, background: barColor(v) }}></div></div>
          <div className="ssf-detail">{detailMap[subKey]}</div>
        </div>
      )
    })
  }

  const markViewed = (id: string) => {
    setViewedIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      localStorage.setItem('viewedLeads', JSON.stringify([...next]))
      return next
    })
  }

  const selectLead = (lead: Lead) => {
    markViewed(lead.id)
    setSelected(lead)
  }

  const closeDetail = () => { setSelected(null); setSimilarLeads([]) }

  // Escape key closes panel
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetail() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Similar leads — fetch on panel open
  useEffect(() => {
    if (!selected) { setSimilarLeads([]); return }
    const skills = selected.skills_required || []
    if (!skills.length) return
    supabase
      .from('leads')
      .select('*')
      .eq('status', 'active')
      .neq('id', selected.id)
      .overlaps('skills_required', skills)
      .order('posted_date', { ascending: false })
      .limit(3)
      .then(({ data }) => setSimilarLeads(data || []))
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSave = async (lead: Lead) => {
    try {
      const existing = appMap.get(lead.id)
      if (existing?.status === 'saved') {
        const r = await fetch('/api/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id }) })
        if (r.ok) {
          setApplications(prev => prev.filter(a => a.lead_id !== lead.id))
          setSavedIds(prev => { const n = new Set(prev); n.delete(lead.id); return n })
          toast('Removed from saved')
        } else {
          const e = await r.json().catch(() => ({}))
          toast(e.error || 'Failed to unsave')
        }
      } else {
        const r = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, status: 'saved' }) })
        if (r.ok) {
          const app = await r.json()
          setApplications(prev => [...prev.filter(a => a.lead_id !== lead.id), app])
          setSavedIds(prev => new Set(prev).add(lead.id))
          toast('Saved for later')
        } else {
          const e = await r.json().catch(() => ({}))
          toast(e.error || 'Failed to save')
        }
      }
    } catch {
      toast('Network error — check your connection and try again')
    }
  }

  const handleApply = async (lead: Lead) => {
    // Client-side gate mirrors the server's real entitlement (5/month on free).
    const appLimit = ent.applicationsPerMonth
    if (isFree && typeof appLimit === 'number' && appCount >= appLimit) {
      showLimit(appLimit)
      return
    }
    if (applyingId) return
    setApplyingId(lead.id)
    try {
      const r = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, status: 'applied' }),
      })
      if (r.ok) {
        const app = await r.json()
        setApplications(prev => [...prev.filter(a => a.lead_id !== lead.id), app])
        toast.success('Applied — added to your pipeline')
      } else {
        const err = await r.json().catch(() => ({ error: 'Request failed' }))
        toast.error(err.error || 'Apply failed')
      }
    } finally {
      setApplyingId(null)
    }
  }

  const handleShare = async (lead: Lead) => {
    const text = `${lead.title}\n\n${(lead.description || '').substring(0, 300)}${lead.source_url ? `\n\n${lead.source_url}` : ''}`
    if (navigator.share) {
      try { await navigator.share({ title: lead.title, text }) } catch { /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); toast.success('Lead copied to clipboard') } catch { toast.error('Could not copy') }
    }
  }

  const handleRemind = async (lead: Lead, hours: number) => {
    setRemindOpen(null)
    const followUp = new Date(Date.now() + hours * 3600000).toISOString()
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, follow_up_at: followUp }),
      })
      if (res.ok) {
        const lbl = hours >= 24 ? `${hours / 24}d` : `${hours}h`
        toast.success(`Reminder set for ${lbl}`)
      } else if (res.status === 403) {
        toast.error('Upgrade to Pro for reminders')
      } else {
        const d = await res.json().catch(() => ({ error: 'Failed to set reminder' }))
        toast.error(d.error || 'Failed to set reminder')
      }
    } catch {
      toast.error('Network error — check your connection')
    }
  }

  const showLimit = (limit: number) => {
    const el = document.getElementById('page-inner')
    if (!el) return
    const div = document.createElement('div')
    div.id = 'limitModal'
    div.style.cssText = 'position:fixed;inset:0;background:rgba(21,32,26,.5);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px'
    div.onclick = (e) => { if ((e.target as HTMLElement).id === 'limitModal') div.remove() }
    div.innerHTML = `
      <div style="background:var(--card);border-radius:var(--r-xl);padding:32px;max-width:400px;text-align:center;box-shadow:var(--sh-lg)">
        <div class="empty-icon" style="margin-bottom:16px"><i class="ti ti-bolt"></i></div>
        <h3 class="display" style="font-size:20px;margin-bottom:8px">You've used all ${limit} free applications</h3>
        <p style="color:var(--slate);font-size:14px;line-height:1.55;margin-bottom:22px">Upgrade to <b style="color:var(--ink)">Pro</b> for unlimited applications with no weekly lead cap — or go <b style="color:var(--ink)">Max</b> for analytics and adjustable scoring.</p>
        <button class="btn btn-warm" style="width:100%;margin-bottom:9px" onclick="this.closest('#limitModal').remove();window.location.href='/dashboard/billing'">See plans</button>
        <button class="btn btn-ghost" style="width:100%" onclick="this.closest('#limitModal').remove()">Maybe later</button>
      </div>`
    el.prepend(div)
  }

  // Sources actually present in the feed, with counts — drives the From filter.
  const availableSources = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of leads) {
      const k = canonSource(l)
      counts.set(k, (counts.get(k) || 0) + 1)
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ id, count, ...sourceMeta(id) }))
      .sort((a, b) => b.count - a.count)
  }, [leads])

  const selSrc = sourceFilter === 'all'
    ? null
    : (availableSources.find(s => s.id === sourceFilter) || { id: sourceFilter, count: 0, ...sourceMeta(sourceFilter) })

  const loadWhatSuggestions = useCallback(() => {
    try {
      const raw = localStorage.getItem('recentSearches')
      setRecentSearches(raw ? JSON.parse(raw).slice(0, 3) : [])
    } catch {}
  }, [])

  const submitWhat = useCallback((q: string) => {
    setSearch(q)
    setWhatOpen(false)
    if (q) {
      const prev = (() => { try { return JSON.parse(localStorage.getItem('recentSearches') || '[]') } catch { return [] } })()
      const next = [q, ...prev.filter((x: string) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8)
      try { localStorage.setItem('recentSearches', JSON.stringify(next)) } catch {}
      fetch('/api/search/suggest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) }).catch(() => {})
    }
  }, [setSearch])

  if (loading) return <SkeletonFeed />

  const greetMap: Record<string, string> = {
    new: `Welcome, ${firstName}`,
    returning: `Good to see you, ${firstName}`,
    power: `Welcome back, ${firstName}`,
  }

  // Real scan cadence from the user's tier — not a hardcoded "5h" (paid tiers scan faster).
  const scanHrs = ent.scanIntervalHours
  const scanLabel = scanHrs <= 1 ? 'hourly' : `every ${scanHrs}h`
  const subMap: Record<string, string> = {
    new: `Here's your ranked feed — updated ${scanLabel}`,
    returning: newCount ? `<b>${newCount} new lead${newCount === 1 ? '' : 's'}</b> today` : `Here's your ranked feed — updated ${scanLabel}`,
    power: `<b>${newCount} new lead${newCount === 1 ? '' : 's'}</b> today, <b>${appCount}</b> applied this month`,
  }

  const leadCards = filtered.map((lead, idx) => {
    const explanation = computeMatchExplanation(lead, profile)
    const sc = explanation.score
    const si = sourceMeta(canonSource(lead))
    const state = leadState(lead)
    const saved = savedIds.has(lead.id)
    const applied = state === 'applied'
    const isTop = lead.id === topId && scoreFilter === 'all' && sourceFilter === 'all' && !search && sortMode === 'score'
    const skills = (lead.skills_required || []).slice(0, 3).map(sk => {
      const m = profile?.skills?.some(ps => ps.toLowerCase() === sk.toLowerCase())
      return <span key={sk} className={`skill ${m ? 'match' : ''}`} onClick={e => { e.stopPropagation(); setSearch(sk) }}>{m ? <i className="ti ti-check"></i> : ''}{sk}</span>
    })
    if ((lead.skills_required?.length || 0) > 3) {
      skills.push(<span key="more" className="skill" onClick={e => e.stopPropagation()}>+{(lead.skills_required?.length || 0) - 3}</span>)
    }
    const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
    const postedH = (Date.now() - new Date(lead.posted_date).getTime()) / 3600000
    const expLevel = deriveExperienceLevel(lead.title)
    const showNew = postedH <= 72 && !applied && !saved
    // State badge = what the user did (saved/viewed) or freshness (new).
    // Applied is shown by the separate "✓ Applied" chip, so no badge here.
    // An old, untouched lead gets NO badge (never a false "APPLIED").
    const badge =
      (saved || state === 'saved') ? { label: 'SAVED', cls: 'st-saved' } :
      applied ? null :
      showNew ? { label: 'NEW', cls: 'st-new' } :
      state === 'viewed' ? { label: 'VIEWED', cls: 'st-viewed' } :
      null
    const urgencyTag = postedH < 24 ? <span className="urgency urgency-hot"><i className="ti ti-flame" />Actively hiring</span> : null
    const cleanDesc = lead.description?.replace(/https?:\/\/[^\s]+/g, '').replace(/\s+/g, ' ').trim()

    return (
      <article key={lead.id} onClick={() => selectLead(lead)}
        className={`lead-card ${selected?.id === lead.id ? 'sel' : ''} ${isTop ? 'top-match' : ''} ${state === 'new' ? 'is-new' : ''} ${state === 'viewed' ? 'viewed' : ''} ${applied ? 'applied' : ''}`}
        style={{ '--src-color': si.color } as React.CSSProperties}>
        <div className="lc-bar">
          <div className="lc-bar-inner">
            <div className="lc-bar-top">
              <span className="src-badge" style={srcBadgeStyle(si.color)}>{si.label.toUpperCase()}</span>
              {isTop
                ? <span className="crown"><i className="ti ti-crown"></i>TOP MATCH</span>
                : badge && <span className={`state-badge ${badge.cls}`}>{badge.label}</span>}
              <span className="lc-time-sep">·</span>
              <span className="lc-time">{timeAgo(lead.posted_date)}</span>
              {lead.client_location && <><span className="lc-time-sep">·</span><span className="lc-time">{lead.client_location}</span></>}
              {lead.ir35 && lead.ir35 !== 'unknown' && <span className="type-chip">{lead.ir35 === 'outside' ? 'Outside IR35' : 'Inside IR35'}</span>}
              {urgencyTag}
            </div>
            <div className="lc-title">
              <span className="tt">{lead.title}</span>
              <div className="lc-title-right">
                {budget && <span className="lc-budget-inline"><i className="ti ti-currency-pound"></i>{budget}</span>}
                <div className="score-wrap" tabIndex={0} aria-label={`Match score ${sc} of 10 — hover for breakdown`}>
                  <ScoreBadge score={sc} />
                  <div className="score-pop" onClick={e => e.stopPropagation()}>
                    <div className="score-pop-head">Why {sc}/10</div>
                    <div className="score-pop-bars">{subBars(lead, false)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="lc-desc">{cleanDesc}</p>
        <div className="skills-row">{skills}</div>
        <div className="lc-actions" onClick={e => e.stopPropagation()}>
          <div className="lca-left">
            {applied
              ? <button className="applied-tag applied-tag-btn" onClick={() => router.push('/dashboard/applied')}><i className="ti ti-circle-check" /> View in pipeline{profile?.portfolio_url ? <i className="ti ti-paperclip" style={{ fontSize: 13, opacity: .6 }} /> : ''}</button>
              : <button className="btn btn-primary" title="Direct link · no commission" disabled={applyingId === lead.id} onClick={() => handleApply(lead)}>
                  {applyingId === lead.id ? <LoadingDots label="Applying" /> : <><i className="ti ti-send"></i> Apply</>}
                </button>}
            <button className="lca-details" onClick={() => selectLead(lead)} title="View full breakdown">Details <i className="ti ti-chevron-right" /></button>
          </div>
          <div className="lca-right">
            <span className="lca-sep" />
            <button className={`lca-icon tip${saved ? ' on' : ''}`} data-tip={saved ? 'Saved' : 'Save'} aria-label="Save" onClick={e => { e.stopPropagation(); toggleSave(lead) }}>
              <i className="ti ti-bookmark" />
            </button>
            {/* Secondary actions live in one kebab menu — keeps the card calm. */}
            <div className="lca-remind-wrap">
              <button className="lca-icon tip" data-tip="More" aria-label="More actions" onClick={() => setRemindOpen(remindOpen === lead.id ? null : lead.id)}>
                <i className="ti ti-dots" />
              </button>
              {remindOpen === lead.id && (
                <div className="lca-menu">
                  <button onClick={() => { setRemindOpen(null); handleShare(lead) }}><i className="ti ti-share" /> Share</button>
                  {!applied && !saved && (
                    <button onClick={() => { setRemindOpen(null); hideLead(lead) }}><i className="ti ti-eye-off" /> Hide lead</button>
                  )}
                  <div className="lca-menu-label">Remind me</div>
                  <button onClick={() => handleRemind(lead, 3)}><i className="ti ti-bell" /> Later today</button>
                  <button onClick={() => handleRemind(lead, 24)}><i className="ti ti-bell" /> Tomorrow</button>
                  <button onClick={() => handleRemind(lead, 72)}><i className="ti ti-bell" /> In 3 days</button>
                  <button onClick={() => handleRemind(lead, 168)}><i className="ti ti-bell" /> Next week</button>
                </div>
              )}
            </div>
          </div>
        </div>
        {applied && <span className="applied-chip"><i className="ti ti-circle-check" />Applied</span>}
      </article>
    )
  })

  return (
    <>
      {!profile?.skills?.length && (
        <div className="profile-banner">
          <i className="ti ti-alert-triangle"></i>
          <div className="pb-txt"><b>Finish your profile</b> — add your skills and rate so we can score leads for you.</div>
          <a onClick={() => router.push('/dashboard/profile')}>Complete profile</a>
        </div>
      )}

      {/* Greeting left, live status right — use the full row width. */}
      <div className="feed-header fh-spread">
        <div className="feed-header-left">
          <h2 className="feed-title">{greetMap[seg]}</h2>
          <p className="feed-sub" dangerouslySetInnerHTML={{ __html: subMap[seg] }} />
        </div>
        <div className="fh-status">
          <RefreshBar nextScanAt={nextScanAt} waitingCount={waitingCount} weeklyLeadCap={weeklyLeadCap} weeklyRemaining={weeklyRemaining} capReached={capReached} onScanReady={() => syncFeed()} />
        </div>
      </div>

      <div className="search-loc-row">
        <div className="tb-search" style={{ position: 'relative' }}>
          <i className="ti ti-search"></i>
          <input
            placeholder="Job title, skill or keyword&hellip;"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => { setWhatOpen(true); loadWhatSuggestions() }}
            onBlur={() => setTimeout(() => setWhatOpen(false), 150)}
            onKeyDown={e => { if (e.key === 'Enter') submitWhat(search) }}
          />
          {whatOpen && (
            <div className="suggest" style={{ display: 'block', position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50 }}>
              {whatSuggestions.length > 0 && (
                <>
                  <div className="suggest-label">Matching leads</div>
                  {whatSuggestions.map(s => (
                    <div key={s.title} className="suggest-item" onMouseDown={() => submitWhat(s.title)}>
                      <i className="ti ti-search"></i>{s.title}<span className="tag">{s.n} lead{s.n !== 1 ? 's' : ''}</span>
                    </div>
                  ))}
                  <div className="suggest-divider"></div>
                </>
              )}
              {recentSearches.length > 0 && (
                <>
                  <div className="suggest-label">Recent</div>
                  {recentSearches.map(q => (
                    <div key={q} className="suggest-item" onMouseDown={() => submitWhat(q)}>
                      <i className="ti ti-history"></i>{q}
                    </div>
                  ))}
                  <div className="suggest-divider"></div>
                </>
              )}
              <div className="suggest-label">Quick links</div>
              <div key="__profile__" className="suggest-item" onMouseDown={() => { setWhatOpen(false); router.push('/dashboard/profile') }}>
                <i className="ti ti-user"></i>My profile
              </div>
              <div key="__saved__" className="suggest-item" onMouseDown={() => { setWhatOpen(false); router.push('/dashboard/saved') }}>
                <i className="ti ti-bookmark"></i>Saved leads
              </div>
              <div key="__applied__" className="suggest-item" onMouseDown={() => { setWhatOpen(false); router.push('/dashboard/applied') }}>
                <i className="ti ti-briefcase"></i>Pipeline
              </div>
              {appliedSkills.length > 0 && (<>
                <div className="suggest-divider"></div>
                <div className="suggest-label">Your recent skills</div>
                {appliedSkills.map(skill => (
                  <div key={skill} className="suggest-item" onMouseDown={() => submitWhat(skill)}>
                    <i className="ti ti-code"></i>{skill}
                  </div>
                ))}
              </>)}
            </div>
          )}
        </div>
        <div className="loc-toggle-wrap" style={{ position: 'relative' }}>
          {locOpen
            ? <div className="loc-toggle loc-input-active">
                <i className="ti ti-map-pin" />
                <input
                  placeholder="City or 'Remote'"
                  value={locationSearch}
                  onChange={e => { setLocationSearch(e.target.value) }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setLocOpen(false) }}
                  onBlur={() => setTimeout(() => setLocOpen(false), 200)}
                  autoFocus
                  className="loc-inline-input"
                />
                <button className="loc-toggle-close" onMouseDown={e => { e.preventDefault(); setLocationSearch(''); setLocOpen(false); }}><i className="ti ti-x" /></button>
              </div>
            : <button className={`loc-toggle ${locationSearch ? 'on' : ''}`} onClick={() => setLocOpen(true)} title="Filter by location">
                <i className="ti ti-map-pin" />
                {locationSearch
                  ? <span className="loc-chip-label">{locationSearch}<i className="ti ti-x" onMouseDown={e => { e.stopPropagation(); setLocationSearch('') }} /></span>
                  : <span className="loc-toggle-text">Location</span>}
                <i className="ti ti-chevron-down" />
              </button>}
          {locOpen && (
            <div className="suggest show">
              {locSuggestions.length > 0 && (
                <>
                  <div className="suggest-label">Locations</div>
                  {locSuggestions.map(loc => (
                    <div key={loc} className="suggest-item" onMouseDown={() => { setLocationSearch(loc); setLocOpen(false) }}>
                      <i className="ti ti-map-pin"></i>{loc}
                    </div>
                  ))}
                </>
              )}
              {locationSearch && locSuggestions.length === 0 && (
                <div className="suggest-item" style={{ cursor: 'default', color: 'var(--slate)' }}>
                  <i className="ti ti-search"></i>No locations found
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="toolbar">
        <div className="tb-group">
          <span className="tb-glabel">Sort</span>
          <div className="seg">
            {([['score', 'Best match'], ['recent', 'Newest'], ['budget', 'Top budget']] as [string, string][]).map(([k, lbl]) => (
              <button key={k} className={`seg-btn ${sortMode === k ? 'on' : ''}`} onClick={() => setSortMode(k as 'score' | 'recent' | 'budget')}>{lbl}</button>
            ))}
          </div>
        </div>
        <div className="tb-group">
          <span className="tb-glabel">Show</span>
          <div className="tb-chips">
            {([['all', 'All', counts.all], ['8', '8+', counts['8']], ['7', '7+', counts['7']], ['new', 'New', counts.new], ['saved', 'Saved', counts.saved]] as [string, string, number][]).filter(([, , n]) => n > 0).map(([k, lbl]) => (
              <button key={k} className={`chip ${scoreFilter === k ? 'on' : ''}`} onClick={() => setScoreFilter(k)}>
                {lbl}<span className="ct">{counts[k as keyof typeof counts]}</span>
              </button>
            ))}
          </div>
        </div>
        {hiddenIds.size > 0 && (
          <button className="tb-hidden" onClick={clearHidden} title="Show hidden leads again">
            {hiddenIds.size} hidden · show
          </button>
        )}
        <div className="tb-group">
          <span className="tb-glabel">From</span>
          <div className="src-dd-wrap">
            <button
              className={`chip chip-src src-dd-toggle ${sourceFilter !== 'all' ? 'on' : ''}`}
              onClick={() => setSrcOpen(o => !o)}
              onBlur={() => setTimeout(() => setSrcOpen(false), 150)}
              aria-haspopup="listbox" aria-expanded={srcOpen}
            >
              {selSrc
                ? <><span className="sd" style={{ background: selSrc.color }} />{selSrc.label}</>
                : <>Any source</>}
              <span className="ct">{selSrc ? selSrc.count : leads.length}</span>
              <i className="ti ti-chevron-down" />
            </button>
            {srcOpen && (
              <div className="suggest show src-dd-menu" role="listbox">
                <div className={`suggest-item ${sourceFilter === 'all' ? 'sel' : ''}`} onMouseDown={() => { setSourceFilter('all'); setSrcOpen(false) }}>
                  <span className="sd sd-all" />Any source<span className="tag">{leads.length}</span>
                </div>
                {availableSources.map(s => (
                  <div key={s.id} className={`suggest-item ${sourceFilter === s.id ? 'sel' : ''}`} onMouseDown={() => { setSourceFilter(s.id); setSrcOpen(false) }}>
                    <span className="sd" style={{ background: s.color }} />{s.label}<span className="tag">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {leads.length === 0 && (feedError ? (
        <div className="empty">
          <div className="empty-icon"><i className="ti ti-plug-x"></i></div>
          <h3>Couldn&apos;t load your feed</h3>
          <p>We couldn&apos;t reach the server just now. Your leads are safe — try again in a moment.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ display: 'inline-flex' }}>Retry</button>
          </div>
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon"><i className="ti ti-radar"></i></div>
          <h3>Your feed is filling up</h3>
          <p>We're scanning 20+ sources — Reddit, Hacker News, Reed, Remote OK, Remotive and more — right now. New leads land with every scan, usually within the hour.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
            <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ display: 'inline-flex' }}>Check again</button>
          </div>
        </div>
      ))}

      {capReached && (
        <div className="cap-panel">
          <i className="ti ti-lock" aria-hidden="true" />
          <div className="cap-panel-txt">
            <b>You&apos;ve reached this week&apos;s {weeklyLeadCap} leads.</b>
            <span>{weekResetAt ? `New leads unlock ${new Date(weekResetAt).toLocaleDateString('en-GB', { weekday: 'long' })} · ` : ''}or upgrade for unlimited leads.</span>
          </div>
          <button className="btn btn-primary" onClick={() => router.push('/dashboard/billing')}>
            <i className="ti ti-bolt" /> Upgrade
          </button>
        </div>
      )}

      <div className={`feed-wrap ${selected ? 'detail-open' : ''}`}>
        <div className="feed-list">
          {leadCards}
        </div>

        {selected && (() => {
          const l = selected
          const m = computeMatchExplanation(l, profile)
          const sc = m.score
          const si = sourceMeta(canonSource(l))
          const budget = formatBudgetGBP(l.budget_min, l.budget_max)
          const applied = leadState(l) === 'applied'
          const saved = savedIds.has(l.id)
          const matchCount = m.skillMatch.matched.length
          const totalSkills = (l.skills_required || []).length
          const ageH = (Date.now() - new Date(l.posted_date).getTime()) / 3600000
          const ageLabel = ageH < 1 ? `${Math.round(ageH * 60)}m ago`
            : ageH < 24 ? `${Math.round(ageH)}h ago`
            : `${Math.round(ageH / 24)}d ago`
          const ageCol = ageH < 24 ? 'var(--hi)' : ageH < 96 ? 'var(--mid)' : 'var(--slate-2)'
          const applicants = typeof (l as any).applicants === 'number' ? (l as any).applicants as number : null
          const trust = sourceTrustLevel(l.source_url)
          const locFlex = deriveLocationFlexibility(l.client_location)
          const company = l.client_name || extractCompanyName(l.title, l.description)
          const comp = applicants != null ? competitionLevel(applicants) : null

          return (
            <aside className="detail-panel"
              onTouchStart={e => { touchStartY.current = e.touches[0].clientY }}
              onTouchEnd={e => { if (e.changedTouches[0].clientY - touchStartY.current > 80) closeDetail() }}>

              <div className="dp-handle" aria-hidden="true"><div className="dp-handle-bar" /></div>

              {/* ── 1. STICKY TOP HEADER — title · company · mini actions ── */}
              <div className="dp-top-header">
                <div className="dp-th-left">
                  <h2 className="dp-th-title" title={l.title}>{l.title}</h2>
                  <p className="dp-th-company">
                    <span className="src-badge" style={srcBadgeStyle(si.color)}>{si.label.toUpperCase()}</span>
                  </p>
                </div>
                <div className="dp-th-actions">
                  {applied
                    ? <button className="btn btn-primary dp-th-btn" onClick={() => router.push('/dashboard/applied')} title="View in pipeline"><i className="ti ti-circle-check" /> Pipeline</button>
                    : <button className="btn btn-primary dp-th-btn" disabled={applyingId === l.id} onClick={() => handleApply(l)}>
                        {applyingId === l.id ? <LoadingDots label="" /> : <><i className="ti ti-send" /> Apply</>}
                      </button>}
                  <button className={`btn btn-ghost dp-th-btn ${saved ? 'on' : ''}`} onClick={() => toggleSave(l)} title={saved ? 'Unsave' : 'Save'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'var(--lime-deep)' : 'none'} stroke={saved ? 'var(--lime-deep)' : 'var(--ink-2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 7v14l-6-4-6 4V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4z"/>
                    </svg>
                  </button>
                  {l.source_url && showLinks && (
                    <button className="dp-icon-btn" title={panelCopied ? 'Copied!' : 'Copy link'}
                      onClick={async () => { await navigator.clipboard.writeText(l.source_url!); setPanelCopied(true); setTimeout(() => setPanelCopied(false), 2000) }}>
                      <i className={`ti ${panelCopied ? 'ti-check' : 'ti-copy'}`} />
                    </button>
                  )}
                  <button className="dp-icon-btn" aria-label="Close (Esc)" onClick={closeDetail}>
                    <i className="ti ti-x" />
                  </button>
                </div>
              </div>

              {/* ── SCROLLABLE BODY ── */}
              <div className="dp-body">

                {/* 2. UNIFIED METADATA GRID (2×3) */}
                <div className="dp-meta-grid">
                  {budget && <div className="dp-mg-item"><span className="dp-mg-label"><i className="ti ti-currency-pound" /> Budget</span><span className="dp-mg-value">{budget}</span></div>}
                  {l.client_location && <div className="dp-mg-item"><span className="dp-mg-label"><i className="ti ti-map-pin" /> Location</span><span className="dp-mg-value">{l.client_location}</span></div>}
                  {l.project_type && <div className="dp-mg-item"><span className="dp-mg-label"><i className="ti ti-briefcase" /> Type</span><span className="dp-mg-value">{l.project_type.charAt(0).toUpperCase() + l.project_type.slice(1)}</span></div>}
                  <div className="dp-mg-item"><span className="dp-mg-label"><i className="ti ti-clock" /> Posted</span><span className="dp-mg-value" style={{ color: ageCol }}>{ageLabel}</span></div>
                  {applicants != null && <div className="dp-mg-item"><span className="dp-mg-label"><i className="ti ti-users" /> Applicants</span><span className="dp-mg-value" style={{ color: applicants > 5 ? 'var(--coral)' : 'var(--slate)' }}>{applicants}</span></div>}
                  <div className="dp-mg-item"><span className="dp-mg-label"><i className="ti ti-sparkles" /> Match</span><span className="dp-mg-value">{sc}/10</span></div>
                </div>

                {/* 2.5 CLIENT CREDIBILITY */}
                <div className="dp-cred-block">
                  <div className="dp-cred-head">Client credibility</div>
                  <div className="dp-cred-grid">
                    <div className="dp-cred-item">
                      <i className={`ti ${trust.icon}`} style={{ color: trust.color }} />
                      <span className="dp-cred-lbl">Source</span>
                      <span className="dp-cred-val" style={{ color: trust.color }}>{trust.label}</span>
                    </div>
                    {locFlex && <div className="dp-cred-item">
                      <i className="ti ti-map-pin" style={{ color: 'var(--slate-2)' }} />
                      <span className="dp-cred-lbl">Flexibility</span>
                      <span className="dp-cred-val">{locFlex}</span>
                    </div>}
                    {company && <div className="dp-cred-item">
                      <i className="ti ti-building" style={{ color: 'var(--slate-2)' }} />
                      <span className="dp-cred-lbl">Client</span>
                      <span className="dp-cred-val">{company}</span>
                    </div>}
                    {comp && <div className="dp-cred-item">
                      <i className="ti ti-users" style={{ color: comp.color }} />
                      <span className="dp-cred-lbl">Competition</span>
                      <span className="dp-cred-val" style={{ color: comp.color }}>{comp.label} ({applicants})</span>
                    </div>}
                  </div>
                </div>

                {/* 3. AI VERDICT BANNER */}
                <div className="dp-verdict-banner">
                  <i className="ti ti-sparkles" />
                  {verdictSentence(m, sc)}
                </div>

                {/* 4. SKILLS MATRIX */}
                {totalSkills > 0 && <>
                  <div className="dp-skills-head">
                    <span className="dp-skills-lbl">Skills match</span>
                    <span className="dp-skills-ratio" style={{ color: matchCount === totalSkills ? 'var(--hi)' : 'var(--mid)' }}>
                      {matchCount} of {totalSkills}
                    </span>
                  </div>
                  <div className="skills-matrix">
                    {(l.skills_required || []).map(s => {
                      const isMatch = m.skillMatch.matched.includes(s)
                      return <span key={s} className={`sm-tag ${isMatch ? 'match' : 'miss'}`}>
                        <i className={`ti ${isMatch ? 'ti-check' : 'ti-x'}`} />{s}
                      </span>
                    })}
                  </div>
                </>}

                {/* 5. RESPONSIBILITIES */}
                {(l.responsibilities?.length ?? 0) > 0 && <div className="dp-section">
                  <div className="dp-section-head"><i className="ti ti-list-check" /> What you'll do</div>
                  <ul className="dp-bullets">
                    {l.responsibilities!.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>}

                {/* 6. BENEFITS */}
                {(l.benefits?.length ?? 0) > 0 && <div className="dp-section">
                  <div className="dp-section-head"><i className="ti ti-gift" /> What's offered</div>
                  <div className="dp-benefits">
                    {l.benefits!.map((b, i) => <span key={i} className="dp-benefit-chip"><i className="ti ti-check" />{b}</span>)}
                  </div>
                </div>}

                {/* 7. FULL DESCRIPTION */}
                <div className="dp-desc-wrap">
                  <div className="dp-section-head"><i className="ti ti-file-text" /> Overview</div>
                  <p className="dp-desc">{l.description}</p>
                </div>

                {/* 6. SOURCE */}
                {l.source_url
                  ? <a className="btn btn-ghost" style={{ width: '100%' }} href={l.source_url} target="_blank" rel="noopener noreferrer">
                      <i className="ti ti-external-link" /> Open original listing
                    </a>
                  : <div className="lock-card" style={{ margin: 0 }}>
                      <div className="lk-icon"><i className="ti ti-help" /></div>
                      <div><h4>No direct link</h4><p>This source doesn&apos;t expose a public URL.</p></div>
                    </div>}
              </div>

              {/* ── 6. STICKY FOOTER ACTION BAR ── */}
              <div className="dp-foot">
                {applied
                  ? <button className="applied-tag applied-tag-btn" style={{ width: '100%', justifyContent: 'center', padding: '12px 0' }} onClick={() => router.push('/dashboard/applied')}>
                      <i className="ti ti-circle-check" /> View in pipeline
                    </button>
                  : <button className="btn btn-primary dp-foot-btn" disabled={applyingId === l.id} onClick={() => handleApply(l)}>
                      {applyingId === l.id ? <LoadingDots label="" /> : <><i className="ti ti-send" /> Apply &amp; track this lead</>}
                    </button>}
              </div>
            </aside>
          )
        })()}

        {filtered.length === 0 && leads.length > 0 && (
          <div className="empty">
            <div className="empty-icon"><i className="ti ti-filter-off"></i></div>
            <h3>No leads match these filters</h3>
            <p>Try widening your score threshold or switching sources.</p>
            <button className="btn btn-ghost" style={{ display: 'inline-flex' }} onClick={() => { setScoreFilter('all'); setSourceFilter('all'); setSearch(''); setEasyFilters(new Set()); setLocationSearch('') }}>Clear filters</button>
          </div>
        )}
      </div>

    </>
  )
}
