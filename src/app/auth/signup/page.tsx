'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

function scorePassword(pw: string) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[a-z]/.test(pw)) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  return score
}

const strengthLabels = ['Weak', 'Fair', 'Strong', 'Very strong']
const strengthColors = ['#DC2626', '#E8A020', '#166B42', '#166B42']

const roles = [
  { id: 'developer', icon: 'ti-code', label: 'Developer' },
  { id: 'designer', icon: 'ti-palette', label: 'Designer' },
  { id: 'writer', icon: 'ti-edit', label: 'Writer' },
  { id: 'marketer', icon: 'ti-trending-up', label: 'Marketer' },
  { id: 'other', icon: 'ti-user', label: 'Other' },
]

export default function SignupPage() {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const pwScore = scorePassword(password)
  const pwLabel = strengthLabels[Math.min(pwScore, 3)]
  const pwColor = strengthColors[Math.min(pwScore, 3)]

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreed) { toast.error('Please agree to the terms'); return }
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) { toast.error(error.message); setLoading(false); return }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id, email: data.user.email, full_name: fullName, subscription_status: 'free',
      })
    }
    toast.success('Account created! Check your email for confirmation.')
    router.push('/dashboard/onboarding')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-12" style={{ background: 'var(--green-900)' }}>
        <div className="flex items-center gap-2 text-white text-sm font-bold">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--amber-500)' }}>LF</span>
          LeadFlow
        </div>
        <div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold mb-4" style={{ background: 'var(--amber-500)' }}>MJ</div>
          <p className="text-sm leading-relaxed text-white/80">&ldquo;Got my first client within 48 hours of signing up. The match scoring saved me from wasting time on bad leads.&rdquo;</p>
          <p className="text-xs mt-3" style={{ color: 'var(--green-200)' }}>Marcus J. — Full-Stack Developer</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--amber-500)' }}>
              <span className="text-white text-sm font-bold">LF</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--base-900)' }}>
              {step === 0 ? "What do you do?" : 'Create your account'}
            </h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--base-600)' }}>
              {step === 0 ? 'Pick your role to get started' : 'Start finding clients in minutes'}
            </p>
            {step > 0 && (
              <div className="flex gap-1.5 mt-4 justify-center">
                {[1,2,3].map(i => (
                  <div key={i} className="w-6 h-1 rounded-full transition-all" style={{ background: i <= step ? 'var(--green-600)' : 'var(--base-300)' }} />
                ))}
              </div>
            )}
          </div>

          {step === 0 && (
            <div className="space-y-2.5">
              {roles.map(r => (
                <button key={r.id} onClick={() => { setRole(r.id); setStep(1) }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all active:scale-[0.98]"
                  style={{ borderColor: role === r.id ? 'var(--green-500)' : 'var(--base-300)', background: role === r.id ? 'var(--green-50)' : 'white' }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm" style={{ background: 'var(--green-100)', color: 'var(--green-600)' }}>
                    <i className={`ti ${r.icon}`} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--base-900)' }}>{r.label}</span>
                  <i className="ti ti-arrow-right ml-auto text-sm" style={{ color: 'var(--base-400)' }} />
                </button>
              ))}
              <p className="text-center text-sm mt-4">
                <Link href="/auth/login" className="font-medium hover:underline" style={{ color: 'var(--green-600)' }}>
                  Already have an account? Sign in
                </Link>
              </p>
            </div>
          )}

          {step > 0 && (
            <form onSubmit={handleSignup} className="space-y-4">
              {step === 1 && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--base-700)' }}>Full name</label>
                  <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                    className="input" placeholder="Your name" autoFocus />
                  <button type="button" onClick={() => setStep(2)} disabled={!fullName.trim()} className="btn-p w-full justify-center mt-4">
                    Next <i className="ti ti-arrow-right" />
                  </button>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--base-700)' }}>Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="input" placeholder="you@example.com" autoFocus />
                  <button type="button" onClick={() => setStep(3)} disabled={!email.trim()} className="btn-p w-full justify-center mt-4">
                    Next <i className="ti ti-arrow-right" />
                  </button>
                </div>
              )}
              {step === 3 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--base-700)' }}>Password</label>
                    <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                      className="input" placeholder="At least 6 characters" autoFocus />
                    {password && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[0,1,2,3].map(i => (
                            <div key={i} className="flex-1 h-1 rounded-full transition-all" style={{ background: i <= pwScore ? pwColor : 'var(--base-300)' }} />
                          ))}
                        </div>
                        <div className="text-xs" style={{ color: pwColor }}>{pwLabel}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300" style={{ accentColor: 'var(--green-600)' }} />
                    <label className="text-xs" style={{ color: 'var(--base-600)' }}>I agree to the <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a></label>
                  </div>
                  <button type="submit" disabled={loading} className="btn-p w-full justify-center">
                    {loading ? 'Creating account...' : 'Create account'}
                  </button>
                  <button type="button" onClick={() => setStep(2)} className="btn-g w-full justify-center text-xs">Back</button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
