'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const isLanding = pathname === '/'
  const isAuthPage = pathname?.startsWith('/auth')
  const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')

  if (isDashboard) return null

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 items-center">
          <Link href="/" className="text-base font-bold tracking-tight" style={{ color: '#1A1D23' }}>
            LeadFlow
          </Link>

          {isLanding ? (
            <Link
              href="/auth/signup"
              className="text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: '#1B6B4A' }}
            >
              Sign Up Free
            </Link>
          ) : (
            <div className="hidden sm:flex items-center gap-5">
              {user ? (
                <>
                  <Link href="/dashboard" className="text-sm font-medium" style={{ color: '#6B7280' }}>Dashboard</Link>
                  <button onClick={handleLogout} className="text-sm font-medium" style={{ color: '#6B7280' }}>Logout</button>
                </>
              ) : (
                !isAuthPage && (
                  <>
                    <Link href="/auth/login" className="text-sm font-medium" style={{ color: '#6B7280' }}>Login</Link>
                    <Link href="/auth/signup" className="text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity" style={{ background: '#1B6B4A' }}>Sign Up Free</Link>
                  </>
                )
              )}
            </div>
          )}

          {!isLanding && (
            <button className="sm:hidden p-1.5" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>

        {menuOpen && !isLanding && (
          <div className="sm:hidden pb-3 space-y-1.5">
            {user ? (
              <>
                <Link href="/dashboard" className="block text-sm py-1" style={{ color: '#6B7280' }} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="block text-sm py-1" style={{ color: '#6B7280' }}>Logout</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block text-sm py-1" style={{ color: '#6B7280' }} onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/auth/signup" className="block text-sm py-1 font-medium" style={{ color: '#1B6B4A' }} onClick={() => setMenuOpen(false)}>Sign Up Free</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
