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

      const [leadsResult, usersResult] = await Promise.all([
        supabase.from('leads').select('*').order('posted_date', { ascending: false }).limit(50),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(50),
      ])

      setLeads(leadsResult.data || [])
      setUsers(usersResult.data || [])
    }

    load()
  }, [supabase, router])

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()

    const { error } = await supabase.from('leads').insert({
      title,
      description,
      budget_min: budgetMin ? parseInt(budgetMin) : null,
      budget_max: budgetMax ? parseInt(budgetMax) : null,
      project_type: projectType || null,
      skills_required: skillsRequired.split(',').map((s) => s.trim()).filter(Boolean),
      client_location: clientLocation || null,
      source_url: sourceUrl || null,
      status: 'active',
    })

    if (error) {
      toast.error(error.message)
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

    const { data } = await supabase.from('leads').select('*').order('posted_date', { ascending: false }).limit(50)
    setLeads(data || [])
  }

  const handleDeleteLead = async (id: string) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('Lead deleted')
    setLeads(leads.filter((l) => l.id !== id))
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
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
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Min Budget (£)</label>
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Max Budget (£)</label>
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Project Type</label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Skills Required (comma separated)</label>
              <input
                type="text"
                value={skillsRequired}
                onChange={(e) => setSkillsRequired(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="React, Node.js, TypeScript"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700"
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
                user.subscription_status === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {user.subscription_status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
