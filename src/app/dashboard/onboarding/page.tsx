'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Lead, Profile } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo } from '@/lib/utils'
import { DISCIPLINES, SKILLS_BY_DISCIPLINE, ALL_SKILLS, skillsForDisciplines } from '@/lib/skills'
import ScoreBadge from '@/components/ScoreBadge'
import toast from 'react-hot-toast'

const EXPERIENCE = [
  { id: 'junior', label: 'Junior', sub: '0–2 yrs' },
  { id: 'mid', label: 'Mid', sub: '2–5 yrs' },
  { id: 'senior', label: 'Senior', sub: '5–10 yrs' },
  { id: 'expert', label: 'Expert', sub: '10+ yrs' },
]
const AVAILABILITY = [
  { id: 'now', label: 'Available now' },
  { id: 'soon', label: 'Within a month' },
  { id: 'browsing', label: 'Just browsing' },
]
const TIMEZONES = ['GMT / UK', 'CET (Europe)', 'EST (US East)', 'PST (US West)', 'Flexible / Async']

const STEPS = ['You', 'Skills', 'Rate & fit']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [fullName, setFullName] = useState('')
  const [disciplines, setDisciplines] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [skillSearch, setSkillSearch] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [custom, setCustom] = useState('')
  const [rate, setRate] = useState(60)
  const [exp, setExp] = useState('')
  const [avail, setAvail] = useState('')
  const [tz, setTz] = useState('')
  const [ir35, setIr35] = useState('')
  const [saving, setSaving] = useState(false)
  const [researching, setResearching] = useState(false)
  const [instantLeads, setInstantLeads] = useState<Lead[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [scannedCount, setScannedCount] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  // Prefill name from auth metadata if present (magic-link / OAuth)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const n = data.user?.user_metadata?.full_name
      if (n && typeof n === 'string') setFullName(prev => prev || n)
    })
  }, [supabase])

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  const relevantSkills = useMemo(() => skillsForDisciplines(disciplines), [disciplines])

  const searchResults = useMemo(() => {
    const q = skillSearch.trim().toLowerCase()
    if (!q) return []
    return ALL_SKILLS.filter(s => s.toLowerCase().includes(q) && !relevantSkills.includes(s)).slice(0, 8)
  }, [skillSearch, relevantSkills])

  const canProceed = () => {
    if (step === 0) return fullName.trim().length > 0 && disciplines.length > 0
    if (step === 1) return skills.length > 0
    if (step === 2) return rate > 0
    return true
  }

  const addCustom = () => {
    const v = custom.trim()
    if (v && !skills.includes(v)) setSkills(prev => [...prev, v])
    setCustom('')
    setCustomOpen(false)
  }

  const tempProfile = (): Profile => ({
    id: 'preview', full_name: fullName, email: null, skills,
    disciplines, experience_level: exp, hourly_rate: rate, location: null,
    timezone: tz || null, portfolio_url: null, availability: avail,
    onboarding_completed: true, subscription_status: 'free', created_at: new Date().toISOString(),
  })

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const res = await fetch('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        disciplines,
        skills,
        hourly_rate: rate,
        experience_level: exp || null,
        availability: avail || null,
        timezone: tz || null,
        ir35_preference: ir35 || null,
      }),
    })
    if (!res.ok) { const j = await res.json(); toast.error(j.error || 'Failed to save'); setSaving(false); return }

    // Show the "researching" animation while we actually score leads — with a
    // minimum duration so the work reads as real, not instant/fake.
    setSaving(false)
    setResearching(true)
    const startedAt = Date.now()

    const { data: leadsData } = await supabase
      .from('leads').select('*').eq('status', 'active')
      .order('posted_date', { ascending: false }).limit(200)
    const prof = tempProfile()
    const scored = (leadsData || [])
      .map(l => ({ l, score: computeMatchExplanation(l, prof).score }))
      .sort((a, b) => b.score - a.score)
    // A "match" is a genuinely relevant lead (score >= 6 on the 0–10 scale) —
    // an honest count, not a hardcoded number.
    const strong = scored.filter(x => x.score >= 6)
    setScannedCount(leadsData?.length ?? 0)
    setMatchCount(strong.length)
    setInstantLeads((strong.length ? strong : scored).slice(0, 6).map(x => x.l))

    // Hold the animation for at least 2.4s of "research".
    const elapsed = Date.now() - startedAt
    await new Promise(r => setTimeout(r, Math.max(0, 2400 - elapsed)))
    setResearching(false)
    setDone(true)
  }

  // ── Researching screen (shows the matching is real work) ─────
  if (researching) {
    const steps = [
      { icon: 'ti-world-search', txt: 'Scanning 20+ lead sources' },
      { icon: 'ti-adjustments-bolt', txt: 'Scoring every lead against your skills & rate' },
      { icon: 'ti-arrows-sort', txt: 'Ranking your strongest matches' },
    ]
    return (
      <div className="ob-wrap">
        <div className="ob-card ob-research">
          <div className="ob-radar" aria-hidden="true">
            <span /><span /><span />
            <i className="ti ti-radar-2" />
          </div>
          <h1 className="ob-title">Matching you to live leads…</h1>
          <p className="ob-sub">Give us a moment — we&apos;re scoring real openings against the profile you just built.</p>
          <ul className="ob-research-steps">
            {steps.map((s, i) => (
              <li key={i} style={{ animationDelay: `${i * 700}ms` }}>
                <span className="ob-rs-ic"><i className={`ti ${s.icon}`} /></span>
                {s.txt}
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  // ── Instant-win screen ──────────────────────────────────────
  if (done) {
    const prof = tempProfile()
    const first = fullName.split(' ')[0]
    return (
      <div className="ob-wrap">
        <div className="ob-confetti" aria-hidden="true">
          {Array.from({ length: 28 }).map((_, i) => <span key={i} style={{ '--i': i } as React.CSSProperties} />)}
        </div>
        <div className="ob-card ob-win">
          {matchCount > 0 ? (
            <>
              <div className="ob-win-stat">
                <span className="ob-win-num">{matchCount}</span>
                <span className="ob-win-num-lbl">strong {matchCount === 1 ? 'match' : 'matches'} found</span>
              </div>
              <h1 className="ob-title">Welcome, {first} — your feed is ready</h1>
              <p className="ob-sub">
                We scored <strong>{scannedCount}</strong> live openings against your profile.
                Here are your top {Math.min(instantLeads.length, 6)}.
              </p>
            </>
          ) : (
            <>
              <div className="ob-win-badge"><i className="ti ti-radar-2" /></div>
              <h1 className="ob-title">You&apos;re all set, {first}</h1>
              <p className="ob-sub">Your profile is live. We scan for fresh leads around the clock — your first matches will appear in your feed shortly.</p>
            </>
          )}

          {instantLeads.length > 0 && (
            <div className="ob-leads">
              {instantLeads.map((lead, i) => {
                const src = getSourceInfo(lead.source_url)
                const match = computeMatchExplanation(lead, prof)
                return (
                  <div key={lead.id} className="ob-lead" style={{ animationDelay: `${i * 90}ms` }}>
                    <div className="ob-lead-main">
                      <span className="ob-lead-src" style={{ background: src.bg, color: src.color }}>{src.label}</span>
                      <span className="ob-lead-title">{lead.title}</span>
                    </div>
                    <ScoreBadge match={match} size="sm" />
                  </div>
                )
              })}
            </div>
          )}

          <button className="btn-p btn-full" style={{ marginTop: 22 }} onClick={() => router.push('/dashboard')}>
            {matchCount > 0 ? 'See all my leads' : 'Go to my feed'} <i className="ti ti-arrow-right" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ob-wrap">
      <div className="ob-card">
        <div className="ob-head">
          <div className="ob-progress">
            {STEPS.map((s, i) => (
              <div key={s} className="ob-progress-item">
                <span className={`ob-progress-bar ${i <= step ? 'on' : ''}`} />
                <span className={`ob-progress-label ${i === step ? 'cur' : ''}`}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step 0 — You */}
        {step === 0 && (
          <div className="ob-step">
            <h1 className="ob-title">Let&apos;s personalise your feed</h1>
            <p className="ob-sub">Tell us who you are and what you do — this is what we score every lead against.</p>

            <div className="field" style={{ marginBottom: 22 }}>
              <label className="ob-label">Your name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Alex Morgan" autoFocus />
            </div>

            <label className="ob-label">What do you do? <span className="ob-label-hint">Pick all that apply</span></label>
            <div className="ob-cat-grid">
              {DISCIPLINES.map(d => {
                const on = disciplines.includes(d.id)
                return (
                  <button key={d.id} type="button" onClick={() => toggle(disciplines, setDisciplines, d.id)}
                    className={`ob-cat ${on ? 'on' : ''}`}
                    style={on ? { borderColor: d.accent, background: d.accentBg } : undefined}>
                    <span className="ob-cat-icon" style={{ background: d.accentBg, color: d.accent }}><i className={`ti ti-${d.icon}`} /></span>
                    <span className="ob-cat-label">{d.label}</span>
                    {on && <i className="ti ti-circle-check ob-cat-check" style={{ color: d.accent }} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 1 — Skills */}
        {step === 1 && (
          <div className="ob-step">
            <h1 className="ob-title">Pick your specific skills</h1>
            <p className="ob-sub">The more precise, the sharper your match scores. Grouped by what you chose.</p>

            <div className="ob-search">
              <i className="ti ti-search" />
              <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)} placeholder="Search any skill…" />
            </div>
            {searchResults.length > 0 && (
              <div className="ob-search-results">
                {searchResults.map(s => (
                  <button key={s} type="button" className={`ob-skill ${skills.includes(s) ? 'on' : ''}`} onClick={() => toggle(skills, setSkills, s)}>
                    {skills.includes(s) && <i className="ti ti-check" />}{s}
                  </button>
                ))}
              </div>
            )}

            <div className="ob-skill-sections">
              {disciplines.map(id => {
                const d = DISCIPLINES.find(x => x.id === id)!
                return (
                  <div key={id} className="ob-skill-section">
                    <div className="ob-skill-section-head" style={{ color: d.accent }}>
                      <i className={`ti ti-${d.icon}`} /> {d.label}
                    </div>
                    <div className="ob-skill-grid">
                      {(SKILLS_BY_DISCIPLINE[id] || []).map(s => {
                        const on = skills.includes(s)
                        return (
                          <button key={s} type="button" onClick={() => toggle(skills, setSkills, s)}
                            className={`ob-skill ${on ? 'on' : ''}`}
                            style={on ? { borderColor: d.accent, background: d.accentBg, color: d.accent } : undefined}>
                            {on && <i className="ti ti-check" />}{s}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Custom skills not in taxonomy */}
              {skills.filter(s => !ALL_SKILLS.includes(s)).length > 0 && (
                <div className="ob-skill-section">
                  <div className="ob-skill-section-head" style={{ color: 'var(--slate-500)' }}><i className="ti ti-plus" /> Your custom skills</div>
                  <div className="ob-skill-grid">
                    {skills.filter(s => !ALL_SKILLS.includes(s)).map(s => (
                      <button key={s} type="button" className="ob-skill on" onClick={() => toggle(skills, setSkills, s)}><i className="ti ti-check" />{s}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="ob-custom">
                {customOpen ? (
                  <div className="ob-custom-row">
                    <input autoFocus value={custom} onChange={e => setCustom(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
                      className="input" placeholder="e.g. Rust, Salesforce…" />
                    <button type="button" className="btn-p btn-sm" onClick={addCustom}>Add</button>
                  </div>
                ) : (
                  <button type="button" className="ob-add-custom" onClick={() => setCustomOpen(true)}><i className="ti ti-plus" /> Add a custom skill</button>
                )}
              </div>
            </div>

            <p className="ob-count">{skills.length} selected</p>
          </div>
        )}

        {/* Step 2 — Rate & fit */}
        {step === 2 && (
          <div className="ob-step">
            <h1 className="ob-title">Your rate &amp; availability</h1>
            <p className="ob-sub">We penalise leads that fall below your minimum and flag the ones that fit.</p>

            <div className="ob-rate">
              <div className="ob-rate-top">
                <label className="ob-label" style={{ margin: 0 }}>Minimum day/hour rate</label>
                <div className="ob-stepper">
                  <button type="button" onClick={() => setRate(r => Math.max(10, r - 5))} aria-label="Decrease rate"><i className="ti ti-minus" /></button>
                  <span className="ob-rate-val">£{rate}</span>
                  <button type="button" onClick={() => setRate(r => Math.min(500, r + 5))} aria-label="Increase rate"><i className="ti ti-plus" /></button>
                </div>
              </div>
              <input type="range" min={10} max={500} step={5} value={rate} onChange={e => setRate(parseInt(e.target.value))} className="ob-slider"
                style={{ background: `linear-gradient(90deg, var(--lime-deep) ${((rate - 10) / 490) * 100}%, var(--slate-200) ${((rate - 10) / 490) * 100}%)` }} />
              <div className="ob-rate-scale"><span>£10</span><span>£500+</span></div>
            </div>

            <label className="ob-label">Experience level</label>
            <div className="ob-seg">
              {EXPERIENCE.map(e => (
                <button key={e.id} type="button" className={`ob-seg-item ${exp === e.id ? 'on' : ''}`} onClick={() => setExp(e.id)}>
                  <span className="ob-seg-label">{e.label}</span>
                  <span className="ob-seg-sub">{e.sub}</span>
                </button>
              ))}
            </div>

            <label className="ob-label" style={{ marginTop: 18 }}>Availability</label>
            <div className="ob-pills">
              {AVAILABILITY.map(a => (
                <button key={a.id} type="button" className={`ob-pill ${avail === a.id ? 'on' : ''}`} onClick={() => setAvail(a.id)}>{a.label}</button>
              ))}
            </div>

            <label className="ob-label" style={{ marginTop: 18 }}>Preferred timezone <span className="ob-label-hint">Optional</span></label>
            <div className="ob-pills">
              {TIMEZONES.map(t => (
                <button key={t} type="button" className={`ob-pill ${tz === t ? 'on' : ''}`} onClick={() => setTz(tz === t ? '' : t)}>{t}</button>
              ))}
            </div>

            <label className="ob-label" style={{ marginTop: 18 }}>IR35 preference <span className="ob-label-hint">UK contracts · optional</span></label>
            <div className="ob-pills">
              {[{ id: 'outside', label: 'Outside IR35' }, { id: 'inside', label: 'Inside IR35' }, { id: '', label: 'No preference' }].map(o => (
                <button key={o.id || 'none'} type="button" className={`ob-pill ${ir35 === o.id ? 'on' : ''}`} onClick={() => setIr35(o.id)}>{o.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="ob-nav">
          {step > 0 && <button onClick={() => setStep(s => s - 1)} className="btn-line btn-sm ob-back">Back</button>}
          {step < 2 ? (
            <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="btn-p ob-next" style={{ opacity: canProceed() ? 1 : 0.45 }}>
              Continue <i className="ti ti-arrow-right" />
            </button>
          ) : (
            <button onClick={handleFinish} disabled={saving || !canProceed()} className="btn-p ob-next" style={{ opacity: saving || !canProceed() ? 0.55 : 1 }}>
              {saving ? 'Building your feed…' : 'Show me my leads'} <i className="ti ti-sparkles" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
