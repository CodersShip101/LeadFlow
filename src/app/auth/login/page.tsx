'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Welcome back!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* LEFT: brand panel */}
      <div className="hidden lg:flex w-[40%] flex-col justify-between p-12" style={{ background: 'var(--ink-2)' }}>
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--cream)' }}>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--amber)', color: 'var(--ink)' }}>LF</span>
          LeadFlow
        </div>
        <div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mb-4" style={{ background: 'var(--amber)', color: 'var(--ink)' }}>SK</div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--slate)' }}>&ldquo;I was spending 3 hours a day on job boards. Now I open LeadFlow once and have 5 curated leads waiting.&rdquo;</p>
          <p className="text-xs mt-3" style={{ color: 'var(--slate-2)' }}>Sarah K. — Freelance UX Designer</p>
        </div>
      </div>

      {/* RIGHT: form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--amber)' }}>
              <span className="text-sm font-bold" style={{ color: 'var(--ink)' }}>LF</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--cream)' }}>Welcome back</h1>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--slate)' }}>Sign in to your LeadFlow account</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--slate-2)' }}>Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="input" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--slate-2)' }}>Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)}
                  className="input pr-10" placeholder="Your password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: 'var(--slate)' }}>
                  <i className={`ti ${showPw ? 'ti-eye-off' : 'ti-eye'}`} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Link href="/auth/reset-password" className="text-xs font-medium hover:underline" style={{ color: 'var(--amber)' }}>Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-p w-full justify-center">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 text-center text-xs" style={{ color: 'var(--slate-2)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="font-semibold hover:underline" style={{ color: 'var(--amber)' }}>Sign up →</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
