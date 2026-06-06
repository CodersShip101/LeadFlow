'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile, Application } from '@/types'

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
      if (!user) {
        router.push('/auth/login')
        return
      }

      const [leadResult, profileResult, appResult] = await Promise.all([
        supabase.from('leads').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('applications').select('*').eq('lead_id', id).eq('freelancer_id', user.id).maybeSingle(),
      ])

      if (leadResult.error || !leadResult.data) {
        toast.error('Lead not found')
        router.push('/dashboard')
        return
      }

      setLead(leadResult.data)
      setProfile(profileResult.data)
      setApplication(appResult.data)
      setLoading(false)
    }

    load()
  }, [id, supabase, router])

  const handleExpressInterest = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('applications').insert({
      lead_id: id,
      freelancer_id: user.id,
      status: 'interested',
    })

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Interest expressed! The client may reach out.')
    setApplication({ id: '', freelancer_id: user.id, lead_id: id, status: 'interested', created_at: new Date().toISOString() })
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  if (!lead) return null

  const isFree = profile?.subscription_status === 'free'

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to leads
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{lead.title}</h1>
          {(lead.budget_min || lead.budget_max) && (
            <span className="shrink-0 text-lg font-semibold text-green-600">
              £{lead.budget_min || 0}{lead.budget_max ? ` - £${lead.budget_max}` : '+'}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-500">
          {lead.project_type && (
            <span className="px-3 py-1 bg-gray-100 rounded-full">{lead.project_type}</span>
          )}
          {lead.client_location && (
            <span className="px-3 py-1 bg-gray-100 rounded-full">{lead.client_location}</span>
          )}
          <span className="px-3 py-1 bg-gray-100 rounded-full">
            Posted {new Date(lead.posted_date).toLocaleDateString()}
          </span>
        </div>

        <p className="mt-6 text-gray-700 whitespace-pre-wrap">{lead.description}</p>

        {lead.skills_required && lead.skills_required.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Skills Required</h3>
            <div className="flex flex-wrap gap-2">
              {lead.skills_required.map((skill) => (
                <span key={skill} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source URL - blurred for free users */}
        {lead.source_url && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Source</h3>
            {isFree ? (
              <div className="relative">
                <div className="blur-sm select-none">
                  <span className="text-blue-600 text-sm">{lead.source_url}</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                  <span className="text-sm text-gray-500">Upgrade to Pro to view source URL</span>
                </div>
              </div>
            ) : (
              <a
                href={lead.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 text-sm hover:underline"
              >
                {lead.source_url}
              </a>
            )}
          </div>
        )}

        {/* Express Interest */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          {application ? (
            <div className="flex items-center gap-2 text-green-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm font-medium">
                {application.status === 'interested' ? 'Interest Expressed' : 'Applied'}
              </span>
            </div>
          ) : (
            <button
              onClick={handleExpressInterest}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              Express Interest
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
