'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import { PRICING, ENTITLEMENTS, TIER_ICONS, type Tier } from '@/lib/tiers'
import toast from 'react-hot-toast'

const SKILL_OPTIONS = [
  { group: 'Dev', items: ['React','Vue','Angular','Next.js','TypeScript','Node.js','Python','PHP','WordPress'] },
  { group: 'Design', items: ['Figma','UI/UX','Illustration','Branding','Motion'] },
  { group: 'Content', items: ['Copywriting','SEO','Content','Video Editing','Photography','Social Media'] },
  { group: 'Marketing', items: ['Email Marketing','Paid Ads','Growth'] },
  { group: 'Ops', items: ['Project Management','Virtual Assistance','Bookkeeping','Consulting'] },
]

function completionScore(fields: Record<string, unknown>): number {
  const checks = [
    !!fields.fullName,
    !!fields.location,
    !!fields.rate,
    !!fields.exp,
    !!fields.avail,
    !!fields.portfolio,
    (fields.skills as string[]).length >= 3,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [location, setLocation] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [rate, setRate] = useState('')
  const [exp, setExp] = useState('')
  const [avail, setAvail] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
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

  const mark = () => setDirty(true)
  const toggleSkill = (s: string) => { setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); mark() }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      full_name: fullName, location, skills,
      hourly_rate: rate ? parseInt(rate) : null,
      experience_level: exp, availability: avail, portfolio_url: portfolio,
    }).eq('id', user.id)
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Saved')
    setSaving(false)
    setDirty(false)
  }

  const tier = (profile?.subscription_status as Tier) || 'free'
  const plan = PRICING[tier]
  const ent = ENTITLEMENTS[tier]
  const completion = completionScore({ fullName, location, rate, exp, avail, portfolio, skills })

  const completionColor = completion >= 80 ? 'var(--hi)' : completion >= 50 ? 'var(--mid)' : 'var(--coral)'
  const completionLabel = completion >= 80 ? 'Great — your matches will be very accurate' : completion >= 50 ? 'Add more info to improve your match scores' : 'Incomplete — scoring is limited'

  return (
    <div className="st-page">

      {/* ── PAGE HEADER ── */}
      <div className="st-header">
        <div>
          <h2 className="st-title">Settings</h2>
          <p className="st-sub">Your profile directly affects how leads are scored for you.</p>
        </div>
        {dirty && (
          <button className="btn btn-primary st-save-top" onClick={handleSave} disabled={saving}>
            <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>

      {/* ── PROFILE COMPLETION ── */}
      <div className="st-completion">
        <div className="st-completion-head">
          <span className="st-completion-lbl">Profile strength</span>
          <span className="st-completion-pct" style={{ color: completionColor }}>{completion}%</span>
        </div>
        <div className="st-completion-track">
          <div className="st-completion-fill" style={{ width: `${completion}%`, background: completionColor }} />
        </div>
        <p className="st-completion-note">{completionLabel}</p>
      </div>

      {/* ── SECTION: IDENTITY ── */}
      <div className="st-card">
        <div className="st-card-head">
          <span className="st-card-icon"><i className="ti ti-user" /></span>
          <div>
            <h3 className="st-card-title">Identity</h3>
            <p className="st-card-desc">Used in pipeline cards and matched against client location.</p>
          </div>
        </div>
        <div className="st-fields">
          <div className="st-field">
            <label className="st-label">Full name</label>
            <input value={fullName} onChange={e => { setFullName(e.target.value); mark() }} className="input" placeholder="Jane Smith" />
          </div>
          <div className="st-field-row">
            <div className="st-field">
              <label className="st-label">Location</label>
              <input value={location} onChange={e => { setLocation(e.target.value); mark() }} className="input" placeholder="London, UK" />
            </div>
            <div className="st-field">
              <label className="st-label">Portfolio URL</label>
              <input value={portfolio} onChange={e => { setPortfolio(e.target.value); mark() }} className="input" placeholder="https://…" />
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: MATCHING ── */}
      <div className="st-card">
        <div className="st-card-head">
          <span className="st-card-icon"><i className="ti ti-target-arrow" /></span>
          <div>
            <h3 className="st-card-title">Match settings</h3>
            <p className="st-card-desc">These fields drive your score. Rate and availability are weighted at 30%.</p>
          </div>
        </div>
        <div className="st-fields">
          <div className="st-field-row">
            <div className="st-field">
              <label className="st-label">Hourly rate <span className="st-label-unit">£/hr</span></label>
              <input value={rate} onChange={e => { setRate(e.target.value); mark() }} type="number" className="input" placeholder="e.g. 75" />
            </div>
            <div className="st-field">
              <label className="st-label">Experience level</label>
              <select value={exp} onChange={e => { setExp(e.target.value); mark() }} className="input">
                <option value="">Select…</option>
                {['Junior (0–2 years)', 'Mid (2–5)', 'Senior (5–10)', 'Expert (10+)'].map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          <div className="st-field">
            <label className="st-label">Availability</label>
            <div className="st-avail-pills">
              {[
                { v: 'now', label: 'Available now', icon: 'ti-circle-check' },
                { v: 'soon', label: 'Available soon', icon: 'ti-clock' },
                { v: 'no', label: 'Not available', icon: 'ti-circle-x' },
              ].map(opt => (
                <button key={opt.v} className={`st-avail-pill ${avail === opt.v ? 'on' : ''}`}
                  onClick={() => { setAvail(opt.v); mark() }}>
                  <i className={`ti ${opt.icon}`} />{opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION: SKILLS ── */}
      <div className="st-card">
        <div className="st-card-head">
          <span className="st-card-icon"><i className="ti ti-code" /></span>
          <div>
            <h3 className="st-card-title">Skills</h3>
            <p className="st-card-desc">Skill matching is weighted at 45% of your score — the biggest factor.</p>
          </div>
          <span className="st-skill-count">{skills.length} selected</span>
        </div>
        <div className="st-skill-groups">
          {SKILL_OPTIONS.map(group => (
            <div key={group.group} className="st-skill-group">
              <span className="st-skill-group-label">{group.group}</span>
              <div className="st-skill-pills">
                {group.items.map(sk => (
                  <button key={sk} onClick={() => toggleSkill(sk)}
                    className={`skill-pick ${skills.includes(sk) ? 'on' : ''}`}>
                    {skills.includes(sk) && <i className="ti ti-check" />}{sk}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION: PLAN ── */}
      <div className="st-card">
        <div className="st-card-head">
          <span className="st-card-icon"><i className={`ti ${TIER_ICONS[tier]}`} /></span>
          <div>
            <h3 className="st-card-title">Your plan</h3>
            <p className="st-card-desc">You're on the <strong>{plan.label}</strong> plan{plan.monthly ? ` — £${plan.monthly}/mo` : ''}.</p>
          </div>
          {tier === 'free' && (
            <button className="btn btn-primary" onClick={() => router.push('/dashboard/billing')} style={{ flexShrink: 0 }}>
              <i className="ti ti-bolt" /> Upgrade
            </button>
          )}
        </div>
        <div className="st-plan-ents">
          {[
            { label: 'Applications / mo', val: ent.applicationsPerMonth === 'unlimited' ? 'Unlimited' : String(ent.applicationsPerMonth), on: ent.applicationsPerMonth === 'unlimited' },
            { label: 'Source links',       val: ent.sourceLinks ? 'Included' : 'Locked',   on: ent.sourceLinks },
            { label: 'Email digest',        val: ent.emailDigest ? 'Weekly' : 'Off',         on: ent.emailDigest },
            { label: 'Analytics',           val: ent.basicAnalytics ? (ent.advancedAnalytics ? 'Advanced' : 'Basic') : 'None', on: ent.basicAnalytics },
            { label: 'Scan frequency',      val: `Every ${ent.scanIntervalHours}h`,          on: ent.scanIntervalHours <= 2 },
            { label: 'CSV export',          val: ent.csvExport ? 'Available' : 'Locked',     on: ent.csvExport },
          ].map(e => (
            <div key={e.label} className="st-plan-ent">
              <span className="st-plan-ent-label">{e.label}</span>
              <span className="st-plan-ent-val" style={{ color: e.on ? 'var(--hi)' : 'var(--slate-2)' }}>{e.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION: ACCOUNT ── */}
      <div className="st-card">
        <div className="st-card-head">
          <span className="st-card-icon"><i className="ti ti-shield" /></span>
          <div>
            <h3 className="st-card-title">Account</h3>
            <p className="st-card-desc">Login credentials and security.</p>
          </div>
        </div>
        <div className="st-fields">
          <div className="st-field">
            <label className="st-label">Email address</label>
            <input className="input" value={profile?.email || '—'} disabled />
            <p className="st-field-hint">Contact support to change your email.</p>
          </div>
        </div>
      </div>

      {/* ── SAVE BUTTON ── */}
      <button onClick={handleSave} disabled={saving || !dirty} className={`btn btn-primary st-save-main ${!dirty ? 'st-save-idle' : ''}`}>
        <i className="ti ti-check" /> {saving ? 'Saving…' : 'Save changes'}
      </button>

      {/* ── DANGER ZONE ── */}
      <div className="st-danger">
        <div className="st-danger-head">Danger zone</div>
        <div className="st-danger-row">
          <div>
            <p className="st-danger-label">Sign out</p>
            <p className="st-danger-sub">You'll be returned to the home page.</p>
          </div>
          <button className="st-danger-btn" onClick={async () => { await supabase.auth.signOut(); router.push('/') }}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      </div>

    </div>
  )
}
