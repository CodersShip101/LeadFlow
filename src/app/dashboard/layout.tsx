'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'

const navItems = [
  { icon: 'ti-layout-dashboard', label: 'Feed', href: '/dashboard' },
  { icon: 'ti-bookmark', label: 'Saved', href: '/dashboard/saved' },
  { icon: 'ti-send', label: 'Pipeline', href: '/dashboard/applied' },
  { icon: 'ti-settings', label: 'Settings', href: '/dashboard/profile' },
  { icon: 'ti-credit-card', label: 'Billing', href: '/dashboard/billing' },
]

const bottomItems = [
  { icon: 'ti-layout-dashboard', label: 'Feed', href: '/dashboard' },
  { icon: 'ti-bookmark', label: 'Saved', href: '/dashboard/saved' },
  { icon: 'ti-send', label: 'Pipeline', href: '/dashboard/applied' },
  { icon: 'ti-settings', label: 'Profile', href: '/dashboard/profile' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newCount, setNewCount] = useState(0)
  const router = useRouter()
  const pathname = usePathname() || ''
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      const lastSeen = parseInt(localStorage.getItem('lastSeen') || '0')
      if (lastSeen > 0) {
        const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('posted_date', new Date(lastSeen).toISOString())
        setNewCount(count || 0)
      }
      localStorage.setItem('lastSeen', String(Date.now()))
    }
    load()
  }, [supabase, router])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/lead')
    return pathname.startsWith(href)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col" style={{ background: 'var(--ink-900)', borderRight: '1px solid var(--ink-700)' }}>
        <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b" style={{ borderColor: 'var(--ink-700)' }}>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>LF</span>
          <span className="text-sm font-semibold text-white">LeadFlow</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-1">
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <button key={item.label} onClick={() => router.push(item.href)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg transition-all active:scale-[0.97] text-sm font-medium"
                style={{
                  background: active ? 'rgba(196,240,0,.1)' : 'transparent',
                  color: active ? 'var(--lime)' : 'var(--slate-400)',
                }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: '16px' }} />
                <span>{item.label}</span>
                {item.label === 'Feed' && newCount > 0 && <span className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--lime)' }} />}
              </button>
            )
          })}
        </nav>
        <div className="shrink-0 px-3 py-3 border-t space-y-1" style={{ borderColor: 'var(--ink-700)' }}>
          <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.97]" style={{ color: 'var(--slate-400)' }}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full" style={{ background: 'var(--paper)' }}>
        {profile && (!profile.skills || profile.skills.length === 0 || !profile.hourly_rate) && (
          <div className="flex items-center gap-2.5 px-4 md:px-8 py-2.5 text-xs font-medium animate-fadeIn" style={{ background: 'rgba(255,176,32,.1)', borderBottom: '1px solid rgba(255,176,32,.25)' }}>
            <i className="ti ti-alert-triangle" style={{ color: 'var(--amber)' }} />
            <span style={{ color: 'var(--slate-700)' }}>Complete your profile to get matched leads.</span>
            <button onClick={() => router.push('/dashboard/profile')} className="underline font-semibold ml-auto" style={{ color: 'var(--slate-700)' }}>Add skills &rarr;</button>
          </div>
        )}
        {children}
      </div>

      {/* Bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40" style={{ background: 'var(--paper-card)', borderTop: '1px solid var(--slate-200)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {bottomItems.map(item => {
            const active = isActive(item.href)
            return (
              <button key={item.label} onClick={() => router.push(item.href)}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 min-h-[44px] min-w-[64px] transition-all active:scale-[0.97]"
                style={{ color: active ? 'var(--lime-deep)' : 'var(--slate-400)' }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: '20px' }} />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
