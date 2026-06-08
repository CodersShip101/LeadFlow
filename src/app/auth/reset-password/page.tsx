'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import toast from 'react-hot-toast'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { toast.error(error.message); setLoading(false); return }
    toast.success('Password updated!')
    router.push('/auth/login')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: '#1B6B4A' }}>
            <span className="text-white text-sm font-bold">LF</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#111827' }}>Set new password</h1>
          <p className="mt-1.5 text-sm" style={{ color: '#6B7280' }}>Enter your new password below.</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>New password</label>
            <input id="password" type="password" required minLength={6} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all"
              style={{ borderColor: '#D1D5DB', color: '#111827', background: '#FFFFFF' }}
              placeholder="At least 6 characters" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
