'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, formatDate, isUKLead } from '@/lib/utils'

export default function LeadDetailPage() {
  const [lead, setLead] = useState<Lead | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null)
  const [loggingOutcome, setLoggingOutcome] = useState(false)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const [p, l] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('leads').select('*').eq('id', params.id).single(),
      ])
      setProfile(p.data)
      if (l.data && isUKLead(l.data.client_location, l.data.source_url)) setLead(l.data)
      else { toast.error('Lead not found'); router.push('/dashboard') }
      const r = await fetch('/api/applications')
      if (r.ok) {
        const apps: Application[] = await r.json()
        const app = apps.find(a => a.lead_id === params.id)
        setApplication(app || null)
      }
      setLoading(false)
    }
    load()
  }, [supabase, router, params.id])

  const handleInterest = async () => {
    if (!lead) return
    const res = await fetch('/api/applications', {
      method: application ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application ? { lead_id: lead.id } : { lead_id: lead.id, status: 'interested' }),
    })
    if (res.ok) {
      if (application) { setApplication(null); toast.success('Removed') }
      else { const app = await res.json(); setApplication(app); toast.success('Added to pipeline') }
    }
  }

  const handleApply = () => {
    if (!lead?.source_url) return
    window.open(lead.source_url, '_blank', 'noopener,noreferrer')
    if (application && application.status !== 'applied') {
      fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: lead.id, status: 'applied' }),
      }).then(r => { if (r.ok) return r.json() }).then(app => { setApplication(app); toast.success('Marked as applied') })
    }
  }

  const handleOutcome = async (outcomeVal: 'won' | 'lost') => {
    if (!lead || !application) return
    setLoggingOutcome(true)
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: lead.id, status: 'applied', outcome: outcomeVal }),
    })
    if (res.ok) {
      const app = await res.json()
      setApplication(app)
      setOutcome(outcomeVal)
      toast.success(outcomeVal === 'won' ? 'Congratulations!' : 'Logged as lost')
    }
    setLoggingOutcome(false)
  }

  if (loading) return (
    <div className="pb-20 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="px-4 md:px-8 pt-6 space-y-3">
        <div className="h-5 w-24 skel" />
        <div className="h-8 w-72 skel" />
        <div className="h-4 w-48 skel" />
      </div>
    </div>
  )

  if (!lead) return null

  const match = computeMatchExplanation(lead, profile)
  const source = getSourceInfo(lead.source_url)
  const daysSince = application ? Math.floor((Date.now() - new Date(application.created_at).getTime()) / 86400000) : 0
  const showOutcomePrompt = application && daysSince >= 14 && !application.outcome

  return (
    <div className="flex-1 pb-24 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm mb-4">
          <i className="ti ti-arrow-left" /> Back to feed
        </button>

        <div className="card p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="tag" style={{ background: source.bg, color: source.color }}>{source.label}</span>
                {lead.project_type && (
                  <span className="tag" style={{ background: '#F3F4F6', color: '#6B7280' }}>{lead.project_type}</span>
                )}
              </div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: '#111827' }}>{lead.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                  <span className="text-sm font-semibold" style={{ color: '#059669' }}>{formatBudgetGBP(lead.budget_min, lead.budget_max)}</span>
                )}
                <span className="text-xs" style={{ color: '#9CA3AF' }}>· {formatDate(lead.posted_date)}</span>
                {lead.client_location && <span className="text-xs" style={{ color: '#9CA3AF' }}>· {lead.client_location}</span>}
              </div>
            </div>

            {/* Match score */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${
                match.score >= 8 ? 'bg-[#ECFDF5] text-[#059669]' :
                match.score >= 6 ? 'bg-[#FFFBEB] text-[#D97706]' :
                'bg-[#F3F4F6] text-[#9CA3AF]'
              }`}>
                {match.score}
              </div>
              <span className="text-[10px] mt-1 font-medium" style={{ color: '#9CA3AF' }}>Match</span>
            </div>
          </div>

          {/* Skills */}
          {lead.skills_required && lead.skills_required.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {lead.skills_required.map(s => {
                const matched = match.skillMatch.matched.includes(s)
                return (
                  <span key={s} className="tag" style={{ background: matched ? '#ECFDF5' : '#F3F4F6', color: matched ? '#059669' : '#6B7280' }}>
                    {s} {matched && <i className="ti ti-circle-check ml-0.5" style={{ fontSize: '10px' }} />}
                  </span>
                )
              })}
            </div>
          )}
        </div>

        {/* Description */}
        <div className="card p-6 mb-4">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Description</div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#6B7280' }}>{lead.description || 'No description provided.'}</p>
        </div>

        {/* Match breakdown */}
        <div className="card p-6 mb-4">
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>Match breakdown</div>
          <div className="space-y-2">
            {match.breakdown.map(b => (
              <div key={b.label} className="flex items-center gap-2 text-xs">
                <i className={`ti ${b.achieved ? 'ti-circle-check' : 'ti-circle-minus'}`}
                  style={{ fontSize: '14px', color: b.achieved ? '#059669' : '#D1D5DB' }} />
                <span style={{ color: b.achieved ? '#111827' : '#9CA3AF' }}>{b.label}</span>
                <span className="ml-auto" style={{ color: '#9CA3AF' }}>{b.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleInterest}
              className={application && application.status !== 'saved' ? 'btn-ghost' : 'btn-primary'}>
              <i className={`ti ${application && application.status !== 'saved' ? 'ti-heart-off' : 'ti-heart'}`} />
              {application && application.status !== 'saved' ? 'Remove from pipeline' : 'I\'m interested'}
            </button>
            {lead.source_url && (
              <button onClick={handleApply} className="btn-secondary">
                <i className="ti ti-external-link" /> Apply on {source.label}
              </button>
            )}
          </div>

          {/* Outcome prompt */}
          {showOutcomePrompt && !outcome && (
            <div className="mt-4 p-4 rounded-xl animate-fade-in" style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#92400E' }}>
                <i className="ti ti-help-circle mr-1" /> How did this one go?
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOutcome('won')} disabled={loggingOutcome}
                  className="btn-primary-sm">Won it</button>
                <button onClick={() => handleOutcome('lost')} disabled={loggingOutcome}
                  className="btn-ghost-sm" style={{ color: '#DC2626' }}>Didn&apos;t get it</button>
              </div>
            </div>
          )}

          {outcome && (
            <div className="mt-4 p-3 rounded-xl text-xs font-semibold" style={{
              background: outcome === 'won' ? '#ECFDF5' : '#FEF2F2',
              color: outcome === 'won' ? '#059669' : '#DC2626',
              border: `1px solid ${outcome === 'won' ? '#A7F3D0' : '#FECACA'}`,
            }}>
              <i className={`ti ${outcome === 'won' ? 'ti-trophy' : 'ti-thumb-down'} mr-1`} />
              {outcome === 'won' ? 'Logged as won' : 'Logged as lost'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
