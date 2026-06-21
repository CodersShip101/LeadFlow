'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import LoadingDots from '@/components/LoadingDots'
import RefreshBar from '@/components/RefreshBar'
import { entitlementsFor, type Tier } from '@/lib/tiers'
import { isDirectApply, isBeginnerFriendly, isFresh } from '@/lib/lead-filters'
import { formatBudgetGBP, timeAgo } from '@/lib/utils'
import { useSearch } from '@/components/TopbarSearch'
import toast from 'react-hot-toast'

const SRC: Record<string, { name: string; cls: string; ava: string; ini: string }> = {
  reddit: { name: 'Reddit', cls: 'sb-reddit', ava: '#FF5A3C', ini: 'R' },
  reed: { name: 'Reed', cls: 'sb-reed', ava: '#3B7BE0', ini: 'R' },
  wwr: { name: 'WWR', cls: 'sb-wwr', ava: '#E8A020', ini: 'W' },
  rok: { name: 'Remote OK', cls: 'sb-rok', ava: '#9B6BE0', ini: 'O' },
}

const SUB: Record<string, { label: string; w: number; icon: string }> = {
  skill: { label: 'Skill match', w: 40, icon: 'ti-target-arrow' },
  rate: { label: 'Rate match', w: 30, icon: 'ti-currency-pound' },
  recency: { label: 'Recency', w: 20, icon: 'ti-clock' },
  detail: { label: 'Detail', w: 10, icon: 'ti-file-text' },
}

function srcKey(surl: string | null): string {
  const l = (surl || '').toLowerCase()
  if (l.includes('reddit')) return 'reddit'
  if (l.includes('reed')) return 'reed'
  if (l.includes('weworkremotely') || l.includes('wwr')) return 'wwr'
  return 'rok'
}

function srcInfo(surl: string | null) { return SRC[srcKey(surl)] || SRC.reddit }

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
  return <span className="score-badge" style={{ color: c, background: bg }}>{score}</span>
}

// Full ring for the detail panel where there's more room
function gaugeSVG(score: number) {
  const pct = score / 10, r = 18, circ = 2 * Math.PI * r, off = circ * (1 - pct), col = scoreColor(score).c
  return (
    <div className="gauge-ring">
      <svg width="42" height="42" viewBox="0 0 42 42">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--line)" strokeWidth={4} />
        <circle cx="21" cy="21" r={r} fill="none" stroke={col} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset .6s var(--ease)' }} />
      </svg>
      <span className="gauge-num" style={{ color: col }}>{score}</span>
    </div>
  )
}

function scoreChipColor(s: number) {
  return s >= 8 ? 'var(--hi)' : s >= 5.5 ? 'var(--mid)' : 'var(--coral)'
}

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
  const [profile, setProfile] = useState<Profile | null>(null)
  const { query: search, setQuery: setSearch } = useSearch()
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
  const [similarLeads, setSimilarLeads] = useState<Lead[]>([])
  const [panelCopied, setPanelCopied] = useState(false)
  const touchStartY = useRef(0)
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

  const appCount = applications.filter(a => a.status !== 'saved').length
  const isFree = profile?.subscription_status === 'free'
  const plan = profile?.subscription_status || 'free'
  const isPro = plan === 'pro' || plan === 'max' || plan === 'team'
  const ent = entitlementsFor(plan as Tier)
  const lastScanAt = useMemo(
    () => leads.reduce((m, l) => Math.max(m, new Date(l.posted_date).getTime()), 0) || null,
    [leads],
  )
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

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      try { setViewedIds(new Set(JSON.parse(localStorage.getItem('viewedLeads') || '[]'))) } catch { /* ignore */ }

      const res = await fetch('/api/applications')
      const apps: Application[] = res.ok ? await res.json() : []
      setApplications(apps)
      setSavedIds(new Set(apps.filter(a => a.status === 'saved').map(a => a.lead_id)))

      const { data: leadsData } = await supabase.from('leads').select('*').eq('status', 'active').order('posted_date', { ascending: false })
      setLeads(leadsData || [])

      const lastSeen = parseInt(localStorage.getItem('lastSeen') || '0')
      if (lastSeen > 0) {
        setNewCount((leadsData || []).filter(l => new Date(l.posted_date).getTime() > lastSeen).length)
      }
      setLoading(false)
      localStorage.setItem('lastSeen', Date.now().toString())
    }
    load()
  }, [supabase, router])

  const appMap = useMemo(() => new Map(applications.map(a => [a.lead_id, a])), [applications])

  function leadState(lead: Lead): string {
    const app = appMap.get(lead.id)
    if (app && app.status !== 'saved') return 'applied'
    if (app?.status === 'saved') return 'saved'
    if (viewedIds.has(lead.id)) return 'viewed'
    return 'new'
  }

  const filtered = useMemo(() => {
    let ls = leads.slice()
    if (search) { const q = search.toLowerCase(); ls = ls.filter(l => l.title.toLowerCase().includes(q) || (l.description || '').toLowerCase().includes(q)) }
        if (sourceFilter !== 'all') ls = ls.filter(l => srcKey(l.source_url || '') === sourceFilter)
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
  }, [leads, search, sourceFilter, scoreFilter, easyFilters, profile, viewedIds, savedIds, sortMode])

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
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  function topReason(lead: Lead): string {
    const m = computeMatchExplanation(lead, profile)
    const sorted = [...m.subScores].sort((a, b) => b.value - a.value)
    const top = sorted[0]
    const lo = sorted[sorted.length - 1]
    const label = top.label.toLowerCase()
    if (lo.value <= 3)
      return `<strong>Strong ${label}</strong> — ${top.value}/10 on fit · weaker on ${lo.label.toLowerCase()}`
    return `<strong>Strong ${label}</strong> — scores ${top.value}/10 on fit`
  }

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
      const subKey = label.toLowerCase().includes('skill') ? 'skill' : label.toLowerCase().includes('rate') ? 'rate' : label.toLowerCase().includes('recency') ? 'recency' : 'detail'
      const detailMap: Record<string, string> = {
        skill: `${m.skillMatch.matched.length} of ${m.skillMatch.matched.length + m.skillMatch.missing.length} required skills match your profile`,
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
    const existing = appMap.get(lead.id)
    if (existing?.status === 'saved') {
      const r = await fetch('/api/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id }) })
      if (r.ok) {
        setApplications(prev => prev.filter(a => a.lead_id !== lead.id))
        setSavedIds(prev => { const n = new Set(prev); n.delete(lead.id); return n })
        toast('Removed from saved')
      }
    } else {
      const r = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: lead.id, status: 'saved' }) })
      if (r.ok) {
        const app = await r.json()
        setApplications(prev => [...prev.filter(a => a.lead_id !== lead.id), app])
        setSavedIds(prev => new Set(prev).add(lead.id))
        toast('Saved for later')
      }
    }
  }

  const handleApply = async (lead: Lead) => {
    if (isFree && appCount >= 5) {
      showLimit()
      return
    }
    if (applyingId) return
    setApplyingId(lead.id)
    try {
      // add to pipeline via API
      const r = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, status: 'applied' }),
      })
      if (r.ok) {
        const app = await r.json()
        setApplications(prev => [...prev.filter(a => a.lead_id !== lead.id), app])
        toast('Applied — added to your pipeline')
      }
    } finally {
      setApplyingId(null)
    }
  }

  const showLimit = () => {
    const el = document.getElementById('page-inner')
    if (!el) return
    const div = document.createElement('div')
    div.id = 'limitModal'
    div.style.cssText = 'position:fixed;inset:0;background:rgba(21,32,26,.5);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px'
    div.onclick = (e) => { if ((e.target as HTMLElement).id === 'limitModal') div.remove() }
    div.innerHTML = `
      <div style="background:var(--card);border-radius:var(--r-xl);padding:32px;max-width:400px;text-align:center;box-shadow:var(--sh-lg)">
        <div class="empty-icon" style="margin-bottom:16px"><i class="ti ti-bolt"></i></div>
        <h3 class="display" style="font-size:20px;margin-bottom:8px">You've used all 5 free applications</h3>
        <p style="color:var(--slate);font-size:14px;line-height:1.55;margin-bottom:22px">Upgrade to <b style="color:var(--ink)">Starter (£15/mo)</b> for unlimited applications and direct source links — or go <b style="color:var(--ink)">Pro</b> for analytics and adjustable scoring.</p>
        <button class="btn btn-warm" style="width:100%;margin-bottom:9px" onclick="this.closest('#limitModal').remove();window.location.href='/dashboard/billing'">See plans</button>
        <button class="btn btn-ghost" style="width:100%" onclick="this.closest('#limitModal').remove()">Maybe later</button>
      </div>`
    el.prepend(div)
  }

  // Source health tracking
  const sourceStatus = useMemo(() => {
    const keys = ['reddit', 'reed', 'wwr', 'rok']
    return keys.map(k => {
      const matches = leads.filter(l => srcKey(l.source_url) === k)
      if (!matches.length) return { key: k, health: 'down', time: 'awaiting first scan' }
      const newest = Math.max(...matches.map(l => new Date(l.posted_date).getTime()))
      const mins = Math.floor((Date.now() - newest) / 60000)
      const time = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`
      return { key: k, health: mins > 720 ? 'slow' : 'ok', time }
    })
  }, [leads])

  if (loading) return <SkeletonFeed />

  const greetMap: Record<string, string> = {
    new: `Welcome, ${firstName}`,
    returning: `Good to see you, ${firstName}`,
    power: `Welcome back, ${firstName}`,
  }

  const subMap: Record<string, string> = {
    new: `Your profile is matched against <b>${leads.length || '1,247'} leads</b> scanned this week. Here are your first picks.`,
    returning: newCount ? `<b>${newCount} new leads</b> scored since your last visit.` : `You're all caught up — here's your ranked feed.`,
    power: `<b>${newCount} new leads</b> today. You've applied to <b>${appCount}</b> this month — keep the streak going.`,
  }

  const FREE_LIMIT = 5
  const leadCards = filtered.map((lead, idx) => {
    const isLocked = isFree && idx >= FREE_LIMIT
    const sc = computeMatchExplanation(lead, profile).score
    const si = srcInfo(lead.source_url)
    const state = leadState(lead)
    const stateBadge: Record<string, [string, string]> = { new: ['NEW', 'st-new'], viewed: ['VIEWED', 'st-viewed'], saved: ['SAVED', 'st-saved'], applied: ['APPLIED', 'st-applied'] }
    const saved = savedIds.has(lead.id)
    const applied = state === 'applied'
    const isTop = lead.id === topId && scoreFilter === 'all' && sourceFilter === 'all' && !search && sortMode === 'score'
    const skills = (lead.skills_required || []).slice(0, 3).map(sk => {
      const m = profile?.skills?.some(ps => ps.toLowerCase() === sk.toLowerCase())
      return <span key={sk} className={`skill ${m ? 'match' : ''}`}>{m ? <i className="ti ti-check"></i> : ''}{sk}</span>
    })
    if ((lead.skills_required?.length || 0) > 3) {
      skills.push(<span key="more" className="skill">+{(lead.skills_required?.length || 0) - 3}</span>)
    }
    const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
    const applicants = (lead as any).applicants || 3
    const proof = (
      <span className={`proof ${applicants > 5 ? 'hot' : 'cool'}`}>
        <i className={`ti ${applicants > 5 ? 'ti-flame' : 'ti-users'}`}></i>
        {applicants} applied{applicants > 5 ? ' · apply early' : ' so far'}
      </span>
    )

    return (
      <article key={lead.id} onClick={isLocked ? undefined : () => selectLead(lead)} tabIndex={isLocked ? -1 : undefined}
        className={`lead-card ${selected?.id === lead.id ? 'sel' : ''} ${isTop ? 'top-match' : ''} ${state === 'new' ? 'is-new' : ''}`}>
        <div className="lc-top">
          <span className="src-ava" style={{ background: si.ava }}>{si.ini}</span>
          <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
          {isTop
            ? <span className="crown"><i className="ti ti-crown"></i>TOP MATCH</span>
            : <span className={`state-badge ${stateBadge[state][1]}`}>{stateBadge[state][0]}</span>}
          <span className="lc-time">{timeAgo(lead.posted_date)}</span>
        </div>
        <div className="lc-title">
          {gaugeSVG(sc)}
          <span className="tt">{lead.title}</span>
        </div>
        <div className="why-inline"><i className="ti ti-sparkles"></i><span dangerouslySetInnerHTML={{ __html: topReason(lead) }} /></div>
        <p className="lc-desc">{lead.description}</p>
        <div className="lc-meta">
          {budget && <span className="budget"><i className="ti ti-currency-pound"></i>{budget}</span>}
          {lead.client_location && <span className="meta-chip"><i className="ti ti-map-pin"></i>{lead.client_location}</span>}
          {proof}
        </div>
        <div className="skills-row">{skills}</div>
        <div className="lc-actions" onClick={e => e.stopPropagation()}>
          <button className={`lc-save-btn ${saved ? 'on' : ''}`} aria-label={saved ? 'Remove from saved' : 'Save for later'} onClick={() => toggleSave(lead)}>
            <i className="ti ti-bookmark"></i>
            {saved && <span className="lc-save-lbl">Saved</span>}
          </button>
          {applied
            ? <button className="applied-tag applied-tag-btn" onClick={() => router.push('/dashboard/applied')}><i className="ti ti-circle-check-filled"></i> In your pipeline <i className="ti ti-arrow-right applied-tag-arrow"></i></button>
            : <>
                <button className="btn btn-primary" title="Direct link · no commission" disabled={applyingId === lead.id} onClick={() => handleApply(lead)}>
                  {applyingId === lead.id ? <LoadingDots label="Applying" /> : <><i className="ti ti-send"></i> Apply</>}
                </button>
                <button className="btn btn-ghost" onClick={() => selectLead(lead)}>Full breakdown</button>
              </>}
        </div>
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

      <div className="feed-header">
        <div className="feed-header-left">
          <h2 className="feed-title">{greetMap[seg]}</h2>
          <p className="feed-sub" dangerouslySetInnerHTML={{ __html: subMap[seg] }} />
        </div>
        <div className="feed-kpis">
          <span className="fk"><span className="fk-v">{leads.length}</span><span className="fk-l">leads</span></span>
          <span className="fk-sep" />
          <span className="fk"><span className="fk-v">{score7plus}</span><span className="fk-l">scored 7+</span></span>
          <span className="fk-sep" />
          <span className="fk"><span className="fk-v" style={{ color: topScore >= 8 ? 'var(--hi)' : 'var(--mid)' }}>{topScore > 0 ? topScore : '—'}</span><span className="fk-l">top score</span></span>
        </div>
      </div>

      <RefreshBar plan={plan as Tier} lastScanAt={lastScanAt} />

      <div className="toolbar">
        <div className="toolbar-group">
          {([['score', 'Best match'], ['recent', 'Newest'], ['budget', 'Top budget']] as [string, string][]).map(([k, lbl]) => (
            <button key={k} className={`pill ${sortMode === k ? 'on' : ''}`} onClick={() => setSortMode(k as 'score' | 'recent' | 'budget')}>{lbl}</button>
          ))}
        </div>
        <div className="tool-sep"></div>
        <div className="toolbar-group">
          {([['all', 'All'], ['8', '8+'], ['7', '7+'], ['new', 'New'], ['saved', 'Saved']] as [string, string][]).map(([k, lbl]) => (
            <button key={k} className={`pill ${scoreFilter === k ? 'on' : ''}`} onClick={() => setScoreFilter(k)}>
              {lbl}{counts[k as keyof typeof counts] != null && <span className="ct">{counts[k as keyof typeof counts]}</span>}
            </button>
          ))}
        </div>
        <div className="tool-sep"></div>
        <div className="toolbar-group toolbar-sources">
          {([['all', 'All', null], ['reddit', 'Reddit', 'var(--reddit)'], ['reed', 'Reed', 'var(--reed)'], ['wwr', 'WWR', 'var(--wwr)'], ['rok', 'Remote OK', 'var(--rok)']] as [string, string, string | null][]).map(([k, lbl, dot]) => (
            <button key={k} className={`pill src-pill ${sourceFilter === k ? 'on' : ''}`} onClick={() => setSourceFilter(k)}>
              {dot && <span className="sd" style={{ background: dot }}></span>}{lbl}
            </button>
          ))}
        </div>
        <div className="tool-sep"></div>
        <div className="toolbar-group">
          {([['direct', 'Direct apply', 'ti-mail-forward'], ['beginner', 'Beginner-friendly', 'ti-seedling'], ['fresh', 'Fresh < 6h', 'ti-flame']] as [string, string, string][]).map(([k, lbl, icon]) => (
            <button key={k} className={`pill easy-pill ${easyFilters.has(k) ? 'on' : ''}`} onClick={() => toggleEasy(k)} title={lbl}>
              <i className={`ti ${icon}`}></i>{lbl}
              {easyCounts[k as keyof typeof easyCounts] != null && <span className="ct">{easyCounts[k as keyof typeof easyCounts]}</span>}
            </button>
          ))}
        </div>
        {ent.csvExport && (
          <>
            <div className="tool-sep"></div>
            <div className="toolbar-group">
              <button className="pill easy-pill" onClick={handleExport} disabled={exporting} title="Export your leads as CSV">
                {exporting ? <LoadingDots label="Exporting" /> : <><i className="ti ti-download"></i> Export CSV</>}
              </button>
            </div>
          </>
        )}
      </div>

      {filtered.length === 0 && leads.length > 0 && (
        <div className="empty-filter">
          <i className="ti ti-filter-off"></i>
          <p>No leads match this filter.</p>
          <button className="pill" onClick={() => { setScoreFilter('all'); setSourceFilter('all'); setEasyFilters(new Set()) }}>Clear filters</button>
        </div>
      )}

      {leads.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><i className="ti ti-radar"></i></div>
          <h3>Your pipeline starts here</h3>
          <p>We're scanning Reddit, Reed, We Work Remotely and Remote OK right now. Your first scored leads usually arrive within 30 minutes — we'll email you as soon as they do.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
            <button onClick={async () => {
              const res = await fetch('/api/leads/seed?force=1', { method: 'POST' })
              if (res.ok) { router.refresh() } else { const d = await res.json(); toast.error(d.error || 'Failed to seed leads') }
            }} className="btn btn-primary" style={{ display: 'inline-flex' }}>Generate demo leads</button>
            <button onClick={() => router.refresh()} className="btn btn-ghost" style={{ display: 'inline-flex' }}>Check now</button>
          </div>
        </div>
      )}

      <div className={`feed-wrap ${selected ? 'detail-open' : ''}`}>
        <div className="feed-list">
          {isFree && filtered.length > FREE_LIMIT
            ? <>
                {leadCards.slice(0, FREE_LIMIT)}
                <div className="free-gate">
                  <div className="free-gate-blur" aria-hidden="true">
                    {[
                      { ava: '#FF6B3D', ini: 'R', cls: 'sb-reddit', src: 'REDDIT', sc: 9.4, title: 'Senior Product Designer — Fintech', why: 'Strong match — high budget, clear scope', desc: 'Looking for a product designer to own end-to-end flows for our payments app. Figma, prototyping and a sharp eye for detail.', budget: '£450–550/day', loc: 'Remote · UK', skills: ['Figma', 'UI/UX', 'Prototyping'] },
                      { ava: '#6EA8D4', ini: 'W', cls: 'sb-wwr', src: 'WWR', sc: 9.1, title: 'Full-Stack Engineer — AI Startup', why: 'Great fit — your stack, strong budget', desc: 'Series-A AI startup hiring a contract full-stack engineer. React/Node, ships fast, async-first remote team.', budget: '£600/day', loc: 'Remote', skills: ['React', 'Node', 'TypeScript'] },
                      { ava: '#B08ADB', ini: 'R', cls: 'sb-reed', src: 'REED', sc: 8.8, title: 'Brand Strategist — DTC Skincare', why: 'Solid match — budget meets your rate', desc: 'Fast-growing skincare brand needs a strategist to shape positioning and voice ahead of a major launch.', budget: '£3,200/mo', loc: 'Hybrid · London', skills: ['Branding', 'Strategy', 'Copy'] },
                      { ava: '#5EC49E', ini: 'R', cls: 'sb-rok', src: 'REMOTE OK', sc: 9.2, title: 'Motion Designer — Ad Agency', why: 'Excellent match — premium day rate', desc: 'Award-winning agency needs a motion designer for a 6-week campaign sprint. After Effects, bold creative direction.', budget: '£400/day', loc: 'Remote', skills: ['After Effects', 'Motion', 'Cinema 4D'] },
                      { ava: '#FF6B3D', ini: 'R', cls: 'sb-reddit', src: 'REDDIT', sc: 8.6, title: 'Webflow Developer — SaaS Marketing', why: 'Strong fit — clear brief, fast start', desc: 'Build and maintain a marketing site for a B2B SaaS. Webflow, light JS, CMS collections. Ongoing retainer available.', budget: '£55–70k', loc: 'Remote · EU', skills: ['Webflow', 'JavaScript', 'CMS'] },
                      { ava: '#6EA8D4', ini: 'W', cls: 'sb-wwr', src: 'WWR', sc: 9.0, title: 'Content Designer — Health Tech', why: 'Great match — values your niche', desc: 'Health-tech scale-up needs a content designer to craft in-product copy and design systems documentation.', budget: '£380/day', loc: 'Remote · UK', skills: ['UX Writing', 'Figma', 'Docs'] },
                    ].map((f, i) => (
                      <div key={`fg-${i}`} className="lead-card fg-preview-card">
                        <div className="lc-top">
                          <span className="src-ava" style={{ background: f.ava }}>{f.ini}</span>
                          <span className={`src-badge ${f.cls}`}>{f.src}</span>
                          <span className="state-badge st-new">NEW</span>
                          <span className="lc-time">2h ago</span>
                        </div>
                        <div className="lc-title">{gaugeSVG(f.sc)}<span className="tt">{f.title}</span></div>
                        <div className="why-inline"><i className="ti ti-sparkles" /><span>{f.why}</span></div>
                        <p className="lc-desc">{f.desc}</p>
                        <div className="lc-meta">
                          <span className="budget"><i className="ti ti-currency-pound" />{f.budget}</span>
                          <span className="meta-chip"><i className="ti ti-map-pin" />{f.loc}</span>
                        </div>
                        <div className="skills-row">
                          {f.skills.map(s => <span key={s} className="skill">{s}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="free-gate-cta">
                    <div className="free-gate-panel">
                      <span className="fg-pro"><i className="ti ti-sparkles" /> PRO</span>
                      <span className="fg-lock"><i className="ti ti-crown" /></span>
                      <div className="fg-stat">
                        <span className="fg-stat-num">{filtered.length - FREE_LIMIT}</span>
                        <span className="fg-stat-lbl">more leads scored for you</span>
                      </div>
                      {(() => {
                        const hi = filtered.slice(FREE_LIMIT).filter(l => computeMatchExplanation(l, profile).score >= 8).length
                        return hi > 0
                          ? <p className="fg-sub">including <strong>{hi} scoring 8+</strong> — your strongest matches, ready to apply.</p>
                          : <p className="fg-sub">Unlock your full feed to see every match — with direct apply links and no daily limits.</p>
                      })()}
                      <button className="fg-btn" onClick={() => router.push('/dashboard/billing')}>Unlock all leads</button>
                      <span className="fg-hint">From £15/mo · cancel any time</span>
                    </div>
                  </div>
                </div>
              </>
            : leadCards}
        </div>

        {selected && (() => {
          const l = selected
          const m = computeMatchExplanation(l, profile)
          const sc = m.score
          const si = srcInfo(l.source_url)
          const budget = formatBudgetGBP(l.budget_min, l.budget_max)
          const applied = leadState(l) === 'applied'
          const saved = savedIds.has(l.id)
          const matchCount = m.skillMatch.matched.length
          const totalSkills = (l.skills_required || []).length
          const ageH = (Date.now() - new Date(l.posted_date).getTime()) / 3600000
          const ageLabel = ageH < 1 ? `${Math.round(ageH * 60)}m ago`
            : ageH < 24 ? `${Math.round(ageH)}h ago`
            : `${Math.round(ageH / 24)}d ago`
          const ageCol = ageH < 24 ? 'var(--hi)' : ageH < 96 ? 'var(--mid)' : 'var(--coral)'
          const applicants = (l as any).applicants || 3

          return (
            <aside className="detail-panel"
              onTouchStart={e => { touchStartY.current = e.touches[0].clientY }}
              onTouchEnd={e => { if (e.changedTouches[0].clientY - touchStartY.current > 80) closeDetail() }}>

              <div className="dp-handle" aria-hidden="true"><div className="dp-handle-bar" /></div>

              {/* ── COMPACT HEADER ── */}
              <div className="dp-header">
                <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
                <span className="dp-score-chip" style={{ color: scoreChipColor(sc), borderColor: `${scoreChipColor(sc)}33` }}>
                  {sc}
                </span>
                <div className="dp-header-actions">
                  {l.source_url && isPro && (
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

                {/* 1. Title */}
                <h2 className="dp-title">{l.title}</h2>

                {/* 2. Verdict — one sentence */}
                <div className="dp-verdict-line" style={{ borderLeftColor: verdictBorderColor(sc) }}>
                  {verdictSentence(m, sc)}
                </div>

                {/* 3. Meta strip — icons only, no emojis */}
                <div className="dp-meta-strip">
                  {budget && <span className="dp-meta-budget"><i className="ti ti-currency-pound" />{budget}</span>}
                  {l.client_location && <span className="dp-meta-item"><i className="ti ti-map-pin" />{l.client_location}</span>}
                  {l.project_type && <span className="dp-meta-item"><i className="ti ti-briefcase" />{l.project_type}</span>}
                  <span className="dp-meta-item" style={{ color: ageCol }}><i className="ti ti-clock" />{ageLabel}</span>
                  <span className="dp-meta-item" style={{ color: applicants > 5 ? 'var(--coral)' : 'var(--slate)' }}>
                    <i className={`ti ${applicants > 5 ? 'ti-flame' : 'ti-users'}`} />{applicants} applied
                  </span>
                </div>

                <div className="dp-rule" />

                {/* 4. Description — no label, just the brief */}
                <p className="dp-desc">{l.description}</p>

                {/* 5. Skills */}
                {totalSkills > 0 && <>
                  <div className="dp-rule" />
                  <div className="dp-skills-head">
                    <span className="dp-skills-lbl">Skills</span>
                    <span className="dp-skills-ratio" style={{ color: matchCount === totalSkills ? 'var(--hi)' : 'var(--mid)' }}>
                      {matchCount} of {totalSkills} matched
                    </span>
                  </div>
                  <div className="skill-detail" style={{ marginTop: 10 }}>
                    {m.skillMatch.matched.map(s => <span key={s} className="skill-yes"><i className="ti ti-check" />{s}</span>)}
                    {m.skillMatch.missing.map(s => <span key={s} className="skill-no">{s}</span>)}
                  </div>
                </>}

                {/* 6. Source */}
                <div className="dp-rule" />
                {isPro
                  ? <a className="btn btn-ghost" style={{ width: '100%' }} href={l.source_url || '#'} target="_blank" rel="noopener noreferrer">
                      <i className="ti ti-external-link" /> Open original listing
                    </a>
                  : <div className="lock-card" style={{ margin: 0 }}>
                      <div className="lk-icon"><i className="ti ti-lock" /></div>
                      <div><h4>Source hidden on Free</h4><p>Upgrade to see where to apply.</p></div>
                    </div>}
              </div>

              {/* ── STICKY FOOTER ── */}
              <div className="dp-foot">
                {applied
                  ? <button className="applied-tag applied-tag-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => router.push('/dashboard/applied')}>
                      <i className="ti ti-circle-check-filled" /> Tracking in your pipeline <i className="ti ti-arrow-right applied-tag-arrow" />
                    </button>
                  : <button className="btn btn-primary" style={{ width: '100%' }} disabled={applyingId === l.id} onClick={() => handleApply(l)}>
                      {applyingId === l.id ? <LoadingDots label="Applying" /> : <><i className="ti ti-send" /> Apply &amp; track</>}
                    </button>}
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => toggleSave(l)}>
                  {saved ? <><i className="ti ti-bookmark" /> Saved</> : <><i className="ti ti-bookmark" /> Save for later</>}
                </button>
                {!applied && <p className="dp-foot-note">Direct link · no commission · no fee</p>}
              </div>
            </aside>
          )
        })()}

        {filtered.length === 0 && leads.length > 0 && (
          <div className="empty">
            <div className="empty-icon"><i className="ti ti-filter-off"></i></div>
            <h3>No leads match these filters</h3>
            <p>Try widening your score threshold or switching sources.</p>
            <button className="btn btn-ghost" style={{ display: 'inline-flex' }} onClick={() => { setScoreFilter('all'); setSourceFilter('all'); setSearch(''); setEasyFilters(new Set()) }}>Clear filters</button>
          </div>
        )}
      </div>

    </>
  )
}
