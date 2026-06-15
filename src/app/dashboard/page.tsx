'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { formatBudgetGBP, timeAgo } from '@/lib/utils'
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

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Lead | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [newCount, setNewCount] = useState(0)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createClient()

  const appCount = applications.filter(a => a.status !== 'saved').length
  const isFree = profile?.subscription_status === 'free'
  const plan = profile?.subscription_status || 'free'
  const isPro = plan === 'pro' || plan === 'max' || plan === 'team'

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
    return ls.sort((a, b) => computeMatchExplanation(b, profile).score - computeMatchExplanation(a, profile).score)
  }, [leads, search, sourceFilter, scoreFilter, profile, viewedIds, savedIds])

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

  function userSegment() {
    if (appCount >= 10) return 'power'
    if (appCount >= 1) return 'returning'
    return 'new'
  }

  const seg = userSegment()
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  function topReason(lead: Lead): string {
    const m = computeMatchExplanation(lead, profile)
    const sorted = [...m.subScores].sort((a, b) => b.value - a.value)
    const top = sorted[0]
    const lo = sorted[sorted.length - 1]
    const labels: Record<string, string> = { skill: 'skill match', rate: 'rate match', recency: 'freshness', detail: 'detail' }
    if (lo.value <= 4) return `Strong ${labels[top.label.toLowerCase()] || top.label} (${top.value}/10), weaker on ${labels[lo.label.toLowerCase()] || lo.label}`
    return `Strong ${labels[top.label.toLowerCase()] || top.label} — scores ${top.value}/10 on fit`
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

  const closeDetail = () => setSelected(null)

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

  if (loading) {
    return (
      <div style={{ height: 18 }}></div>
    )
  }

  const greetMap: Record<string, string> = {
    new: `Welcome, ${firstName} 👋`,
    returning: `Good to see you, ${firstName} 👋`,
    power: `Welcome back, ${firstName} 👋`,
  }

  const subMap: Record<string, string> = {
    new: `Your profile is matched against <b>1,247 leads</b> scanned this week. Here are your first picks.`,
    returning: newCount ? `<span class="hl">${newCount} new leads</span> scored since your last visit.` : `You're all caught up — here's your ranked feed.`,
    power: `<span class="hl">${newCount} new</span> today. You've applied to ${appCount} this month — keep the streak going.`,
  }

  const leadCards = filtered.map(lead => {
    const sc = computeMatchExplanation(lead, profile).score
    const si = srcInfo(lead.source_url)
    const state = leadState(lead)
    const stateBadge: Record<string, [string, string]> = { new: ['NEW', 'st-new'], viewed: ['VIEWED', 'st-viewed'], saved: ['SAVED', 'st-saved'], applied: ['APPLIED', 'st-applied'] }
    const saved = savedIds.has(lead.id)
    const applied = state === 'applied'
    const isTop = lead.id === topId && scoreFilter === 'all' && sourceFilter === 'all' && !search
    const skills = (lead.skills_required || []).slice(0, 3).map(sk => {
      const m = profile?.skills?.some(ps => ps.toLowerCase() === sk.toLowerCase())
      return <span key={sk} className={`skill ${m ? 'match' : ''}`}>{m ? <i className="ti ti-check"></i> : ''}{sk}</span>
    })
    if ((lead.skills_required?.length || 0) > 3) {
      skills.push(<span key="more" className="skill">+{(lead.skills_required?.length || 0) - 3}</span>)
    }
    const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
    const proof = (
      <span className="proof cool"><i className="ti ti-users"></i>{(lead as any).applicants || 3} applied so far</span>
    )

    return (
      <article key={lead.id} onClick={() => selectLead(lead)}
        className={`lead-card ${selected?.id === lead.id ? 'sel' : ''} ${isTop ? 'top-match' : ''}`}>
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
          {budget && <span className="budget">{budget}</span>}
          {lead.client_location && <span className="meta-chip"><i className="ti ti-map-pin"></i>{lead.client_location}</span>}
          {proof}
        </div>
        <div className="skills-row">{skills}</div>
        <div className="lc-actions" onClick={e => e.stopPropagation()}>
          <button className={`btn-icon tip ${saved ? 'on' : ''}`} data-tip={saved ? 'Remove from saved' : 'Save for later'} aria-label={saved ? 'Remove from saved' : 'Save for later'} onClick={() => toggleSave(lead)}>
            <i className={`ti ti-bookmark${saved ? '-filled' : ''}`}></i>
          </button>
          {applied
            ? <span className="applied-tag"><i className="ti ti-circle-check-filled"></i> In your pipeline</span>
            : <>
                <button className="btn btn-primary" onClick={() => handleApply(lead)}><i className="ti ti-send"></i> Apply</button>
                <button className="btn btn-ghost" onClick={() => selectLead(lead)}>Full breakdown</button>
              </>}
        </div>
      </article>
    )
  })

  return (
    <>
      {!profile?.skills?.length ? (
        <div className="profile-banner">
          <i className="ti ti-alert-triangle"></i>
          <div className="pb-txt"><b>Finish your profile</b> — add your skills and rate so we can score leads for you.</div>
          <a onClick={() => router.push('/dashboard/profile')}>Complete profile</a>
        </div>
      ) : (
        (() => {
          if (seg === 'new') return (
            <div className="seg-banner seg-new"><i className="ti ti-rocket"></i>
              <div className="sb-txt"><b>You're set up.</b> We've scored every open lead against your skills and rate — your strongest matches are crowned below.</div>
            </div>
          )
          if (seg === 'power') return (
            <div className="seg-banner seg-power"><i className="ti ti-bolt"></i>
              <div className="sb-txt"><b>You're on a roll.</b> Power users who apply within 2 hours hear back 3× more often — your fastest matches are up top.</div>
            </div>
          )
          return null
        })()
      )}

      <div className="greeting">
        <h2>{greetMap[seg]}</h2>
        <p dangerouslySetInnerHTML={{ __html: subMap[seg] }} />
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="s-label"><i className="ti ti-radar-2"></i> Scanned this week</div>
          <div className="s-val">1,247</div>
          <span className="s-delta up"><i className="ti ti-trending-up"></i> 12% vs last week</span>
        </div>
        <div className="stat">
          <div className="s-label"><i className="ti ti-flame"></i> Matched 7+</div>
          <div className="s-val">{score7plus}</div>
          <span className="s-delta up"><i className="ti ti-arrow-up-right"></i> 3 new today</span>
        </div>
        <div className="stat">
          <div className="s-label"><i className="ti ti-award"></i> Top score</div>
          <div className="s-val">{topScore > 0 ? topScore : '—'}<span className="unit">/10</span></div>
          <span className="s-delta" style={{ color: 'var(--slate-2)' }}>your best match</span>
        </div>
        <div className="stat">
          <div className="s-label"><i className="ti ti-bookmark"></i> Saved</div>
          <div className="s-val">{savedIds.size}</div>
          <span className="s-delta" style={{ color: 'var(--slate-2)' }}>{savedIds.size ? 'ready to revisit' : 'none yet'}</span>
        </div>
      </div>

      <div className="source-strip">
        {sourceStatus.map(s => {
          const si = SRC[s.key as keyof typeof SRC] || { name: s.key }
          const labelMap: Record<string, string> = { ok: '', slow: '', down: 'awaiting first scan' }
          return (
            <div key={s.key} className="src-tile">
              <span className={`src-dot ${s.health}`}></span>
              <div>
                <div className="st-name">{si.name}</div>
                <div className="st-time">{s.health === 'down' ? labelMap[s.health] : `Last scan: ${s.time}`}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="toolbar">
        {([['all', 'All'], ['8', 'Score 8+'], ['7', 'Score 7+'], ['new', 'New'], ['saved', 'Saved']] as [string, string][]).map(([k, lbl]) => (
          <button key={k} className={`pill ${scoreFilter === k ? 'on' : ''}`} onClick={() => setScoreFilter(k)}>
            {lbl}{counts[k as keyof typeof counts] != null && <span className="ct">{counts[k as keyof typeof counts]}</span>}
          </button>
        ))}
        <div className="tool-sep"></div>
        {([['all', 'All sources', null], ['reddit', 'Reddit', 'var(--reddit)'], ['reed', 'Reed', 'var(--reed)'], ['wwr', 'WWR', 'var(--wwr)'], ['rok', 'Remote OK', 'var(--rok)']] as [string, string, string | null][]).map(([k, lbl, dot]) => (
          <button key={k} className={`pill src-pill ${sourceFilter === k ? 'on' : ''}`} onClick={() => setSourceFilter(k)}>
            {dot && <span className="sd" style={{ background: dot }}></span>}{lbl}
          </button>
        ))}
      </div>

      {leads.length === 0 && (
        <div className="empty">
          <div className="empty-icon"><i className="ti ti-radar"></i></div>
          <h3>We're scanning 4 sources for you</h3>
          <p>Your first scored leads appear within 30 minutes — we'll email you when they're ready.</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'center' }}>
            <button onClick={async () => {
              const res = await fetch('/api/leads/seed?force=1', { method: 'POST' })
              if (res.ok) { router.refresh() } else { const d = await res.json(); toast.error(d.error || 'Failed to seed leads') }
            }} className="btn btn-primary" style={{ display: 'inline-flex' }}><i className="ti ti-flask"></i> Generate demo leads</button>
            <button onClick={() => router.refresh()} className="btn btn-ghost" style={{ display: 'inline-flex' }}><i className="ti ti-refresh"></i> Check now</button>
          </div>
        </div>
      )}

      <div className={`feed-wrap ${selected ? 'detail-open' : ''}`}>
        <div className="feed-list">
          {leadCards}
        </div>

        {selected && (() => {
          const l = selected
          const sc = computeMatchExplanation(l, profile).score
          const si = srcInfo(l.source_url)
          const budget = formatBudgetGBP(l.budget_min, l.budget_max)
          const applied = leadState(l) === 'applied'
          const saved = savedIds.has(l.id)
          const m = computeMatchExplanation(l, profile)
          return (
            <aside className="detail-panel">
              <div className="dp-head">
                <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
                {gaugeSVG(sc)}
                <button className="dp-close tip" data-tip="Close" aria-label="Close detail" onClick={closeDetail}><i className="ti ti-x"></i></button>
              </div>
              <div className="dp-body">
                <nav className="crumbs" aria-label="Breadcrumb">
                  <a onClick={closeDetail}>Feed</a><span className="sep">›</span>
                  <span className="here">{si.name}</span><span className="sep">›</span>
                  <span className="here">Lead detail</span>
                </nav>
                <div className="dp-title">{l.title}</div>
                <div className="dp-sub"><i className="ti ti-map-pin" style={{ fontSize: 14 }}></i>{l.client_location} · {l.project_type} · {timeAgo(l.posted_date)}</div>
                {budget && <div className="lc-meta"><span className="budget">{budget}</span></div>}

                <div className="dp-section-label">Why this score</div>
                <div className="dp-why">
                  <div className="dp-why-expl">{m.why}</div>
                  <div className="subscore-full">{subBars(l, true)}</div>
                </div>

                <div className="dp-section-label">Skill match</div>
                <div className="skill-detail">
                  {m.skillMatch.matched.map(s => <span key={s} className="skill-yes"><i className="ti ti-check"></i>{s}</span>)}
                  {m.skillMatch.missing.map(s => <span key={s} className="skill-no">{s}</span>)}
                </div>

                <div className="dp-section-label">Description</div>
                <p className="dp-desc">{l.description}</p>

                <div className="dp-section-label">Source</div>
                {isPro
                  ? <a className="btn btn-ghost" style={{ width: '100%' }} href={l.source_url || '#'} target="_blank" rel="noopener noreferrer"><i className="ti ti-external-link"></i> Open original listing</a>
                  : <div className="lock-card" style={{ margin: 0 }}><div className="lk-icon"><i className="ti ti-lock"></i></div><div><h4>Source hidden on Free</h4><p>Upgrade to apply directly at the source.</p></div></div>}
              </div>
              <div className="dp-actions">
                {applied
                  ? <span className="applied-tag" style={{ justifyContent: 'center' }}><i className="ti ti-circle-check-filled"></i> Tracking in your pipeline</span>
                  : <>
                      <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => handleApply(l)}><i className="ti ti-send"></i> Apply & track</button>
                      <div className="reassure" style={{ borderTop: 'none', paddingTop: 0, marginTop: 2, justifyContent: 'center' }}>
                        <span><i className="ti ti-shield-check"></i>No fee — ever</span>
                        <span><i className="ti ti-mail-fast"></i>Avg reply in 2 days</span>
                      </div>
                    </>}
                <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => toggleSave(l)}>
                  {saved ? <><i className="ti ti-bookmark-filled"></i> Saved</> : <><i className="ti ti-bookmark"></i> Save for later</>}
                </button>
              </div>
            </aside>
          )
        })()}

        {filtered.length === 0 && leads.length > 0 && (
          <div className="empty">
            <div className="empty-icon"><i className="ti ti-filter-off"></i></div>
            <h3>No leads match these filters</h3>
            <p>Try widening your score threshold or switching sources.</p>
            <button className="btn btn-ghost" style={{ display: 'inline-flex' }} onClick={() => { setScoreFilter('all'); setSourceFilter('all'); setSearch('') }}>Clear filters</button>
          </div>
        )}
      </div>

      {isFree && filtered.length > 5 && (
        <div className="upgrade-card">
          <div className="upgrade-icon"><i className="ti ti-sparkles" /></div>
          <div className="upgrade-body">
            <h3>More leads scored for you</h3>
            <p>Upgrade to see every match with direct source links, unlimited applications, and weekly analytics.</p>
          </div>
          <button onClick={() => router.push('/dashboard/billing')} className="btn btn-primary upgrade-btn">
            View plans <i className="ti ti-arrow-right" />
          </button>
        </div>
      )}
    </>
  )
}
