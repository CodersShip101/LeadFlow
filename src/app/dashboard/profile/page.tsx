'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'
import { ArrowLeft, X, Plus } from 'lucide-react'

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [skillTags, setSkillTags] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
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
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setSkillTags(data.skills || [])
        setExperienceLevel(data.experience_level || '')
        setHourlyRate(data.hourly_rate?.toString() || '')
        setLocation(data.location || '')
        setPortfolioUrl(data.portfolio_url || '')
        setAvailability(data.availability || '')
      }
    }
    load()
  }, [supabase, router])

  const addSkill = useCallback(() => {
    const s = skillInput.trim()
    if (s && !skillTags.includes(s)) {
      setSkillTags(prev => [...prev, s])
      setSkillInput('')
    }
  }, [skillInput, skillTags])

  const removeSkill = useCallback((s: string) => {
    setSkillTags(prev => prev.filter(t => t !== s))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      skills: skillTags,
      experience_level: experienceLevel,
      hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
      location,
      portfolio_url: portfolioUrl,
      availability,
    })
    if (error) toast.error(error.message)
    else toast.success('Profile saved!')
    setSaving(false)
  }

  const fields = [fullName, skillTags.length > 0, experienceLevel, hourlyRate, location, portfolioUrl, availability]
  const filled = fields.filter(Boolean).length
  const completion = Math.round((filled / fields.length) * 100)

  return (
    <div className="flex-1 pb-20 md:pb-0" style={{ background: '#F2F3F7' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-medium mb-5 transition-colors hover:opacity-80"
          style={{ color: '#6B7280' }}>
          <ArrowLeft size={13} /> Back to dashboard
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-bold" style={{ color: '#1A1D23' }}>Your Profile</h1>
          <div className="flex items-center gap-2">
            <div className="w-20 bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ background: '#1B6B4A', width: `${completion}%` }} />
            </div>
            <span className="text-[11px] font-medium" style={{ color: completion === 100 ? '#1B6B4A' : '#6B7280' }}>{completion}%</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-xl p-6 space-y-5" style={{ border: '1px solid #ECEEF2' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Full Name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Experience Level</label>
              <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}>
                <option value="">Select...</option>
                <option value="junior">Junior</option>
                <option value="mid">Mid-level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Expert</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Hourly Rate (£)</label>
              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                placeholder="75" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                placeholder="London, UK" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Availability</label>
              <select value={availability} onChange={e => setAvailability(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}>
                <option value="">Select...</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="evenings">Evenings / Weekends</option>
                <option value="not-available">Not available</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Portfolio URL</label>
              <input type="url" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                placeholder="https://your-portfolio.com" />
            </div>
          </div>

          {/* Skills tag input */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Skills</label>
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
              {skillTags.map(s => (
                <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg" style={{ background: '#EBF1FC', color: '#2563EB' }}>
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} className="hover:opacity-70"><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                className="flex-1 rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                placeholder="Type a skill and press Enter" />
              <button type="button" onClick={addSkill}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style={{ background: '#1B6B4A' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: '#1B6B4A' }}>
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
