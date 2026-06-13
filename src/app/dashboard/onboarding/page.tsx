'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

const skillOptions = ['React','Vue','Angular','Next.js','TypeScript','Python','Node.js','PHP','WordPress','Figma','UI/UX','Illustration','Copywriting','SEO','Content','Video Editing','Photography','Social Media','Email Marketing','Paid Ads','Project Management','Virtual Assistance','Bookkeeping','Consulting']

const goalOptions = [
  { value: 'more-clients', icon: 'ti-target', title: 'Find more clients', desc: 'I need a consistent pipeline' },
  { value: 'higher-rates', icon: 'ti-trending-up', title: 'Higher paying work', desc: 'I want better quality leads' },
  { value: 'save-time', icon: 'ti-clock', title: 'Save time', desc: 'Stop spending hours on job boards' },
  { value: 'scale', icon: 'ti-rocket', title: 'Scale my business', desc: 'Build a sustainable freelance business' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [fullName, setFullName] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [rate, setRate] = useState('')
  const [exp, setExp] = useState('')
  const [avail, setAvail] = useState('')
  const [goal, setGoal] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const steps = ['Basics', 'Skills', 'Rates', 'Goal']
  const canProceed = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0
      case 1: return skills.length > 0
      case 2: return rate.length > 0
      case 3: return goal !== null
      default: return true
    }
  }

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const goNext = () => setStep(s => s + 1)
  const goBack = () => setStep(s => s - 1)

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, skills, hourly_rate: parseInt(rate), experience_level: exp, availability: avail, goal, onboarding_complete: true,
    }).eq('id', user.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Welcome to LeadFlow! Your feed is being personalised.')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--lime)' }}>
            <span className="text-sm font-bold" style={{ color: 'var(--ink-950)' }}>LF</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--ink-900)' }}>Let&apos;s get you set up</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--slate-500)' }}>Step {step + 1} of {steps.length}</p>
        </div>

        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-300" style={{ background: i <= step ? 'var(--lime)' : 'var(--slate-200)' }} />
          ))}
        </div>

        <div className="min-h-[300px]">
          {step === 0 && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }}
                  placeholder="Your name" autoFocus /></div>
            </div>
          )}
          {step === 1 && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--slate-500)' }}>What do you specialise in?</p>
              <div className="flex flex-wrap gap-1.5 max-h-80 overflow-y-auto">
                {skillOptions.map(sk => (
                  <button key={sk} onClick={() => toggleSkill(sk)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all active:scale-[0.95] cursor-pointer"
                    style={{ background: skills.includes(sk) ? 'var(--lime)' : 'var(--slate-100)', color: skills.includes(sk) ? 'var(--ink-950)' : 'var(--slate-600)' }}>
                    {sk}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Hourly rate (£)</label>
                <input value={rate} onChange={e => setRate(e.target.value)} type="number"
                  className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }}
                  placeholder="e.g. 75" autoFocus /></div>
              <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Experience level</label>
                <select value={exp} onChange={e => setExp(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }}>
                  <option value="">Select...</option>
                  {['Junior (0-2 years)','Mid (2-5)','Senior (5-10)','Expert (10+)'].map(o => <option key={o} value={o}>{o}</option>)}
                </select></div>
              <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Availability</label>
                <select value={avail} onChange={e => setAvail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }}>
                  <option value="">Select...</option>
                  <option value="now">Available now</option>
                  <option value="soon">Available from [date]</option>
                  <option value="no">Not currently available</option>
                </select></div>
            </div>
          )}
          {step === 3 && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--slate-500)' }}>What&apos;s your main goal with LeadFlow?</p>
              <div className="space-y-3">
                {goalOptions.map(g => (
                  <button key={g.value} onClick={() => setGoal(g.value)}
                    className="w-full text-left p-4 rounded-xl border-2 transition-all active:scale-[0.98]"
                    style={{ borderColor: goal === g.value ? 'var(--lime-deep)' : 'var(--slate-200)', background: goal === g.value ? 'rgba(196,240,0,.12)' : 'var(--paper-card)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(196,240,0,.15)', color: 'var(--lime-deep)' }}>
                        <i className={`ti ${g.icon}`} style={{ fontSize: '18px' }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>{g.title}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--slate-500)' }}>{g.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          {step > 0 && <button onClick={goBack} className="flex-1 py-2.5 rounded-lg text-sm font-semibold justify-center flex items-center gap-2" style={{ background: 'var(--slate-100)', color: 'var(--slate-600)' }}>Back</button>}
          {step < 3 ? (
            <button onClick={goNext} disabled={!canProceed()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold justify-center flex items-center gap-2 transition-all"
              style={{ background: 'var(--lime)', color: 'var(--ink-950)', opacity: canProceed() ? 1 : 0.45 }}>Next <i className="ti ti-arrow-right" /></button>
          ) : (
            <button onClick={handleFinish} disabled={saving}
              className="flex-[2] py-2.5 rounded-lg text-sm font-semibold justify-center flex items-center gap-2"
              style={{ background: 'var(--lime)', color: 'var(--ink-950)', opacity: saving ? 0.45 : 1 }}>
              {saving ? 'Setting up...' : 'Go to my feed'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
