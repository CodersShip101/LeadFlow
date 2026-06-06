'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import LeadCard from '@/components/LeadCard'
import type { Lead, Profile } from '@/types'

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterSkill, setFilterSkill] = useState('')
  const [filterType, setFilterType] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profile)

      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('status', 'active')
        .order('posted_date', { ascending: false })

      setLeads(leads || [])
      setLoading(false)
    }

    load()
  }, [supabase, router])

  const filteredLeads = leads.filter((lead) => {
    if (filterSkill && lead.skills_required) {
      const match = lead.skills_required.some((s) =>
        s.toLowerCase().includes(filterSkill.toLowerCase())
      )
      if (!match) return false
    }
    if (filterType && lead.project_type !== filterType) return false
    return true
  })

  const isFree = profile?.subscription_status === 'free'

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Feed</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isFree
              ? `Showing ${Math.min(3, filteredLeads.length)} of ${leads.length} leads — upgrade to see all`
              : `${filteredLeads.length} leads available`}
          </p>
        </div>
        {isFree && (
          <button
            onClick={() => router.push('/dashboard/billing')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Filter by skill..."
          value={filterSkill}
          onChange={(e) => setFilterSkill(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-64 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All types</option>
          <option value="one-off">One-off</option>
          <option value="ongoing">Ongoing</option>
        </select>
      </div>

      {/* Lead Cards */}
      <div className="grid gap-4">
        {filteredLeads.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No leads match your filters. Check back soon!</p>
        ) : (
          filteredLeads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isFreeUser={isFree}
              index={index}
            />
          ))
        )}
      </div>
    </div>
  )
}
