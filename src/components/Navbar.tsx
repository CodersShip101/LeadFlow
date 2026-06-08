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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b" style={{ borderColor: '#F3F4F6' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex justify-between h-14 items-center">
          <Link href="/" className="text-base font-bold tracking-tight flex items-center gap-2" style={{ color: '#111827' }}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: '#1B6B4A' }}>
              LF
            </span>
            LeadFlow
          </Link>

          {isLanding ? (
            <div className="flex items-center gap-3">
              <Link href="/auth/login" className="btn-ghost-sm">Login</Link>
              <Link href="/auth/signup" className="btn-primary-sm">Get started free</Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-5">
              {user ? (
                <>
                  <Link href="/dashboard" className="btn-ghost-sm">Dashboard</Link>
                  <button onClick={handleLogout} className="btn-ghost-sm">Logout</button>
                </>
              ) : (
                !isAuthPage && (
                  <>
                    <Link href="/auth/login" className="btn-ghost-sm">Login</Link>
                    <Link href="/auth/signup" className="btn-primary-sm">Sign up free</Link>
                  </>
                )
              )}
            </div>
          )}

          {!isLanding && (
            <button className="sm:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{ color: '#6B7280' }}>
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
          <div className="sm:hidden pb-3 space-y-1.5 border-t pt-2" style={{ borderColor: '#F3F4F6' }}>
            {user ? (
              <>
                <Link href="/dashboard" className="block text-sm py-2 px-1 rounded" style={{ color: '#6B7280' }} onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { handleLogout(); setMenuOpen(false) }} className="block text-sm py-2 px-1 rounded w-full text-left" style={{ color: '#DC2626' }}>Logout</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block text-sm py-2 px-1 rounded" style={{ color: '#6B7280' }} onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/auth/signup" className="block text-sm py-2 px-1 rounded font-medium" style={{ color: '#1B6B4A' }} onClick={() => setMenuOpen(false)}>Sign up free</Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
