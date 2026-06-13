'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, isNewLead, formatDate } from '@/lib/utils'


const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  saved:      { label: 'Saved', color: 'var(--lime-dim)', bg: 'rgba(196,240,0,.12)' },
  interested: { label: 'Interested', color: 'var(--lime-deep)', bg: 'rgba(196,240,0,.12)' },
  applied:    { label: 'Applied', color: 'var(--amber)', bg: 'rgba(255,176,32,.1)' },
  hired:      { label: 'Hired', color: 'var(--green-score)', bg: 'rgba(61,219,122,.1)' },
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [lead, setLead] = useState<Lead | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
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
      if (leadRes.error || !leadRes.data) {
        toast.error('Lead not found')
        router.push('/dashboard')
        return
      }
      setLead(leadRes.data)
      setProfile(profileRes.data)
      const res = await fetch('/api/applications')
      if (res.ok) {
        const apps: Application[] = await res.json()
        setApplication(apps.find(a => a.lead_id === id) || null)
      }
      setLoading(false)
    }
    load()
  }, [id, supabase, router])

  const updateApplication = useCallback(async (status: string) => {
    if (status === 'remove') {
      const res = await fetch('/api/applications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: id }),
      })
      if (res.ok) { setApplication(null) }
      return
    }
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: id, status }),
    })
    if (res.ok) {
      const app = await res.json()
      setApplication(app)
    }
  }, [id])

  const handleBookmark = () => {
    if (application?.status === 'saved') {
      updateApplication('remove')
      toast.success('Lead removed from saved')
    } else if (application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired') {
      updateApplication('saved')
      toast.success('Lead saved for later')
    } else {
      updateApplication('saved')
      toast.success('Lead saved for later')
    }
  }

  const handleInterested = () => {
    if (application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired') {
      updateApplication('remove')
      toast.success('Removed from applications')
    } else {
      updateApplication('interested')
      toast.success('Added to your applications')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--paper)' }}>
      <div className="flex items-center gap-3" style={{ color: 'var(--slate-500)' }}>
        <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--lime)' }} />
        <span className="text-sm">Loading&hellip;</span>
      </div>
    </div>
  )

  if (!lead) return null

  const isFree = profile?.subscription_status === 'free'
  const source = getSourceInfo(lead.source_url)
  const matchInfo = computeMatchExplanation(lead, profile)
  const score = matchInfo.score
  const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)

  const daysSince = application ? Math.floor((Date.now() - new Date(application.created_at).getTime()) / 86400000) : 0
  const showOutcomePrompt = application && daysSince >= 14 && !application.outcome

  return (
    <div className="flex-1 pb-20 md:pb-0" style={{ background: 'var(--paper)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-line btn-sm mb-4">
          <i className="ti ti-arrow-left" /> Back to leads
        </button>

        <div className="card p-6 md:p-8 !shadow-none">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => { if (!isFree && lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-opacity hover:opacity-80"
                style={{ background: source.bg, color: source.color }}>{source.label}</button>
              {isNewLead(lead.posted_date) && <span className="dash-badge-new text-[10px] px-2 py-0.5 rounded-lg">New</span>}
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--ink-900)' }}>{lead.title}</h1>
                <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--slate-400)' }}>
                  {lead.project_type && <span className="capitalize">{lead.project_type}</span>}
                  {lead.client_location && <><i className="ti ti-briefcase" style={{ fontSize: '10px' }} /><span>{lead.client_location}</span></>}
                </div>
              </div>
            </div>
            <span className="dash-badge-status text-xs" style={{
              background: score >= 8 ? 'rgba(61,219,122,.12)' : score >= 5 ? 'rgba(255,176,32,.1)' : 'var(--slate-100)',
              color: score >= 8 ? 'var(--green-score)' : score >= 5 ? 'var(--amber)' : 'var(--slate-500)',
            }}>
              {score}/10
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {budget && <span className="dash-badge-status" style={{ background: 'rgba(196,240,0,.12)', color: 'var(--lime-deep)' }}>{budget}</span>}
            {lead.project_type && <span className="dash-badge-status" style={{ background: 'var(--slate-100)', color: 'var(--slate-500)' }}>{lead.project_type}</span>}
            {lead.client_location && <span className="dash-badge-status flex items-center gap-1" style={{ background: 'var(--slate-100)', color: 'var(--slate-500)' }}>
              <i className="ti ti-map-pin" style={{ fontSize: '12px' }} /> {lead.client_location}
            </span>}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink-900)' }}>Description</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--slate-600)' }}>{lead.description}</p>
          </div>

          {lead.skills_required && lead.skills_required.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink-900)' }}>Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {lead.skills_required.map(skill => (
                  <span key={skill} className="badge-skill">{skill}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 mt-6 text-xs" style={{ color: 'var(--slate-400)' }}>
            <span className="flex items-center gap-1">
              <i className="ti ti-calendar" style={{ fontSize: '12px' }} />
              Posted {new Date(lead.posted_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {lead.expiry_date && (
              <span className="flex items-center gap-1">
                <i className="ti ti-calendar" style={{ fontSize: '12px' }} />
                Expires {new Date(lead.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {lead.source_url && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink-900)' }}>Source</h3>
              {isFree ? (
                <div className="rounded-lg p-5 text-center" style={{ background: 'var(--slate-100)', border: '1px solid var(--slate-200)' }}>
                  <i className="ti ti-lock text-2xl" style={{ color: 'var(--slate-300)', display: 'block', margin: '0 auto 8px' }} />
                  <p className="text-xs font-medium" style={{ color: 'var(--slate-500)' }}>Source URL hidden</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--slate-400)' }}>Upgrade to Pro to see where this lead came from and apply directly.</p>
                  <button onClick={() => router.push('/dashboard/billing')} className="btn-p btn-sm mt-3">Upgrade to Pro &mdash; &pound;49/month</button>
                </div>
              ) : (
                <a href={lead.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm hover:underline inline-flex items-center gap-1" style={{ color: 'var(--lime-dim)' }}>
                  {lead.source_url} <i className="ti ti-external-link" style={{ fontSize: '12px' }} />
                </a>
              )}
            </div>
          )}

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>Why this score?</h3>
              <span className="font-mono font-bold text-sm" style={{ color: score >= 8 ? 'var(--green-score)' : score >= 5 ? 'var(--amber)' : 'var(--slate-500)' }}>{score}/10</span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--slate-500)' }}>{matchInfo.why}</p>
            <div className="space-y-3">
              {matchInfo.subScores.map(s => (
                <div key={s.label} className="flex items-start gap-2.5 text-xs">
                  <i className={`ti ti-${s.icon}`} style={{ fontSize: '14px', color: 'var(--slate-400)', marginTop: '1px' }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{ color: 'var(--ink-800)' }}>{s.label}</span>
                      <span className="font-mono font-semibold" style={{ color: 'var(--slate-600)' }}>{s.value}/10 <span style={{ color: 'var(--slate-400)', fontWeight: 400 }}>· {Math.round(s.weight * 100)}%</span></span>
                    </div>
                    <div className="score-bar mt-1"><span className={s.value >= 7 ? '' : s.value >= 4 ? 'warn' : 'weak'} style={{ width: `${s.value * 10}%` }} /></div>
                    <p className="mt-1" style={{ color: 'var(--slate-500)', fontSize: '11px' }}>{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs mt-3 pt-3" style={{ color: 'var(--slate-500)', borderTop: '1px solid var(--slate-200)' }}>{matchInfo.summary}</p>

            {profile?.skills && profile.skills.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--slate-200)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--ink-900)' }}>
                  Skill Match: {matchInfo.skillMatch.matched.length}/{lead.skills_required?.length || 0}
                </div>
                {matchInfo.skillMatch.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {matchInfo.skillMatch.matched.map(s => (
                      <span key={s} className="badge-skill text-[10px] !bg-[rgba(61,219,122,.12)] !text-[var(--green-score)]">{s} &check;</span>
                    ))}
                  </div>
                )}
                {matchInfo.skillMatch.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {matchInfo.skillMatch.missing.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: 'var(--slate-100)', color: 'var(--slate-400)' }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {showOutcomePrompt && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--ink-900)' }}>Did you get this project?</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--slate-500)' }}>Help us improve your matches by telling us what happened.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { outcome: 'won', label: 'Got it!', icon: 'ti-thumb-up', color: 'var(--green-score)', bg: 'rgba(61,219,122,.1)' },
                  { outcome: 'lost', label: 'Did not get it', icon: 'ti-thumb-down', color: 'var(--coral)', bg: 'rgba(255,107,94,.1)' },
                  { outcome: 'pending', label: 'Still waiting', icon: 'ti-clock', color: 'var(--amber)', bg: 'rgba(255,176,32,.1)' },
                ].map(opt => (
                  <button key={opt.outcome} onClick={async () => {
                    const res = await fetch('/api/applications', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ lead_id: id, outcome: opt.outcome }),
                    })
                    if (res.ok) {
                      const app = await res.json()
                      setApplication(app)
                      toast.success('Saved!')
                    }
                  }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 min-h-[36px]"
                    style={{ background: opt.bg, color: opt.color }}>
                    <i className={`ti ${opt.icon}`} style={{ fontSize: '12px' }} /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {application?.outcome && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
              <div className="flex items-center gap-2 text-sm font-medium"
                style={{ color: application.outcome === 'won' ? 'var(--green-score)' : application.outcome === 'lost' ? 'var(--coral)' : 'var(--amber)' }}>
                <i className={`ti ${application.outcome === 'won' ? 'ti-thumb-up' : application.outcome === 'lost' ? 'ti-thumb-down' : 'ti-clock'}`} style={{ fontSize: '14px' }} />
                {application.outcome === 'won' ? 'You got this project!' : application.outcome === 'lost' ? 'Did not get this project' : 'Still waiting on this project'}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-6 pt-5" style={{ borderTop: '1px solid var(--slate-200)' }}>
            {!isFree && lead.source_url && (
              <a href={lead.source_url} target="_blank" rel="noopener noreferrer"
                className="btn-p !px-5 !py-2.5 text-sm no-underline">
                <i className="ti ti-external-link" style={{ fontSize: '14px' }} />
                Apply on {source.label}
              </a>
            )}
            <button onClick={handleInterested}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all min-h-[36px]"
              style={{
                background: application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired' ? 'rgba(196,240,0,.12)' : 'var(--slate-100)',
                color: application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired' ? 'var(--lime-deep)' : 'var(--slate-600)',
              }}>
              <i className="ti ti-send" style={{ fontSize: '14px' }} />
              {application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired' ? 'Interest Expressed' : 'Express Interest'}
            </button>

            <button onClick={handleBookmark}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all min-h-[36px] active:scale-[0.97]"
              style={{
                background: application?.status === 'saved' ? 'rgba(196,240,0,.12)' : 'var(--slate-100)',
                color: application?.status === 'saved' ? 'var(--lime-dim)' : 'var(--slate-500)',
              }}>
              <i className={`ti ${application?.status === 'saved' ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: '14px' }} />
              {application?.status === 'saved' ? 'Saved' : 'Save for later'}
            </button>

            {application?.status === 'interested' && (
              <button onClick={() => { updateApplication('applied'); toast.success('Marked as applied') }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium min-h-[36px] transition-all hover:opacity-80 active:scale-[0.97]"
                style={{ background: 'rgba(255,176,32,.1)', color: 'var(--amber)' }}>
                <i className="ti ti-send" style={{ fontSize: '14px' }} /> Mark as Applied
              </button>
            )}
            {application?.status === 'applied' && (
              <button onClick={() => { updateApplication('hired'); toast.success('Marked as hired!') }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium min-h-[36px] transition-all hover:opacity-80 active:scale-[0.97]"
                style={{ background: 'rgba(61,219,122,.1)', color: 'var(--green-score)' }}>
                <i className="ti ti-trophy" style={{ fontSize: '14px' }} /> Mark as Hired
              </button>
            )}

            {application?.status && application.status !== 'saved' && (
              <span className="dash-badge-status" style={{ background: statusConfig[application.status]?.bg, color: statusConfig[application.status]?.color }}>
                {statusConfig[application.status]?.label || application.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
