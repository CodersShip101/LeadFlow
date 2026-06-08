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
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Welcome back!')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 text-center">Welcome back</h1>
        <p className="mt-2 text-gray-600 text-center text-sm">
          Login to access your leads dashboard.
        </p>
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B6B4A] focus:ring-1 focus:ring-[#1B6B4A]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1B6B4A] focus:ring-1 focus:ring-[#1B6B4A]"
              placeholder="Your password"
            />
          </div>
          <div className="flex items-center justify-end">
            <Link href="/auth/forgot-password" className="text-sm text-[#1B6B4A] hover:underline">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50" style={{ background: '#1B6B4A' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#1B6B4A] font-medium hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
