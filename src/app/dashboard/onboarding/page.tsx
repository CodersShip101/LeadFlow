'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

const skillOptions = ['React','Vue','Angular','Next.js','TypeScript','Python','Node.js','PHP','WordPress','Figma','UI/UX','Illustration','Copywriting','SEO','Content','Video Editing','Photography','Social Media','Email Marketing','Paid Ads','Project Management','Virtual Assistance','Bookkeeping','Consulting']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [fullName, setFullName] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [rate, setRate] = useState('')
  const [exp, setExp] = useState('')
  const [avail, setAvail] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const steps = ['Basics', 'Skills', 'Rates']
  const canProceed = () => {
    switch (step) {
      case 0: return fullName.trim().length > 0
      case 1: return skills.length > 0
      case 2: return rate.length > 0
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
      full_name: fullName, skills, hourly_rate: parseInt(rate), experience_level: exp, availability: avail,
    }).eq('id', user.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Welcome to LeadFlow! Your feed is being personalised.')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: 'var(--paper)' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="auth-logo-mark mx-auto mb-3" style={{ width: '40px', height: '40px' }}>
            <span>LF</span>
          </div>
          <h1 className="display text-xl" style={{ color: 'var(--ink-900)' }}>Let&apos;s get you set up</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--slate-500)' }}>Step {step + 1} of {steps.length}</p>
        </div>

        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full transition-all duration-500" style={{ background: i <= step ? 'var(--lime)' : 'var(--slate-200)' }} />
          ))}
        </div>

        <div className="min-h-[280px]">
          {step === 0 && (
            <div className="auth-field">
              <label>Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Your name" autoFocus />
            </div>
          )}
          {step === 1 && (
            <div>
              <p className="text-sm mb-4" style={{ color: 'var(--slate-500)' }}>What do you specialise in?</p>
              <div className="auth-skills-grid max-h-72 overflow-y-auto">
                {skillOptions.map(sk => (
                  <button key={sk} onClick={() => toggleSkill(sk)}
                    className={`auth-skill-pill ${skills.includes(sk) ? 'selected' : ''}`}>
                    {sk}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <div className="auth-field">
                <label>Hourly rate (&pound;)</label>
                <input value={rate} onChange={e => setRate(e.target.value)} type="number" className="input" placeholder="e.g. 75" autoFocus />
              </div>
              <div className="auth-field">
                <label>Experience level</label>
                <select value={exp} onChange={e => setExp(e.target.value)} className="input">
                  <option value="">Select&hellip;</option>
                  {['Junior (0-2 years)','Mid (2-5)','Senior (5-10)','Expert (10+)'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="auth-field">
                <label>Availability</label>
                <select value={avail} onChange={e => setAvail(e.target.value)} className="input">
                  <option value="">Select&hellip;</option>
                  <option value="now">Available now</option>
                  <option value="soon">Available from [date]</option>
                  <option value="no">Not currently available</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8">
          {step > 0 && <button onClick={goBack} className="btn-line flex-1 justify-center">Back</button>}
          {step < 2 ? (
            <button onClick={goNext} disabled={!canProceed()} className="btn-p flex-[2] justify-center" style={{ opacity: canProceed() ? 1 : 0.45 }}>
              Next <i className="ti ti-arrow-right" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="btn-p flex-[2] justify-center" style={{ opacity: saving ? 0.45 : 1 }}>
              {saving ? 'Setting up&hellip;' : 'Go to my feed'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
