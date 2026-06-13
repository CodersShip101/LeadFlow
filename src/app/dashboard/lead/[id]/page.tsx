'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, isNewLead, formatDate } from '@/lib/utils'
import ScoreGauge from '@/components/ScoreGauge'

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  saved:      { label: 'Saved', color: 'var(--lime-ink)', bg: 'var(--lime-dim)' },
  interested: { label: 'Interested', color: 'var(--lime-deep)', bg: 'var(--lime-dim)' },
  applied:    { label: 'Applied', color: 'var(--mid)', bg: 'var(--mid-bg)' },
  hired:      { label: 'Won', color: 'var(--hi)', bg: 'var(--hi-bg)' },
}

function barColor(v: number) {
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
  const [showFullDesc, setShowFullDesc] = useState(false)
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

  const handlePrimaryAction = () => {
    const isAlreadyInPipeline = application && application.status !== 'saved'
    if (isAlreadyInPipeline) {
      router.push('/dashboard/applied')
    } else if (application?.status === 'saved') {
      updateApplication('interested')
      toast.success('Added to pipeline')
    } else {
      updateApplication('interested')
      toast.success('Added to pipeline')
    }
  }

  const toggleSave = () => {
    if (application?.status === 'saved') {
      updateApplication('remove')
      toast('Removed from saved')
    } else {
      updateApplication('saved')
      toast.success('Saved')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--paper)' }}>
      <div className="flex items-center gap-3" style={{ color: 'var(--slate)' }}>
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
  const isInPipeline = application && application.status !== 'saved'
  const isSaved = application?.status === 'saved'
  const descShort = (lead.description || '').length > 350

  const daysSince = application ? Math.floor((Date.now() - new Date(application.created_at).getTime()) / 86400000) : 0
  const showOutcomePrompt = application && daysSince >= 14 && !application.outcome

  return (
    <div className="flex-1 pb-20 md:pb-0" style={{ background: 'var(--paper)' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-line btn-sm mb-5">
          <i className="ti ti-arrow-left" /> Back to leads
        </button>

        <div className="card p-6 md:p-8 !shadow-none">
          {/* Header — source + title + score */}
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: source.bg, color: source.color }}>{source.label}</span>
                {isNewLead(lead.posted_date) && <span className="lead-state st-new text-[10px]">New</span>}
                {isInPipeline && <span className="lead-state" style={{ background: statusConfig[application!.status]?.bg, color: statusConfig[application!.status]?.color }}>{statusConfig[application!.status]?.label}</span>}
              </div>
              <h1 className="text-xl md:text-2xl font-bold leading-tight" style={{ color: 'var(--ink)' }}>{lead.title}</h1>
            </div>
            <ScoreGauge score={score} />
          </div>

          {/* Meta strip */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs" style={{ color: 'var(--slate)' }}>
            {budget && <span className="font-semibold font-mono" style={{ color: 'var(--lime-ink)' }}>{budget}</span>}
            {lead.client_location && <span><i className="ti ti-map-pin" style={{ fontSize: 11 }} /> {lead.client_location}</span>}
            {lead.project_type && <span className="capitalize">{lead.project_type}</span>}
            <span><i className="ti ti-calendar" style={{ fontSize: 11 }} /> Posted {formatDate(lead.posted_date)}</span>
          </div>

          {/* Actions — single primary + secondary save */}
          <div className="flex items-center gap-3 mt-5">
            <button onClick={handlePrimaryAction} className="btn btn-primary">
              <i className={`ti ${isInPipeline ? 'ti-send-2' : 'ti-send'}`} />
              {isInPipeline ? 'View in pipeline' : 'Apply & track'}
            </button>
            <button onClick={toggleSave} className={`btn-icon ${isSaved ? 'on' : ''}`} title={isSaved ? 'Saved' : 'Save'}>
              <i className={`ti ti-bookmark${isSaved ? '-filled' : ''}`} />
            </button>
            {!isFree && lead.source_url && (
              <a href={lead.source_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                <i className="ti ti-external-link" /> Source
              </a>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink-2)' }}>
              {showFullDesc || !descShort ? lead.description : `${lead.description?.slice(0, 350)}...`}
            </p>
            {descShort && (
              <button onClick={() => setShowFullDesc(v => !v)} className="text-xs font-semibold mt-1"
                style={{ color: 'var(--lime-deep)' }}>
                {showFullDesc ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Skills — single unified row */}
          {lead.skills_required && lead.skills_required.length > 0 && (
            <div className="mt-5">
              <div className="flex flex-wrap gap-2">
                {lead.skills_required.map(sk => {
                  const matched = profile?.skills?.some(ps => ps.toLowerCase() === sk.toLowerCase())
                  return (
                    <span key={sk} className={`skill ${matched ? 'match' : ''}`}>
                      {matched && <i className="ti ti-check" style={{ fontSize: 10 }} />}{sk}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* Score breakdown — compact 4-row */}
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--ink)' }}>Match breakdown</span>
              <span className="font-mono font-bold text-xs" style={{ color: 'var(--slate)' }}>{matchInfo.why}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {matchInfo.subScores.map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="text-xs font-medium min-w-[72px]" style={{ color: 'var(--ink-2)' }}>{s.label}</span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--line)' }}>
                    <div className="h-full rounded-full" style={{ width: `${s.value * 10}%`, background: barColor(s.value) }} />
                  </div>
                  <span className="font-mono text-xs font-semibold min-w-[28px] text-right" style={{ color: s.value >= 8 ? 'var(--hi)' : s.value >= 5 ? 'var(--mid)' : 'var(--slate)' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Outcome prompt */}
          {showOutcomePrompt && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--ink)' }}>How did it go?</p>
              <div className="flex gap-2">
                {[
                  { outcome: 'won' as const, label: 'Got it!', icon: 'ti-thumb-up', color: 'var(--hi)', bg: 'var(--hi-bg)' },
                  { outcome: 'lost' as const, label: 'No', icon: 'ti-thumb-down', color: 'var(--coral)', bg: 'rgba(229,87,61,.1)' },
                  { outcome: 'pending' as const, label: 'Still waiting', icon: 'ti-clock', color: 'var(--mid)', bg: 'var(--mid-bg)' },
                ].map(opt => (
                  <button key={opt.outcome} onClick={async () => {
                    const res = await fetch('/api/applications', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ lead_id: id, outcome: opt.outcome }),
                    })
                    if (res.ok) { setApplication(await res.json()); toast.success('Saved!') }
                  }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                    style={{ background: opt.bg, color: opt.color }}>
                    <i className={`ti ${opt.icon}`} style={{ fontSize: 12 }} /> {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Outcome display */}
          {application?.outcome && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2 text-sm font-medium"
                style={{ color: application.outcome === 'won' ? 'var(--hi)' : application.outcome === 'lost' ? 'var(--coral)' : 'var(--mid)' }}>
                <i className={`ti ${application.outcome === 'won' ? 'ti-thumb-up' : application.outcome === 'lost' ? 'ti-thumb-down' : 'ti-clock'}`} style={{ fontSize: 14 }} />
                {application.outcome === 'won' ? 'You got this project' : application.outcome === 'lost' ? 'Did not get it' : 'Still waiting'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
