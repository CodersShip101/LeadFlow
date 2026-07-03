'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, formatDate } from '@/lib/utils'
import { entitlementsFor, type Tier } from '@/lib/tiers'

const SRC: Record<string, { name: string; cls: string; ava: string }> = {
  reddit: { name: 'Reddit', cls: 'sb-reddit', ava: '#FF5A3C' },
  reed:   { name: 'Reed',   cls: 'sb-reed',   ava: '#3B7BE0' },
  wwr:    { name: 'WWR',    cls: 'sb-wwr',     ava: '#E8A020' },
  rok:    { name: 'Remote OK', cls: 'sb-rok',  ava: '#9B6BE0' },
}

function srcKey(url: string | null): string {
  const l = (url || '').toLowerCase()
  if (l.includes('reddit')) return 'reddit'
  if (l.includes('reed')) return 'reed'
  if (l.includes('weworkremotely') || l.includes('wwr')) return 'wwr'
  return 'rok'
}

const STAGES = [
  { key: 'interested', label: 'Interested', icon: 'ti-eye' },
  { key: 'applied',    label: 'Applied',    icon: 'ti-send' },
  { key: 'in_talks',   label: 'In talks',   icon: 'ti-messages' },
  { key: 'hired',      label: 'Won',        icon: 'ti-trophy' },
]

const stageIdx = (s: string) => STAGES.findIndex(x => x.key === s)

function scoreColor(v: number) {
  if (v >= 8) return 'var(--hi)'
  if (v >= 5) return 'var(--mid)'
  return 'var(--slate)'
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<Lead | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFull, setShowFull] = useState(false)
  const [copied, setCopied] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [savingReminder, setSavingReminder] = useState(false)
  const [pitch, setPitch] = useState<string | null>(null)
  const [clientLeads, setClientLeads] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const [leadRes, profileRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
      ])
      if (leadRes.error || !leadRes.data) { toast.error('Lead not found'); router.push('/dashboard'); return }
      setLead(leadRes.data)
      setProfile(profileRes.data)

      // Client intel: other posts by the same client in the lead pool.
      if (leadRes.data.client_name) {
        supabase.from('leads')
          .select('id, title, budget_min, budget_max, posted_date, status')
          .eq('client_name', leadRes.data.client_name)
          .neq('id', leadRes.data.id)
          .order('posted_date', { ascending: false })
          .limit(6)
          .then(({ data }) => setClientLeads(data || []))
      }
      const res = await fetch('/api/applications')
      if (res.ok) {
        const apps: Application[] = await res.json()
        const mine = apps.find(a => a.lead_id === id) || null
        setApplication(mine)
        const fu = (mine as { follow_up_at?: string } | null)?.follow_up_at
        if (fu) setFollowUp(new Date(fu).toISOString().slice(0, 16))
        const fn = (mine as { follow_up_note?: string } | null)?.follow_up_note
        if (fn) setReminderNote(fn)
      }
      setLoading(false)
    }
    load()
  }, [id, supabase, router])

  const updateApp = useCallback(async (status: string) => {
    if (status === 'remove') {
      const res = await fetch('/api/applications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id }) })
      if (res.ok) { setApplication(null); toast('Removed') }
      return
    }
    const res = await fetch('/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id, status }) })
    if (res.ok) { const app = await res.json(); setApplication(app); toast.success(status === 'hired' ? 'Marked as won!' : status === 'lost' ? 'Marked as lost' : 'Stage updated') }
  }, [id])

  const saveOutcome = useCallback(async (outcome: string) => {
    const res = await fetch('/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id, outcome }) })
    if (res.ok) { setApplication(await res.json()); toast.success('Saved') }
  }, [id])

  const saveReminder = useCallback(async () => {
    setSavingReminder(true)
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: id,
          follow_up_at: followUp ? new Date(followUp).toISOString() : null,
          follow_up_note: reminderNote || null,
        }),
      })
      if (res.ok) toast.success(followUp ? 'Follow-up reminder set' : 'Reminder cleared')
      else { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Could not save') }
    } finally { setSavingReminder(false) }
  }, [id, followUp, reminderNote])

  if (loading) return (
    <div className="ld-loading">
      <div className="ld-loading-dot" />
      <span>Loading lead&hellip;</span>
    </div>
  )

  if (!lead) return null

  const isPro = profile?.subscription_status !== 'free'
  const ent = entitlementsFor((profile?.subscription_status ?? 'free') as Tier)
  const si = SRC[srcKey(lead.source_url)]
  const m = computeMatchExplanation(lead, profile)
  const sc = m.score
  const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
  const appStatus = application?.status
  const currentStageIdx = appStatus && appStatus !== 'saved' ? stageIdx(appStatus) : -1
  const isSaved = appStatus === 'saved'
  const isInPipeline = appStatus && appStatus !== 'saved'
  const daysSince = application ? Math.floor((Date.now() - new Date(application.created_at).getTime()) / 86400000) : 0
  const showOutcomePrompt = application && daysSince >= 14 && !application.outcome
  const descLong = (lead.description || '').length > 400

  const ageH = (Date.now() - new Date(lead.posted_date).getTime()) / 3600000
  const ageLabel = ageH < 1 ? `${Math.round(ageH * 60)}m ago` : ageH < 24 ? `${Math.round(ageH)}h ago` : `${Math.round(ageH / 24)}d ago`

  // Compose a personalised pitch draft from the profile and this lead's data.
  // Deterministic (no AI call) — the user edits before sending.
  const draftPitch = () => {
    const matched = m.skillMatch.matched.slice(0, 4)
    const skillLine = matched.length > 0
      ? `I work with ${matched.join(', ')} daily, so your requirements map directly onto what I already do.`
      : `My background in ${profile?.disciplines?.[0]?.toLowerCase() || 'freelance work'} fits what you're describing.`
    const rateLine = profile?.hourly_rate ? `My rate is £${profile.hourly_rate}/hr. ` : ''
    const greeting = lead.client_name ? `Hi ${lead.client_name} team,` : 'Hi,'
    return `${greeting}

I saw your post for "${lead.title}" and it's a strong match. ${skillLine}

${rateLine}I can start quickly, and I'm happy to share relevant work or jump on a short call.

Best,
${profile?.full_name || ''}`.trim()
  }

  return (
    <div className="ld-page">

      {/* Back nav */}
      <button className="ld-back" onClick={() => router.back()}>
        <i className="ti ti-arrow-left" /> Back
      </button>

      {/* ── HERO CARD ── */}
      <div className="ld-hero">
        <div className="ld-hero-top">
          <span className={`src-badge ${si.cls}`}>{si.name.toUpperCase()}</span>
          {isInPipeline && (
            <span className="ld-status-pill">
              <i className={`ti ${STAGES[currentStageIdx]?.icon}`} />
              {STAGES[currentStageIdx]?.label}
            </span>
          )}
          <span className="ld-score-chip" style={{ color: scoreColor(sc), borderColor: `${scoreColor(sc)}40` }}>
            {sc}<span className="ld-score-denom">/10</span>
          </span>
        </div>

        <h1 className="ld-title">{lead.title}</h1>

        <div className="ld-meta">
          {budget && <span className="ld-meta-budget"><i className="ti ti-currency-pound" />{budget}</span>}
          {lead.client_location && <span className="ld-meta-chip"><i className="ti ti-map-pin" />{lead.client_location}</span>}
          {lead.project_type && <span className="ld-meta-chip"><i className="ti ti-briefcase" />{lead.project_type}</span>}
          <span className="ld-meta-chip"><i className="ti ti-clock" />{ageLabel}</span>
        </div>

        {/* Stage tracker */}
        {isInPipeline && (
          <div className="ld-stage-track">
            {STAGES.map((st, i) => {
              const done = currentStageIdx >= i
              const now = currentStageIdx === i
              const isNext = i === currentStageIdx + 1
              return (
                <div key={st.key} className="ld-stage-item">
                  {i > 0 && <div className={`ld-stage-line ${currentStageIdx >= i ? 'done' : ''}`} />}
                  <button
                    className={`ld-stage-dot ${done ? 'done' : ''} ${now ? 'now' : ''}`}
                    title={isNext ? `Move to ${st.label}` : st.label}
                    onClick={() => isNext && updateApp(st.key)}>
                    {done ? <i className={`ti ${now ? st.icon : 'ti-check'}`} /> : <span className="ld-stage-num">{i + 1}</span>}
                  </button>
                  <span className={`ld-stage-lbl ${now ? 'now' : ''}`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── PRIMARY ACTIONS ── */}
      <div className="ld-actions">
        {!isInPipeline
          ? <button className="btn btn-primary ld-act-main" onClick={() => updateApp('interested')}>
              <i className="ti ti-send" /> Add to pipeline
            </button>
          : currentStageIdx < STAGES.length - 1
            ? <button className="btn btn-primary ld-act-main" onClick={() => updateApp(STAGES[currentStageIdx + 1].key)}>
                <i className={`ti ${STAGES[currentStageIdx + 1].icon}`} /> Mark as {STAGES[currentStageIdx + 1].label}
              </button>
            : <div className="ld-act-won"><i className="ti ti-trophy" /> Marked as won</div>}

        <button className="btn btn-ghost" onClick={() => setPitch(p => p === null ? draftPitch() : null)}>
          <i className="ti ti-pencil-bolt" /> Draft pitch
        </button>

        {isPro && lead.source_url && (
          <a href={lead.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            <i className="ti ti-external-link" /> Open listing
          </a>
        )}

        {isPro && lead.source_url && (
          <button className="btn-icon" title={copied ? 'Copied!' : 'Copy link'} onClick={async () => { await navigator.clipboard.writeText(lead.source_url!); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
            <i className={`ti ${copied ? 'ti-check' : 'ti-copy'}`} />
          </button>
        )}

        <button className={`btn-icon ${isSaved ? 'on' : ''}`} title={isSaved ? 'Saved' : 'Save for later'} onClick={() => updateApp(isSaved ? 'remove' : 'saved')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'var(--lime-deep)' : 'none'} stroke={isSaved ? 'var(--lime-deep)' : 'var(--ink-2)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 7v14l-6-4-6 4V7a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4z"/>
          </svg>
        </button>
      </div>

      {/* ── PITCH DRAFT ── */}
      {pitch !== null && (
        <div className="ld-card">
          <div className="ld-verdict-label"><i className="ti ti-pencil-bolt" />Pitch draft — edit before sending</div>
          <textarea className="ld-pitch-ta" value={pitch} onChange={e => setPitch(e.target.value)} rows={9} />
          <div className="ld-pitch-actions">
            <button className="btn btn-primary" onClick={async () => { await navigator.clipboard.writeText(pitch); toast.success('Pitch copied — paste it on the platform') }}>
              <i className="ti ti-copy" /> Copy pitch
            </button>
            <button className="btn btn-ghost" onClick={() => setPitch(draftPitch())}>Reset draft</button>
            <button className="btn-icon" title="Close" onClick={() => setPitch(null)}><i className="ti ti-x" /></button>
          </div>
        </div>
      )}

      {/* ── CLIENT INTEL ── */}
      {lead.client_name && clientLeads.length > 0 && (() => {
        const budgets = clientLeads.map(l => l.budget_max ?? l.budget_min).filter((b): b is number => b != null)
        const stillOpen = clientLeads.filter(l => l.status === 'active').length
        return (
          <div className="ld-card">
            <div className="ld-verdict-label"><i className="ti ti-building" />About this client</div>
            <p className="ld-client-sum">
              <b>{lead.client_name}</b> has {clientLeads.length + 1} posts in your lead pool
              {budgets.length > 0 && <> · budgets £{Math.min(...budgets).toLocaleString('en-GB')}–£{Math.max(...budgets).toLocaleString('en-GB')}</>}
              {stillOpen > 0 && <> · {stillOpen} still open</>}
            </p>
            <div className="ld-client-list">
              {clientLeads.slice(0, 3).map(l => (
                <button key={l.id} className="ld-client-row" onClick={() => router.push(`/dashboard/lead/${l.id}`)}>
                  <span className="ld-client-title">{l.title}</span>
                  <span className="ld-client-meta">{new Date(l.posted_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── FOLLOW-UP REMINDER (Pro) ── */}
      {ent.calendarSync && (
        <div className="ld-card ld-reminder">
          <div className="ld-verdict-label"><i className="ti ti-bell" />Follow-up reminder</div>
          <div className="ld-reminder-row">
            <input type="datetime-local" className="auth-input" value={followUp} onChange={e => setFollowUp(e.target.value)} />
            <input type="text" className="auth-input" placeholder="Note (optional) — e.g. chase if no reply" value={reminderNote} onChange={e => setReminderNote(e.target.value)} />
          </div>
          <div className="ld-reminder-actions">
            <button className="btn btn-primary" onClick={saveReminder} disabled={savingReminder}>
              <i className="ti ti-calendar-plus" /> {followUp ? 'Set reminder' : 'Clear reminder'}
            </button>
            <a className="ld-cal-link" href="/dashboard/profile#calendar">Sync to your calendar</a>
          </div>
        </div>
      )}

      {/* ── MATCH VERDICT ── */}
      <div className="ld-card ld-verdict" style={{ borderLeftColor: scoreColor(sc) }}>
        <div className="ld-verdict-label"><i className="ti ti-target-arrow" />Match verdict</div>
        <p className="ld-verdict-text">{m.why}</p>
        <div className="ld-subscores">
          {m.subScores.map(s => (
            <div key={s.label} className="ld-subscore-row">
              <div className="ld-subscore-head">
                <span className="ld-subscore-lbl">{s.label}</span>
                <span className="ld-subscore-val" style={{ color: scoreColor(s.value) }}>{s.value}/10</span>
              </div>
              <div className="ld-subscore-track">
                <div className="ld-subscore-fill" style={{ width: `${s.value * 10}%`, background: scoreColor(s.value) }} />
              </div>
              <p className="ld-subscore-detail">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── SKILLS ── */}
      {(lead.skills_required?.length ?? 0) > 0 && (
        <div className="ld-card">
          <div className="ld-section-label">
            <i className="ti ti-code" />Skills
            <span className="ld-section-sub" style={{ color: m.skillMatch.matched.length === lead.skills_required!.length ? 'var(--hi)' : 'var(--mid)' }}>
              {m.skillMatch.matched.length} of {lead.skills_required!.length} matched
            </span>
          </div>
          <div className="ld-skills">
            {m.skillMatch.matched.map(s => <span key={s} className="skill match"><i className="ti ti-check" />{s}</span>)}
            {m.skillMatch.missing.map(s => <span key={s} className="skill">{s}</span>)}
          </div>
        </div>
      )}

      {/* ── DESCRIPTION ── */}
      {lead.description && (
        <div className="ld-card">
          <div className="ld-section-label"><i className="ti ti-align-left" />Brief</div>
          <p className="ld-desc">{showFull || !descLong ? lead.description : `${lead.description.slice(0, 400)}…`}</p>
          {descLong && (
            <button className="ld-read-more" onClick={() => setShowFull(v => !v)}>
              {showFull ? 'Show less' : 'Read full brief'} <i className={`ti ${showFull ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
            </button>
          )}
        </div>
      )}

      {/* ── SOURCE — TIER GATED ── */}
      <div className="ld-card">
        <div className="ld-section-label"><i className="ti ti-link" />Source</div>
        {isPro
          ? <a href={lead.source_url || '#'} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ width: '100%' }}>
              <i className="ti ti-external-link" /> Open original listing on {si.name}
            </a>
          : <div className="ld-lock-row">
              <div className="ld-lock-icon"><i className="ti ti-lock" /></div>
              <div>
                <p className="ld-lock-head">Source hidden on Free</p>
                <p className="ld-lock-sub">Upgrade to see where to apply — from £15/mo.</p>
              </div>
              <button className="btn btn-primary" onClick={() => router.push('/dashboard/billing')} style={{ flexShrink: 0 }}>
                Upgrade
              </button>
            </div>}
      </div>

      {/* ── OUTCOME PROMPT (14 days) ── */}
      {showOutcomePrompt && (
        <div className="ld-outcome-card">
          <p className="ld-outcome-q"><i className="ti ti-help-circle" />It's been {daysSince} days — did you get this project?</p>
          <div className="ld-outcome-btns">
            {[
              { o: 'won',     label: 'Got it',        icon: 'ti-trophy',     color: 'var(--hi)',  bg: 'var(--hi-bg)' },
              { o: 'lost',    label: "Didn't get it", icon: 'ti-x',          color: 'var(--coral)', bg: 'rgba(229,87,61,.1)' },
              { o: 'pending', label: 'Still waiting', icon: 'ti-clock',      color: 'var(--mid)', bg: 'var(--mid-bg)' },
            ].map(opt => (
              // Won/lost go through the stage change so the pipeline board,
              // outcome and analytics all stay in sync; 'pending' is only an
              // outcome note, not a stage.
              <button key={opt.o} className="ld-outcome-btn" style={{ color: opt.color, background: opt.bg }}
                onClick={() => opt.o === 'won' ? updateApp('hired') : opt.o === 'lost' ? updateApp('lost') : saveOutcome('pending')}>
                <i className={`ti ${opt.icon}`} /> {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {application?.outcome && (
        <div className="ld-outcome-result" style={{ color: application.outcome === 'won' ? 'var(--hi)' : application.outcome === 'lost' ? 'var(--coral)' : 'var(--mid)' }}>
          <i className={`ti ${application.outcome === 'won' ? 'ti-trophy' : application.outcome === 'lost' ? 'ti-x' : 'ti-clock'}`} />
          {application.outcome === 'won' ? 'You got this project' : application.outcome === 'lost' ? 'Did not get it' : 'Still waiting on a response'}
        </div>
      )}

      {/* Remove from pipeline */}
      {isInPipeline && (
        <button className="ld-remove-btn" onClick={() => { updateApp('remove'); router.back() }}>
          <i className="ti ti-trash" /> Remove from pipeline
        </button>
      )}

    </div>
  )
}
