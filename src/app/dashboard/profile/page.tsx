'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [skills, setSkills] = useState('')
  const [experienceLevel, setExperienceLevel] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [location, setLocation] = useState('')
  const [portfolioUrl, setPortfolioUrl] = useState('')
  const [availability, setAvailability] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setSkills(data.skills?.join(', ') || '')
        setExperienceLevel(data.experience_level || '')
        setHourlyRate(data.hourly_rate?.toString() || '')
        setLocation(data.location || '')
        setPortfolioUrl(data.portfolio_url || '')
        setAvailability(data.availability || '')
      }
    }

    load()
  }, [supabase, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const skillArray = skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      skills: skillArray,
      experience_level: experienceLevel,
      hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
      location,
      portfolio_url: portfolioUrl,
      availability,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile saved!')
    }

    setSaving(false)
  }

  const fieldCount = [fullName, skills, experienceLevel, hourlyRate, location, portfolioUrl, availability].filter(Boolean).length
  const completion = Math.round((fieldCount / 7) * 100)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
        <div className="flex items-center gap-2">
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="text-sm text-gray-500">{completion}%</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid-level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead / Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Skills (comma separated)</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="React, Node.js, UI Design"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Hourly Rate (£)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="75"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="London, UK"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="evenings">Evenings / Weekends</option>
              <option value="not-available">Not available right now</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Portfolio URL</label>
            <input
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="https://your-portfolio.com"
            />
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  )
}
