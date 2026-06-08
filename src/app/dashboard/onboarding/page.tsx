'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'
import { X, Sparkles, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const [skillInput, setSkillInput] = useState('')
  const [skillTags, setSkillTags] = useState<string[]>([])
  const [experienceLevel, setExperienceLevel] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
    }
    check()
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

  const handleFinish = async () => {
    if (skillTags.length === 0) { toast.error('Add at least one skill'); return }
    if (!hourlyRate) { toast.error('Enter your hourly rate'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      skills: skillTags,
      experience_level: experienceLevel || 'mid',
      hourly_rate: parseInt(hourlyRate),
      location: location || 'United Kingdom',
    })
    if (error) toast.error(error.message)
    else toast.success('Profile set up!')
    setSaving(false)
    router.push('/dashboard')
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-20 md:pb-0" style={{ background: '#F2F3F7', minHeight: '100%' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#EBF5F0' }}>
            <Sparkles size={22} style={{ color: '#1B6B4A' }} />
          </div>
          <h1 className="text-lg font-bold" style={{ color: '#1A1D23' }}>Set up your profile</h1>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Tell us what you do so we can match you with the right leads.</p>
        </div>

        <div className="bg-white rounded-xl p-5 space-y-4" style={{ border: '1px solid #ECEEF2' }}>
          {/* Skills */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Your Skills</label>
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
                placeholder="e.g. React, Python, UI Design" />
              <button type="button" onClick={addSkill}
                className="px-3 py-2 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style={{ background: '#1B6B4A' }}>Add</button>
            </div>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Experience Level</label>
            <select value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}>
              <option value="">Select...</option>
              <option value="junior">Junior (1-2 years)</option>
              <option value="mid">Mid-level (3-5 years)</option>
              <option value="senior">Senior (6-10 years)</option>
              <option value="lead">Lead / Expert (10+ years)</option>
            </select>
          </div>

          {/* Rate & Location */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <button onClick={handleFinish} disabled={saving}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: '#1B6B4A' }}>
            {saving ? 'Saving...' : <>Finish setup <ArrowRight size={14} /></>}
          </button>
        </div>

        <p className="text-center text-[10px] mt-3" style={{ color: '#AAB0BB' }}>You can always update these later in Settings.</p>
      </div>
    </div>
  )
}
