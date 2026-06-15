'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import { PRICING, type Tier } from '@/lib/tiers'
import toast from 'react-hot-toast'

const skillOptions = ['React','Vue','Angular','Next.js','TypeScript','Python','Node.js','PHP','WordPress','Figma','UI/UX','Illustration','Copywriting','SEO','Content','Video Editing','Photography','Social Media','Email Marketing','Paid Ads','Project Management','Virtual Assistance','Bookkeeping','Consulting']

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [rate, setRate] = useState('')
  const [exp, setExp] = useState('')
  const [avail, setAvail] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [tab, setTab] = useState<'profile' | 'account'>('profile')
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
        setLocation(data.location || '')
        setSkills(data.skills || [])
        setRate(data.hourly_rate?.toString() || '')
        setExp(data.experience_level || '')
        setAvail(data.availability || '')
        setPortfolio(data.portfolio_url || '')
      }
    }
    load()
  }, [supabase, router])

  const toggleSkill = (s: string) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, location, skills, hourly_rate: rate ? parseInt(rate) : null,
      experience_level: exp, availability: avail, portfolio_url: portfolio,
    }).eq('id', user.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Profile saved')
    setSaving(false)
  }

  return (
    <>
      <div className="greeting">
        <h2>Settings</h2>
        <p>Tune your profile so leads are scored accurately.</p>
      </div>

      <div className="tabs">
        {(['profile', 'account'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`tab ${tab === t ? 'on' : ''}`}>
            {t === 'profile' ? 'Profile' : 'Account'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="section-card">
          <div className="field">
            <label>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} className="input" placeholder="e.g. London, UK" />
            </div>
            <div className="field">
              <label>Hourly rate (&pound;)</label>
              <input value={rate} onChange={e => setRate(e.target.value)} type="number" className="input" />
            </div>
          </div>
          <div className="field-row">
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
          <div className="field">
            <label>Portfolio URL</label>
            <input value={portfolio} onChange={e => setPortfolio(e.target.value)} className="input" placeholder="https://&hellip;" />
          </div>
          <div className="field">
            <label>Skills</label>
            <div className="skill-grid">
              {skillOptions.map(sk => (
                <button key={sk} onClick={() => toggleSkill(sk)}
                  className={`skill-pick ${skills.includes(sk) ? 'on' : ''}`}>{sk}</button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ marginTop: 8 }}>
            <i className="ti ti-check"></i> {saving ? 'Saving\u2026' : 'Save changes'}
          </button>
        </div>
      )}

      {tab === 'account' && (
        <div>
          <div className="section-card">
            <div className="field">
              <label>Email</label>
              <input className="input" value={profile?.email || '\u2014'} disabled style={{ color: 'var(--slate)' }} />
            </div>
            <div className="field">
              <label>Plan</label>
              <input className="input" value={PRICING[(profile?.subscription_status as Tier) || 'free']?.label || 'Free'} disabled style={{ color: 'var(--slate)' }} />
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="btn" style={{ color: 'var(--coral)', background: 'rgba(229,87,61,.1)', marginTop: 8 }}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      )}
    </>
  )
}
