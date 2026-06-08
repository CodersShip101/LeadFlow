'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

const steps = [
  { label: 'Basics', icon: 'ti ti-user' },
  { label: 'Skills', icon: 'ti ti-code' },
  { label: 'Rates', icon: 'ti ti-currency-pound' },
  { label: 'Location', icon: 'ti ti-map-pin' },
  { label: 'Goal', icon: 'ti ti-target' },
]

const suggestedSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'Figma', 'UI Design', 'Copywriting', 'Next.js', 'PostgreSQL', 'AWS', 'Docker', 'Tailwind CSS', 'GraphQL', 'Vue.js', 'Angular']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [fullName, setFullName] = useState('')
  const [headline, setHeadline] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [skillTags, setSkillTags] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState('')
  const [availability, setAvailability] = useState('')
  const [location, setLocation] = useState('')
  const [remote, setRemote] = useState('')
  const [goal, setGoal] = useState('')
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

  const addSkill = useCallback((s: string) => {
    if (s && !skillTags.includes(s)) {
      setSkillTags(prev => [...prev, s])
      setSkillInput('')
    }
  }, [skillTags])

  const removeSkill = useCallback((s: string) => {
    setSkillTags(prev => prev.filter(t => t !== s))
  }, [])

  const canProceed = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0
      case 1: return skillTags.length > 0
      case 2: return hourlyRate && availability
      case 3: return location.trim().length > 0
      case 4: return goal.length > 0
      default: return true
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      skills: skillTags,
      hourly_rate: parseInt(hourlyRate),
      location: `${location}${remote ? ` (${remote})` : ''}`,
      availability,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Profile set up! Finding your matches...')
      router.push('/dashboard?onboarded=true')
    }
    setSaving(false)
  }

  const pct = Math.round(((step + 1) / steps.length) * 100)

  return (
    <div className="flex-1 flex items-center justify-center px-4 pb-20 md:pb-0" style={{ background: '#F2F3F7', minHeight: '100%' }}>
      <div className="w-full max-w-md">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.label} className="flex-1 h-1 rounded-full transition-all" style={{ background: i <= step ? '#1B6B4A' : '#E5E7EB' }} />
          ))}
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          <i className={steps[step].icon} style={{ fontSize: '16px', color: '#1B6B4A' }} />
          <span className="text-xs font-semibold" style={{ color: '#1B6B4A' }}>{steps[step].label}</span>
          <span className="ml-auto text-[10px]" style={{ color: '#AAB0BB' }}>{pct}%</span>
        </div>

        <div className="bg-white rounded-xl p-5" style={{ border: '1px solid #ECEEF2' }}>
          {/* Step 0: Basics */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                  placeholder="Jane Doe" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Headline</label>
                <input type="text" value={headline} onChange={e => setHeadline(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                  placeholder="e.g. Senior React Developer, UK-based" />
                <p className="text-[10px] mt-1" style={{ color: '#AAB0BB' }}>Appears on your profile and match summaries.</p>
              </div>
            </div>
          )}

          {/* Step 1: Skills */}
          {step === 1 && (
            <div className="space-y-3">
              <label className="block text-xs font-medium" style={{ color: '#374151' }}>What do you do? Pick your core skills.</label>
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                {skillTags.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg" style={{ background: '#EBF1FC', color: '#2563EB' }}>
                    {s}
                    <button type="button" onClick={() => removeSkill(s)} className="hover:opacity-70"><i className="ti ti-x" style={{ fontSize: '11px' }} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput.trim()) } }}
                  className="flex-1 rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                  placeholder="Type and press Enter" />
                <button type="button" onClick={() => addSkill(skillInput.trim())}
                  className="btn-int on px-3 py-2"><i className="ti ti-plus" style={{ fontSize: '14px' }} /></button>
              </div>
              <div>
                <p className="text-[10px] font-medium mb-1.5 mt-2" style={{ color: '#AAB0BB' }}>Suggestions</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkills.filter(s => !skillTags.includes(s)).slice(0, 8).map(s => (
                    <button key={s} onClick={() => addSkill(s)}
                      className="text-[10px] px-2 py-1 rounded-full transition-colors hover:bg-gray-100 active:scale-[0.97]" style={{ border: '1px solid #E5E7EB', color: '#6B7280' }}>+ {s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Rates */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Hourly Rate (£)</label>
                <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                  placeholder="75" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Availability</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'full-time', label: 'Full-time', icon: 'ti ti-briefcase' },
                    { value: 'part-time', label: 'Part-time', icon: 'ti ti-clock' },
                    { value: 'evenings', label: 'Evenings', icon: 'ti ti-moon' },
                    { value: 'weekends', label: 'Weekends', icon: 'ti ti-sun' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setAvailability(opt.value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
                      style={{
                        border: availability === opt.value ? '1px solid #1B6B4A' : '1px solid #E5E7EB',
                        background: availability === opt.value ? '#EBF5F0' : 'transparent',
                        color: availability === opt.value ? '#1B6B4A' : '#6B7280',
                      }}>
                      <i className={opt.icon} style={{ fontSize: '14px' }} /> {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>City or Region</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none" style={{ borderColor: '#E5E7EB', color: '#1A1D23' }}
                  placeholder="London, UK" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#374151' }}>Work Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'Remote', icon: 'ti ti-wifi' },
                    { value: 'Hybrid', icon: 'ti ti-building' },
                    { value: 'On-site', icon: 'ti ti-map-pin' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setRemote(opt.value)}
                      className="flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-xs font-medium transition-all active:scale-[0.97]"
                      style={{
                        border: remote === opt.value ? '1px solid #1B6B4A' : '1px solid #E5E7EB',
                        background: remote === opt.value ? '#EBF5F0' : 'transparent',
                        color: remote === opt.value ? '#1B6B4A' : '#6B7280',
                      }}>
                      <i className={opt.icon} style={{ fontSize: '16px' }} />
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Goal */}
          {step === 4 && (
            <div className="space-y-3">
              <label className="block text-xs font-medium" style={{ color: '#374151' }}>What are you optimising for?</label>
              {[
                { value: 'clients', label: 'More clients', icon: 'ti ti-users', desc: 'Volume — I want more leads coming in.' },
                { value: 'rates', label: 'Higher rates', icon: 'ti ti-currency-pound', desc: 'Quality — fewer leads, better paying.' },
                { value: 'balance', label: 'Better balance', icon: 'ti ti-adjustments-horizontal', desc: 'Selective — the best mix of pay and fit.' },
              ].map(opt => (
                <button key={opt.value} onClick={() => setGoal(opt.value)}
                  className="w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-all active:scale-[0.99]"
                  style={{
                    border: goal === opt.value ? '1px solid #1B6B4A' : '1px solid #E5E7EB',
                    background: goal === opt.value ? '#F0FDF7' : 'transparent',
                  }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: goal === opt.value ? '#EBF5F0' : '#F5F5F7', color: goal === opt.value ? '#1B6B4A' : '#AAB0BB' }}>
                    <i className={opt.icon} style={{ fontSize: '16px' }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#1A1D23' }}>{opt.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t" style={{ borderColor: '#ECEEF2' }}>
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="btn-ghost"><i className="ti ti-arrow-left" /> Back</button>
            ) : <div />}
            {step < steps.length - 1 ? (
              <button onClick={() => canProceed() && setStep(s => s + 1)}
                className="btn-int on min-w-[90px] justify-center"
                style={{ opacity: canProceed() ? 1 : 0.4, cursor: canProceed() ? 'pointer' : 'not-allowed' }}
                disabled={!canProceed()}>Next <i className="ti ti-arrow-right" /></button>
            ) : (
              <button onClick={handleFinish} disabled={saving}
                className="btn-int on min-w-[120px] justify-center text-sm">
                {saving ? 'Saving...' : 'Show me my leads'} <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] mt-3" style={{ color: '#AAB0BB' }}>You can always update these later in Settings.</p>
      </div>
    </div>
  )
}
