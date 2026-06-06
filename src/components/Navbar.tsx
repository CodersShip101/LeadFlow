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

  const isAuthPage = pathname?.startsWith('/auth')
  const isDashboard = pathname?.startsWith('/dashboard')

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link href="/" className="text-xl font-bold text-gray-900">
            LeadFlow
          </Link>

          <div className="hidden sm:flex items-center gap-6">
            <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
              Home
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Dashboard
                </Link>
                <Link href="/dashboard/profile" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Profile
                </Link>
                <Link href="/dashboard/billing" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                  Billing
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </>
            ) : (
              !isAuthPage && (
                <>
                  <Link
                    href="/auth/login"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Sign Up
                  </Link>
                </>
              )
            )}
          </div>

          <button
            className="sm:hidden p-2"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden pb-4 space-y-2">
            <Link href="/" className="block text-gray-600 py-1 text-sm" onClick={() => setMenuOpen(false)}>Home</Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block text-gray-600 py-1 text-sm" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <Link href="/dashboard/profile" className="block text-gray-600 py-1 text-sm" onClick={() => setMenuOpen(false)}>Profile</Link>
                <Link href="/dashboard/billing" className="block text-gray-600 py-1 text-sm" onClick={() => setMenuOpen(false)}>Billing</Link>
                <button onClick={handleLogout} className="block text-gray-600 py-1 text-sm">Logout</button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block text-gray-600 py-1 text-sm" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link href="/auth/signup" className="block text-blue-600 py-1 text-sm font-medium" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
