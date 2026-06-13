'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'

const mainNav = [
  { icon: 'ti-layout-dashboard', label: 'Feed', href: '/dashboard' },
  { icon: 'ti-bookmark', label: 'Saved', href: '/dashboard/saved' },
  { icon: 'ti-send', label: 'Pipeline', href: '/dashboard/applied' },
]

const secondaryNav = [
  { icon: 'ti-settings', label: 'Settings', href: '/dashboard/profile' },
  { icon: 'ti-credit-card', label: 'Billing', href: '/dashboard/billing' },
]

const bottomNavMobile = [
  { icon: 'ti-layout-dashboard', label: 'Feed', href: '/dashboard' },
  { icon: 'ti-bookmark', label: 'Saved', href: '/dashboard/saved' },
  { icon: 'ti-send', label: 'Pipeline', href: '/dashboard/applied' },
  { icon: 'ti-settings', label: 'Profile', href: '/dashboard/profile' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newCount, setNewCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/lead')
    return pathname.startsWith(href)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const NavItem = ({ item, mobile }: { item: typeof mainNav[0], mobile?: boolean }) => {
    const active = isActive(item.href)
    return (
      <button onClick={() => router.push(item.href)}
        className={`flex items-center gap-3 w-full text-sm font-medium transition-all active:scale-[0.97] relative ${mobile ? 'h-12' : ''}`}
        style={{
          color: active ? 'var(--lime)' : 'var(--slate-400)',
          background: mobile && active ? 'rgba(196,240,0,.08)' : 'transparent',
        }}>
        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full transition-all duration-200 ${active ? 'opacity-100' : 'opacity-0'}`} style={{ background: 'var(--lime)' }} />
        <div className={`flex items-center gap-3 w-full ${mobile ? 'px-4' : 'px-3'} py-2.5 rounded-lg transition-all duration-150`}
          style={{ background: !mobile && active ? 'rgba(196,240,0,.08)' : 'transparent' }}>
          <i className={`ti ${item.icon}`} style={{ fontSize: mobile ? '18px' : '16px' }} />
          <span>{item.label}</span>
          {item.label === 'Feed' && newCount > 0 && (
            <span className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--lime)', boxShadow: '0 0 6px rgba(196,240,0,.5)' }} />
          )}
        </div>
      </button>
    )
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-14 shrink-0 border-b" style={{ borderColor: 'var(--ink-700)' }}>
        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>
          LF
        </span>
        <span className="text-sm font-semibold text-white">LeadFlow</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--slate-600)' }}>Leads</div>
        {mainNav.map(item => <NavItem key={item.label} item={item} />)}

        <div className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--slate-600)' }}>Account</div>
        {secondaryNav.map(item => <NavItem key={item.label} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="shrink-0 px-2 py-3 border-t" style={{ borderColor: 'var(--ink-700)' }}>
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 hover:bg-white/5 active:scale-[0.97]"
          style={{ color: 'var(--slate-500)' }}>
          <i className="ti ti-logout" style={{ fontSize: '16px' }} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[230px] shrink-0 flex-col overflow-hidden"
        style={{ background: 'var(--ink-900)', borderRight: '1px solid var(--ink-700)' }}>
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <aside className="absolute left-0 top-0 bottom-0 w-[270px] overflow-y-auto animate-slideInRight"
            style={{ background: 'var(--ink-900)', borderRight: '1px solid var(--ink-700)' }}
            onClick={e => e.stopPropagation()}>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full" style={{ background: 'var(--paper)' }}>
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 h-12 shrink-0 border-b" style={{ background: 'var(--paper-card)', borderColor: 'var(--slate-200)' }}>
          <button onClick={() => setSidebarOpen(true)} className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors active:scale-[0.93]" style={{ color: 'var(--slate-500)' }}>
            <i className="ti ti-menu-2" style={{ fontSize: '20px' }} />
          </button>
          <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--lime)', color: 'var(--ink-950)' }}>LF</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink-900)' }}>LeadFlow</span>
        </div>

        {/* Warning banner */}
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
          {bottomNavMobile.map(item => {
            const active = isActive(item.href)
            return (
              <button key={item.label} onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-0.5 px-4 py-1.5 min-h-[44px] min-w-[56px] transition-all active:scale-[0.95] relative`}
                style={{ color: active ? 'var(--lime-deep)' : 'var(--slate-400)' }}>
                {active && <div className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full" style={{ background: 'var(--lime-deep)' }} />}
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
