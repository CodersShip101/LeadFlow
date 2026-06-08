'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import type { Profile } from '@/types'

const skillOptions = ['React', 'TypeScript', 'Node.js', 'Python', 'Figma', 'UI/UX', 'Branding', 'Copywriting', 'Illustrator', 'After Effects', 'Next.js', 'Tailwind', 'Django', 'Flutter', 'Swift', 'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'GraphQL', 'REST APIs', 'Animation', 'Motion Design', 'Prototyping', 'Design Systems', 'Research', 'HTML/CSS', 'JavaScript', 'Vue', 'Angular', 'PHP', 'WordPress', 'Shopify', 'SEO', 'Content Strategy']

const experienceOptions = ['Junior', 'Mid-level', 'Senior', 'Lead']

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [location, setLocation] = useState('')
  const [availability, setAvailability] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setFullName(data?.full_name || '')
      setSkills(data?.skills || [])
      setExperienceLevel(data?.experience_level || '')
      setHourlyRate(data?.hourly_rate ? String(data.hourly_rate) : '')
      setLocation(data?.location || '')
      setAvailability(data?.availability || '')
      setLoading(false)
    }
    load()
  }, [supabase, router])

  const toggleSkill = (skill: string) => {
    setSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill])
  }

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      skills,
      experience_level: experienceLevel,
      hourly_rate: hourlyRate ? parseInt(hourlyRate) : null,
      location,
      availability,
    }).eq('id', profile?.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Profile saved')
    setSaving(false)
  }

  if (loading) return (
    <div className="pb-20 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="px-4 md:px-8 pt-6 space-y-3">
        <div className="h-7 w-32 skel" />
        <div className="h-4 w-48 skel" />
      </div>
    </div>
  )

  return (
    <div className="flex-1 pb-24 md:pb-0" style={{ background: '#F9FAFB' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 md:py-8">
        <button onClick={() => router.push('/dashboard')} className="btn-ghost-sm mb-4">
          <i className="ti ti-arrow-left" /> Feed
        </button>
        <h1 className="text-xl font-bold" style={{ color: '#111827' }}>Settings</h1>
        <p className="text-xs mt-1 mb-6" style={{ color: '#9CA3AF' }}>Update your profile to improve lead matching.</p>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>Basic info</div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium" style={{ color: '#374151' }}>Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none mt-1"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }} placeholder="Your name" />
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#374151' }}>Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none mt-1"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }} placeholder="e.g. London, UK" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: '#374151' }}>Hourly rate (£)</label>
                  <input value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} type="number"
                    className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none mt-1"
                    style={{ borderColor: '#D1D5DB', color: '#111827' }} placeholder="e.g. 75" />
                </div>
                <div>
                  <label className="text-sm font-medium" style={{ color: '#374151' }}>Experience</label>
                  <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}
                    className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none mt-1"
                    style={{ borderColor: '#D1D5DB', color: '#111827', background: 'white' }}>
                    <option value="">Select...</option>
                    {experienceOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium" style={{ color: '#374151' }}>Availability</label>
                <select value={availability} onChange={e => setAvailability(e.target.value)}
                  className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none mt-1"
                  style={{ borderColor: '#D1D5DB', color: '#111827', background: 'white' }}>
                  <option value="">Select...</option>
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>Skills</div>
            <div className="flex flex-wrap gap-1.5">
              {skillOptions.map(s => (
                <button key={s} onClick={() => toggleSkill(s)}
                  className={`tag transition-all active:scale-[0.95] ${skills.includes(s) ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]' : 'bg-[#F3F4F6] text-[#6B7280] border border-transparent hover:border-[#D1D5DB]'}`}>
                  {s}
                  {skills.includes(s) && <i className="ti ti-check ml-1" style={{ fontSize: '10px' }} />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary mt-6">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
