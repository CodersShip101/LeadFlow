'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
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
    <div className="flex-1 px-4 md:px-8 pt-6 pb-20 md:pb-8 max-w-xl">
      <h1 className="text-lg font-bold" style={{ color: 'var(--ink-900)' }}>Settings</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b mt-4 mb-6" style={{ borderColor: 'var(--slate-200)' }}>
        {(['profile', 'account'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="pb-2 text-sm font-medium capitalize transition-all"
            style={{ color: tab === t ? 'var(--lime-deep)' : 'var(--slate-500)', borderBottom: tab === t ? '2px solid var(--lime-deep)' : '2px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-4">
          <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }} /></div>
          <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }}
              placeholder="e.g. London, UK" /></div>
          <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Hourly rate (£)</label>
            <input value={rate} onChange={e => setRate(e.target.value)} type="number"
              className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }} /></div>
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
          <div><label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Portfolio URL</label>
            <input value={portfolio} onChange={e => setPortfolio(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm" style={{ background: 'var(--paper-card)', border: '1.5px solid var(--slate-200)', color: 'var(--ink-900)' }}
              placeholder="https://..." /></div>
          <div>
            <label className="text-sm font-medium mb-1.5 block" style={{ color: 'var(--ink-700)' }}>Skills</label>
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 rounded-lg" style={{ border: '1.5px solid var(--slate-200)' }}>
              {skillOptions.map(sk => (
                <button key={sk} onClick={() => toggleSkill(sk)}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all active:scale-[0.95] cursor-pointer"
                  style={{ background: skills.includes(sk) ? 'var(--lime)' : 'var(--slate-100)', color: skills.includes(sk) ? 'var(--ink-950)' : 'var(--slate-600)' }}>
                  {sk}
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'var(--lime)', color: 'var(--ink-950)', opacity: saving ? 0.45 : 1 }}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {tab === 'account' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl" style={{ background: 'var(--paper-card)', border: '1px solid var(--slate-200)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--ink-900)' }}>Email</p>
            <p className="text-xs mt-1" style={{ color: 'var(--slate-500)' }}>{profile?.email || '—'}</p>
          </div>
          <div className="p-4 rounded-xl" style={{ background: 'var(--paper-card)', border: '1px solid var(--slate-200)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--ink-900)' }}>Plan</p>
            <p className="text-xs mt-1 capitalize" style={{ color: 'var(--slate-500)' }}>{profile?.subscription_status || 'free'}</p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: 'rgba(255,107,94,.1)', color: 'var(--coral)' }}>Sign out</button>
        </div>
      )}
    </div>
  )
}
