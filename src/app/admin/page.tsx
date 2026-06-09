'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Lead, Profile } from '@/types'

export default function AdminPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [users, setUsers] = useState<Profile[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [projectType, setProjectType] = useState('')
  const [skillsRequired, setSkillsRequired] = useState('')
  const [clientLocation, setClientLocation] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeStatus, setScrapeStatus] = useState<any>(null)
  const [scrapeResult, setScrapeResult] = useState<any>(null)
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

      if (!profile || profile.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
        toast.error('Unauthorized')
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)

      const [leadsRes, usersResult, scrapeRes] = await Promise.all([
        fetch('/api/admin/leads'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
        fetch('/api/scrape-leads'),
      ])

      const leadsData = await leadsRes.json()
      setLeads(Array.isArray(leadsData) ? leadsData : [])
      setUsers(usersResult.data || [])

      if (scrapeRes.ok) {
        const statusData = await scrapeRes.json()
        setScrapeStatus(statusData)
      }
    }

    load()
  }, [supabase, router])

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          budget_min: budgetMin ? parseInt(budgetMin) : null,
          budget_max: budgetMax ? parseInt(budgetMax) : null,
          project_type: projectType || null,
          skills_required: skillsRequired.split(',').map((s) => s.trim()).filter(Boolean),
          client_location: clientLocation || null,
          source_url: sourceUrl || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to add lead')
        return
      }

      toast.success('Lead added!')
      setTitle('')
      setDescription('')
      setBudgetMin('')
      setBudgetMax('')
      setProjectType('')
      setSkillsRequired('')
      setClientLocation('')
      setSourceUrl('')
      setShowForm(false)

      const leadsRes = await fetch('/api/admin/leads')
      const updatedLeads = await leadsRes.json()
      setLeads(updatedLeads)
    } catch {
      toast.error('Failed to add lead')
    }
  }

  const handleDeleteLead = async (id: string) => {
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete lead')
        return
      }

      toast.success('Lead deleted')
      setLeads(leads.filter((l) => l.id !== id))
    } catch {
      toast.error('Failed to delete lead')
    }
  }

  const handleScrape = async () => {
    setScraping(true)
    setScrapeResult(null)

    try {
      const res = await fetch('/api/scrape-leads', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Scrape failed')
        setScraping(false)
        return
      }

      setScrapeResult(data)
      toast.success(`Scrape done! ${data.inserted} new leads`)

      const leadsRes = await fetch('/api/admin/leads')
      const updatedLeads = await leadsRes.json()
      setLeads(Array.isArray(updatedLeads) ? updatedLeads : [])
    } catch {
      toast.error('Scrape failed')
    }

    setScraping(false)
  }

  if (!isAdmin) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-gray-500 text-center py-12">Checking authorization...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90" style={{ background: 'var(--green-600)' }}
        >
          {showForm ? 'Cancel' : 'Add Lead'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
          <p className="text-sm text-gray-500">Total Leads</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          <p className="text-sm text-gray-500">Total Users</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">
            {users.filter((u) => u.subscription_status === 'pro').length}
          </p>
          <p className="text-sm text-gray-500">Pro Users</p>
        </div>
      </div>

      {/* AI Lead Scraper */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">AI Lead Scraper</h2>
            <p className="text-sm text-gray-500 mt-1">
              {scrapeStatus?.zenConfigured ? 'DeepSeek V4 Flash Free active' : 'Add ZEN_API_KEY to .env.local'}
              {' · '}
              Scrapes Reddit, We Work Remotely &amp; Remotive
            </p>
          </div>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'var(--green-600)', color: 'white' }}
          >
            {scraping ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Scraping...
              </>
            ) : 'Scrape Now'}
          </button>
        </div>

        {scrapeResult && (
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--green-600)' }}>
              <p className="text-lg font-bold text-[var(--green-600)]">{scrapeResult.found}</p>
              <p className="text-xs text-[var(--green-600)]">Found</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--green-600)' }}>
              <p className="text-lg font-bold" style={{ color: 'white' }}>{scrapeResult.passed_filter}</p>
              <p className="text-xs" style={{ color: 'white' }}>Passed AI Filter</p>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--green-600)' }}>
              <p className="text-lg font-bold" style={{ color: 'white' }}>{scrapeResult.inserted}</p>
              <p className="text-xs" style={{ color: 'white' }}>Inserted</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-gray-700">{scrapeResult.skipped_duplicates}</p>
              <p className="text-xs text-gray-600">Duplicates Skipped</p>
            </div>
          </div>
        )}

        {scrapeResult?.errors?.length > 0 && (
          <div className="bg-red-50 rounded-lg p-3 mb-2">
            <p className="text-xs text-red-600 font-medium">Errors: {scrapeResult.errors.length}</p>
            <ul className="mt-1 text-xs text-red-500 list-disc list-inside">
              {scrapeResult.errors.slice(0, 3).map((e: string, i: number) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4 text-xs text-gray-500">
          <span>Sources: Reddit · WWR · Remotive</span>
          {scrapeResult?.duration_ms && (
            <span>Duration: {(scrapeResult.duration_ms / 1000).toFixed(1)}s</span>
          )}
        </div>
      </div>

      {/* Add Lead Form */}
      {showForm && (
        <form onSubmit={handleAddLead} className="bg-white rounded-xl border border-gray-200 p-6 mb-8 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Add New Lead</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Min Budget (£)</label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Budget (£)</label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Type</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
              >
                <option value="">Select...</option>
                <option value="one-off">One-off</option>
                <option value="ongoing">Ongoing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Client Location</label>
              <input
                type="text"
                value={clientLocation}
                onChange={(e) => setClientLocation(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Skills Required (comma separated)</label>
              <input
                type="text"
                value={skillsRequired}
                onChange={(e) => setSkillsRequired(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
                placeholder="React, Node.js, TypeScript"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--green-600)] focus:ring-1 focus:ring-[var(--green-600)]"
              />
            </div>
          </div>
          <button
            type="submit"
            className="text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90" style={{ background: 'var(--green-600)' }}
          >
            Add Lead
          </button>
        </form>
      )}

      {/* Existing Leads */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads ({leads.length})</h2>
        <div className="space-y-3">
          {leads.slice(0, 20).map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{lead.title}</p>
                <p className="text-xs text-gray-500">{lead.status} &middot; {new Date(lead.posted_date).toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => handleDeleteLead(lead.id)}
                className="text-red-500 hover:text-red-700 text-sm ml-4"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Users */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Users ({users.length})</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">{user.full_name || user.email}</p>
                <p className="text-xs text-gray-500">{user.email} &middot; Skills: {user.skills?.join(', ') || 'None'}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                user.subscription_status === 'pro' ? 'text-white' : 'bg-gray-100 text-gray-600'
              }`}
                style={user.subscription_status === 'pro' ? { background: 'var(--green-600)' } : undefined}>
                {user.subscription_status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
