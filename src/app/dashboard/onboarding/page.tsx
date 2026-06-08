'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

const skillOptions = ['React', 'TypeScript', 'Node.js', 'Python', 'Figma', 'UI/UX', 'Branding', 'Copywriting', 'Illustrator', 'After Effects', 'Next.js', 'Tailwind', 'Django', 'Flutter', 'Swift', 'AWS', 'Docker', 'PostgreSQL', 'MongoDB', 'GraphQL', 'REST APIs', 'Animation', 'Motion Design', 'Prototyping', 'Design Systems', 'HTML/CSS', 'JavaScript', 'Vue', 'Angular', 'PHP', 'WordPress', 'Shopify', 'SEO', 'Content Strategy']

const goalCards = [
  { value: 'new-clients', icon: 'ti-users', label: 'Find new clients', desc: 'I need a steady flow of new projects', color: '#059669', bg: '#ECFDF5' },
  { value: 'higher-rates', icon: 'ti-trending-up', label: 'Higher rates', desc: 'I want better-paying opportunities', color: '#2563EB', bg: '#EFF6FF' },
  { value: 'replace-scrolling', icon: 'ti-clock', label: 'Save time', desc: 'I spend too much time on job boards', color: '#7C3AED', bg: '#F5F3FF' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [fullName, setFullName] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState('')
  const [location, setLocation] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const steps = ['Basics', 'Skills', 'Rates', 'Goal', 'Done']
  const canProceed = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0
      case 1: return skills.length > 0
      case 2: return hourlyRate.length > 0
      case 3: return goal !== null
      default: return true
    }
  }

  const toggleSkill = (s: string) => {
    setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { error } = await supabase.from('profiles').update({
      full_name: fullName,
      skills,
      hourly_rate: parseInt(hourlyRate),
      location,
    }).eq('id', user.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Profile complete! Here are your leads.')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#F9FAFB' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#1B6B4A' }}>
            <span className="text-white text-sm font-bold">LF</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>Tell us about yourself</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Step {step + 1} of {steps.length}</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all" style={{
              background: i <= step ? '#1B6B4A' : '#E5E7EB',
            }} />
          ))}
        </div>

        <div className="animate-fade-in">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Your name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }}
                  placeholder="e.g. Sarah Chen" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }}
                  placeholder="e.g. London, UK" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <p className="text-sm mb-4" style={{ color: '#6B7280' }}>Select your skills so we can find the best leads for you.</p>
              <div className="flex flex-wrap gap-1.5">
                {skillOptions.map(s => (
                  <button key={s} onClick={() => toggleSkill(s)}
                    className={`tag transition-all active:scale-[0.95] ${
                      skills.includes(s)
                        ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                        : 'bg-[#F3F4F6] text-[#6B7280] border border-transparent hover:border-[#D1D5DB]'
                    }`}>
                    {s}
                    {skills.includes(s) && <i className="ti ti-check ml-1" style={{ fontSize: '10px' }} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block" style={{ color: '#374151' }}>Hourly rate (£)</label>
                <input value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} type="number"
                  className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none"
                  style={{ borderColor: '#D1D5DB', color: '#111827' }}
                  placeholder="e.g. 75" autoFocus />
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p className="text-sm mb-4" style={{ color: '#6B7280' }}>What&apos;s your main goal?</p>
              <div className="space-y-3">
                {goalCards.map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value)}
                    className="w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98]"
                    style={{
                      borderColor: goal === g.value ? g.color : '#E5E7EB',
                      background: goal === g.value ? g.bg : '#FFFFFF',
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: g.bg, color: g.color }}>
                        <i className={`ti ${g.icon}`} style={{ fontSize: '18px' }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: '#111827' }}>{g.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{g.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#ECFDF5' }}>
                <i className="ti ti-sparkles" style={{ fontSize: '24px', color: '#059669' }} />
              </div>
              <h2 className="text-lg font-bold" style={{ color: '#111827' }}>You&apos;re all set!</h2>
              <p className="text-sm mt-1 mb-6" style={{ color: '#6B7280' }}>
                We&apos;ll start matching you with leads that fit your profile.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          {step > 0 && step < 4 && (
            <button onClick={() => setStep(prev => prev - 1)} className="btn-secondary flex-1 justify-center">
              Back
            </button>
          )}
          {step < 4 ? (
            <button onClick={() => setStep(prev => prev + 1)} disabled={!canProceed()}
              className="btn-primary flex-1 justify-center">
              {step === 3 ? 'Looks good' : 'Continue'}
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="btn-primary w-full justify-center">
              {saving ? 'Setting up...' : 'Show me my leads'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
