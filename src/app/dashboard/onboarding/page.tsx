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
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--lime)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: 'var(--ink-950)' }}>LF</span>
          </div>
          <h1 className="display" style={{ fontSize: '1.4rem', color: 'var(--ink)' }}>Let&apos;s get you set up</h1>
          <p style={{ color: 'var(--slate)', fontSize: 14, marginTop: 4 }}>Step {step + 1} of {steps.length}</p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, background: i <= step ? 'var(--lime)' : 'var(--line)', transition: 'background .5s' }} />
          ))}
        </div>

        <div style={{ minHeight: 280 }}>
          {step === 0 && (
            <div className="field">
              <label>Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Your name" autoFocus />
            </div>
          )}
          {step === 1 && (
            <div>
              <p style={{ color: 'var(--slate)', fontSize: 14, marginBottom: 16 }}>What do you specialise in?</p>
              <div className="skill-grid" style={{ maxHeight: 288, overflowY: 'auto', padding: 8 }}>
                {skillOptions.map(sk => (
                  <button key={sk} onClick={() => toggleSkill(sk)}
                    className={`skill-pick ${skills.includes(sk) ? 'on' : ''}`}>{sk}</button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <div className="field">
                <label>Hourly rate (&pound;)</label>
                <input value={rate} onChange={e => setRate(e.target.value)} type="number" className="input" placeholder="e.g. 75" autoFocus />
              </div>
              <div className="field">
                <label>Experience level</label>
                <select value={exp} onChange={e => setExp(e.target.value)} className="input">
                  <option value="">Select&hellip;</option>
                  {['Junior (0-2 years)','Mid (2-5)','Senior (5-10)','Expert (10+)'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
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

        <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
          {step > 0 && <button onClick={goBack} className="btn btn-ghost" style={{ flex: 1 }}>Back</button>}
          {step < 2 ? (
            <button onClick={goNext} disabled={!canProceed()} className="btn btn-primary" style={{ flex: 2, opacity: canProceed() ? 1 : 0.45 }}>
              Next <i className="ti ti-arrow-right" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving} className="btn btn-primary" style={{ flex: 2, opacity: saving ? 0.45 : 1 }}>
              {saving ? 'Setting up\u2026' : 'Go to my feed'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
