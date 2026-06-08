'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, isNewLead, formatDate } from '@/lib/utils'
import {
  ArrowLeft, Bookmark, Send, Trophy, ExternalLink,
  Lock, Check, Briefcase, MapPin, Calendar,
  ThumbsUp, ThumbsDown, HelpCircle
} from 'lucide-react'

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  saved:      { label: 'Saved', color: '#7C3AED', bg: '#F0EFFE' },
  interested: { label: 'Interested', color: '#1B6B4A', bg: '#EBF5F0' },
  applied:    { label: 'Applied', color: '#D97706', bg: '#FEF3E2' },
  hired:      { label: 'Hired', color: '#059669', bg: '#ECFDF5' },
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
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#F2F3F7' }}>
      <div className="animate-spin h-8 w-8 border-4 rounded-full" style={{ borderColor: '#1B6B4A', borderTopColor: 'transparent' }} />
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
    <div className="flex-1 pb-20 md:pb-0" style={{ background: '#F2F3F7' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-sm font-medium mb-4 transition-colors hover:opacity-80"
          style={{ color: '#6B7280' }}
        >
          <ArrowLeft size={14} />
          Back to leads
        </button>

        <div className="bg-white rounded-xl p-6 md:p-8" style={{ border: '1px solid #ECEEF2' }}>
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
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-lg shrink-0" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>New</span>
              )}
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate" style={{ color: '#1A1D23' }}>{lead.title}</h1>
                <div className="flex items-center gap-2 mt-0.5 text-xs" style={{ color: '#AAB0BB' }}>
                  {lead.project_type && <span className="capitalize">{lead.project_type}</span>}
                  {lead.client_location && <><Briefcase size={10} /><span>{lead.client_location}</span></>}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full shrink-0" style={{
              background: score >= 8 ? '#EBF5F0' : score >= 5 ? '#FEF3E2' : '#F2F3F7',
              color: score >= 8 ? '#1B6B4A' : score >= 5 ? '#D97706' : '#6B7280',
            }}>
              {score}/10
            </span>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {budget && (
              <span className="text-sm font-semibold px-3 py-1 rounded-lg" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>
                {budget}
              </span>
            )}
            {lead.project_type && (
              <span className="text-sm px-3 py-1 rounded-lg capitalize" style={{ background: '#F2F3F7', color: '#6B7280' }}>
                {lead.project_type}
              </span>
            )}
            {lead.client_location && (
              <span className="text-sm px-3 py-1 rounded-lg flex items-center gap-1" style={{ background: '#F2F3F7', color: '#6B7280' }}>
                <MapPin size={12} /> {lead.client_location}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: '#1A1D23' }}>Description</h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#4B5563' }}>
              {lead.description}
            </p>
          </div>

          {/* Skills */}
          {lead.skills_required && lead.skills_required.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#1A1D23' }}>Skills Required</h3>
              <div className="flex flex-wrap gap-2">
                {lead.skills_required.map(skill => (
                  <span key={skill} className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: '#EBF1FC', color: '#2563EB' }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-4 mt-6 text-xs" style={{ color: '#9CA3AF' }}>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Posted {new Date(lead.posted_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {lead.expiry_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Expires {new Date(lead.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>

          {/* Source URL */}
          {lead.source_url && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ECEEF2' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#1A1D23' }}>Source</h3>
              {isFree ? (
                <div className="rounded-lg p-4 text-center" style={{ background: '#F9FAFB', border: '1px solid #ECEEF2' }}>
                  <Lock size={20} className="mx-auto mb-2" color="#AAB0BB" />
                  <div className="text-xs font-medium" style={{ color: '#6B7280' }}>Source URL hidden</div>
                  <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Upgrade to Pro to see where this lead came from and apply directly.
                  </div>
                  <button
                    onClick={() => router.push('/dashboard/billing')}
                    className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#1B6B4A' }}
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
                  style={{ color: '#2563EB' }}
                >
                  {lead.source_url}
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* Match explanation */}
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ECEEF2' }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#1A1D23' }}>Match Analysis</h3>
            <p className="text-xs mb-3" style={{ color: '#6B7280' }}>{matchInfo.summary}</p>
            <div className="space-y-2">
              {matchInfo.breakdown.map(item => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Check size={12} color={item.achieved ? '#1B6B4A' : '#D0D4DE'} />
                    <span style={{ color: '#6B7280' }}>{item.label}</span>
                  </div>
                  <span className="font-medium shrink-0 ml-2" style={{ color: item.achieved ? '#6B7280' : '#AAB0BB' }}>
                    {item.detail}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-xs font-bold pt-2" style={{ borderTop: '1px solid #ECEEF2' }}>
                <span style={{ color: '#1A1D23' }}>Overall Score</span>
                <span style={{ color: '#1B6B4A' }}>{score}/10</span>
              </div>
            </div>

            {/* Skill match */}
            {profile?.skills && profile.skills.length > 0 && (
              <div className="mt-4 pt-3" style={{ borderTop: '1px solid #ECEEF2' }}>
                <div className="text-xs font-semibold mb-2" style={{ color: '#1A1D23' }}>
                  Skill Match: {matchInfo.skillMatch.matched.length}/{lead.skills_required?.length || 0}
                </div>
                {matchInfo.skillMatch.matched.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {matchInfo.skillMatch.matched.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: '#EBF5F0', color: '#1B6B4A' }}>{s} ✓</span>
                    ))}
                  </div>
                )}
                {matchInfo.skillMatch.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {matchInfo.skillMatch.missing.map(s => (
                      <span key={s} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: '#F2F3F7', color: '#AAB0BB' }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Outcome logging */}
          {showOutcomePrompt && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ECEEF2' }}>
              <h3 className="text-sm font-semibold mb-2" style={{ color: '#1A1D23' }}>Did you get this project?</h3>
              <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Help us improve your matches by telling us what happened.</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { outcome: 'won', label: 'Got it!', icon: ThumbsUp, color: '#1B6B4A', bg: '#EBF5F0' },
                  { outcome: 'lost', label: 'Did not get it', icon: ThumbsDown, color: '#DC2626', bg: '#FEF2F2' },
                  { outcome: 'pending', label: 'Still waiting', icon: HelpCircle, color: '#D97706', bg: '#FEF3E2' },
                ].map(opt => {
                  const Icon = opt.icon
                  return (
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                      style={{ background: opt.bg, color: opt.color }}>
                      <Icon size={12} /> {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {application?.outcome && (
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid #ECEEF2' }}>
              <div className="flex items-center gap-2 text-sm font-medium" style={{ color: application.outcome === 'won' ? '#1B6B4A' : application.outcome === 'lost' ? '#DC2626' : '#D97706' }}>
                {application.outcome === 'won' ? <ThumbsUp size={14} /> : application.outcome === 'lost' ? <ThumbsDown size={14} /> : <HelpCircle size={14} />}
                {application.outcome === 'won' ? 'You got this project!' : application.outcome === 'lost' ? 'Did not get this project' : 'Still waiting on this project'}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-5" style={{ borderTop: '1px solid #ECEEF2' }}>
            {!isFree && lead.source_url && (
              <a
                href={lead.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: '#1B6B4A' }}
              >
                <ExternalLink size={14} />
                Apply on {source.label}
              </a>
            )}
            <button
              onClick={handleInterested}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired' ? '#1B6B4A' : '#EBF5F0',
                color: application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired' ? 'white' : '#1B6B4A',
              }}
            >
              <Send size={14} />
              {application?.status === 'interested' || application?.status === 'applied' || application?.status === 'hired' ? 'Interest Expressed' : 'Express Interest'}
            </button>

            <button
              onClick={handleBookmark}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: application?.status === 'saved' ? '#F0EFFE' : '#F2F3F7',
                color: application?.status === 'saved' ? '#7C3AED' : '#6B7280',
              }}
            >
              <Bookmark size={14} fill={application?.status === 'saved' ? '#7C3AED' : 'none'} />
              {application?.status === 'saved' ? 'Saved' : 'Save for later'}
            </button>

            {application?.status === 'interested' && (
              <button
                onClick={() => { updateApplication('applied'); toast.success('Marked as applied') }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: '#FEF3E2', color: '#D97706' }}
              >
                <Send size={14} /> Mark as Applied
              </button>
            )}
            {application?.status === 'applied' && (
              <button
                onClick={() => { updateApplication('hired'); toast.success('Marked as hired!') }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                style={{ background: '#EBF5F0', color: '#1B6B4A' }}
              >
                <Trophy size={14} /> Mark as Hired
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
