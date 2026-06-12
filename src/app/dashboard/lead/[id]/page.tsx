'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, isNewLead, formatDate } from '@/lib/utils'


const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  saved:      { label: 'Saved', color: 'var(--amber)', bg: 'var(--amber-pale)' },
  interested: { label: 'Interested', color: 'var(--amber)', bg: 'var(--amber-pale)' },
  applied:    { label: 'Applied', color: '#F5C842', bg: 'rgba(245,200,66,0.12)' },
  hired:      { label: 'Hired', color: 'var(--green-score)', bg: 'rgba(61,219,122,0.12)' },
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
    <div className="flex-1 flex items-center justify-center pt-16">
      <div className="flex items-center gap-2" style={{ color: 'var(--slate)' }}>
        <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--amber)' }} /> Loading lead...
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
    <div className="flex-1 pb-20 md:pb-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-s mb-4">
          <i className="ti ti-arrow-left" /> Back to leads
        </button>

        <div className="card p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => { if (!isFree && lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-opacity hover:opacity-80"
                style={{ background: source.bg, color: source.color }}
                title={`View on ${source.label}`}
              >
                {source.label}
              </button>
              {isNewLead(lead.posted_date) && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0" style={{ background: 'var(--amber-pale)', color: 'var(--amber)' }}>New</span>
              )}
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate" style={{ color: 'var(--cream)' }}>{lead.title}</h1>
                <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: 'var(--slate)' }}>
                  {lead.project_type && <span className="capitalize">{lead.project_type}</span>}
                  {lead.client_location && <><i className="ti ti-briefcase" style={{ fontSize: '10px' }} /><span>{lead.client_location}</span></>}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0" style={{
              background: score >= 9 ? 'rgba(61,219,122,0.12)' : score >= 8 ? 'var(--amber-pale)' : score >= 7 ? 'rgba(245,200,66,0.12)' : 'rgba(245,98,66,0.12)',
              color: score >= 9 ? 'var(--green-score)' : score >= 8 ? 'var(--amber)' : score >= 7 ? 'var(--yellow-score)' : 'var(--red-score)',
            }}>
              {score}/10
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {budget && (
              <span className="text-sm font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(61,219,122,0.10)', color: 'var(--green-score)' }}>
                {budget}
              </span>
            )}
            {lead.project_type && (
              <span className="text-sm px-3 py-1 rounded-lg capitalize" style={{ background: 'var(--ink-3)', color: 'var(--slate)' }}>
                {lead.project_type}
              </span>
            )}
            {lead.client_location && (
              <span className="text-sm px-3 py-1 rounded-lg flex items-center gap-1" style={{ background: 'var(--ink-3)', color: 'var(--slate)' }}>
                <i className="ti ti-map-pin" style={{ fontSize: '12px' }} /> {lead.client_location}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--cream)' }}>Description</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--slate)' }}>
              {lead.description}
            </p>
          </div>

          {/* Skills */}
          {lead.skills_required && lead.skills_required.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--cream)' }}>Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {lead.skills_required.map(skill => (
                  <span key={skill} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: 'var(--ink-3)', color: 'var(--amber)' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-4 mt-6 text-xs" style={{ color: 'var(--slate-2)' }}>
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

          {/* Source URL */}
          {lead.source_url && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--cream)' }}>Source</h3>
              {isFree ? (
                <div className="rounded-lg p-4 text-center" style={{ background: 'var(--ink-3)', border: '1px solid var(--border-card)' }}>
                  <i className="ti ti-lock" style={{ fontSize: '20px', display: 'block', margin: '0 auto 8px', color: 'var(--slate-2)' }} />
                  <div className="text-xs font-medium" style={{ color: 'var(--slate)' }}>Source URL hidden</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--slate-2)' }}>
                    Upgrade to Pro to see where this lead came from and apply directly.
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/billing')}
                    className="btn-amber text-xs px-4 py-1.5 mt-3"
                  >
                    Upgrade to Pro — £49/month
                  </button>
                </div>
              ) : (
                <a
                  href={lead.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline inline-flex items-center gap-1"
                  style={{ color: 'var(--amber)' }}
                >
                  {lead.source_url}
                  <i className="ti ti-external-link" style={{ fontSize: '12px' }} />
                </a>
              )}
            </div>
          )}

          {/* Match explanation */}
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--cream)' }}>Match Analysis</h3>
            <p className="text-xs mb-3" style={{ color: 'var(--slate)' }}>{matchInfo.summary}</p>
            <div className="space-y-2">
              {matchInfo.breakdown.map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <i className={`ti ${item.achieved ? 'ti-check' : 'ti-x'}`} style={{ fontSize: '12px', color: item.achieved ? 'var(--green-score)' : 'var(--slate-3)' }} />
                    <span style={{ color: 'var(--slate)' }}>{item.label}</span>
                  </div>
                  <span className="font-medium shrink-0 ml-2" style={{ color: item.achieved ? 'var(--slate)' : 'var(--slate-2)' }}>
                    {item.detail}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs font-bold pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--cream)' }}>Overall Score</span>
                <span style={{ color: score >= 9 ? 'var(--green-score)' : score >= 8 ? 'var(--amber)' : score >= 7 ? 'var(--yellow-score)' : 'var(--red-score)' }}>{score}/10</span>
              </div>
            </div>

            {/* Skill match */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--cream)' }}>
                  Skill Match: {matchInfo.skillMatch.matched.length}/{lead.skills_required?.length || 0}
                </div>
                {matchInfo.skillMatch.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {matchInfo.skillMatch.matched.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: 'rgba(61,219,122,0.10)', color: 'var(--green-score)' }}>{s} ✓</span>
                    ))}
                  </div>
                )}
                {matchInfo.skillMatch.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {matchInfo.skillMatch.missing.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: 'var(--ink-3)', color: 'var(--slate-2)' }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Outcome logging */}
          {showOutcomePrompt && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--cream)' }}>Did you get this project?</h3>
              <p className="text-xs mb-3" style={{ color: 'var(--slate)' }}>Help us improve your matches by telling us what happened.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { outcome: 'won', label: 'Got it!', icon: 'ti-thumb-up', color: 'var(--green-score)', bg: 'rgba(61,219,122,0.12)' },
                  { outcome: 'lost', label: 'Did not get it', icon: 'ti-thumb-down', color: 'var(--red-score)', bg: 'rgba(245,98,66,0.12)' },
                  { outcome: 'pending', label: 'Still waiting', icon: 'ti-clock', color: '#F5C842', bg: 'rgba(245,200,66,0.12)' },
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
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: application.outcome === 'won' ? 'var(--green-score)' : application.outcome === 'lost' ? 'var(--red-score)' : '#F5C842' }}>
                <i className={`ti ${application.outcome === 'won' ? 'ti-thumb-up' : application.outcome === 'lost' ? 'ti-thumb-down' : 'ti-clock'}`} style={{ fontSize: '14px' }} />
                {application.outcome === 'won' ? 'You got this project!' : application.outcome === 'lost' ? 'Did not get this project' : 'Still waiting on this project'}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            {!isFree && lead.source_url && (
              <a
                href={lead.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary gap-2 px-5 py-2.5 text-sm no-underline"
              >
                <i className="ti ti-external-link" style={{ fontSize: '14px' }} />
                Apply on {source.label}
              </a>
            )}
            <button
              onClick={handleInterested}
              className={`btn-amber gap-2 px-5 py-2.5 text-sm`}
            >
              <i className="ti ti-send" style={{ fontSize: '14px' }} />
              {application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired' ? 'Interest Expressed' : 'Express Interest'}
            </button>

            <button
              onClick={handleBookmark}
              className="btn-s gap-2 px-4 py-2.5 text-sm min-h-[36px]"
              style={{
                background: application?.status === 'saved' ? 'var(--amber-pale)' : 'transparent',
                color: application?.status === 'saved' ? 'var(--amber)' : 'var(--slate)',
              }}
            >
              <i className={`ti ${application?.status === 'saved' ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: '14px' }} />
              {application?.status === 'saved' ? 'Saved' : 'Save for later'}
            </button>

            {application?.status === 'interested' && (
              <button
                onClick={() => { updateApplication('applied'); toast.success('Marked as applied') }}
                className="btn-s gap-2 px-4 py-2.5 text-sm min-h-[36px]"
                style={{ background: 'rgba(245,200,66,0.12)', color: '#F5C842' }}
              >
                <i className="ti ti-send" style={{ fontSize: '14px' }} /> Mark as Applied
              </button>
            )}
            {application?.status === 'applied' && (
              <button
                onClick={() => { updateApplication('hired'); toast.success('Marked as hired!') }}
                className="btn-s gap-2 px-4 py-2.5 text-sm min-h-[36px]"
                style={{ background: 'rgba(61,219,122,0.12)', color: 'var(--green-score)' }}
              >
                <i className="ti ti-trophy" style={{ fontSize: '14px' }} /> Mark as Hired
              </button>
            )}

            {application?.status && application.status !== 'saved' && (
              <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: statusConfig[application.status]?.bg, color: statusConfig[application.status]?.color }}>
                {statusConfig[application.status]?.label || application.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
