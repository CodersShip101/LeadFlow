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

const accountNav = [
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
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => { setMenuOpen(false) }, [pathname])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/lead')
    return pathname.startsWith(href)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  const SidebarContent = () => (
    <>
      <div className="sb-logo">
        <span className="sb-logo-icon">LF</span>
        <span className="sb-logo-name">LeadFlow</span>
      </div>
      <div className="sb-nav">
        <div className="sb-section">
          <div className="sb-section-label">Leads</div>
          {mainNav.map(item => (
            <button key={item.label} onClick={() => router.push(item.href)}
              className={`sb-item ${isActive(item.href) ? 'active' : ''}`}>
              <i className={`ti ${item.icon}`} />
              <span className="label">{item.label}</span>
              {item.label === 'Feed' && newCount > 0 && <span className="badge">{newCount}</span>}
            </button>
          ))}
        </div>
        <div className="sb-section">
          <div className="sb-section-label">Account</div>
          {accountNav.map(item => (
            <button key={item.label} onClick={() => router.push(item.href)}
              className={`sb-item ${isActive(item.href) ? 'active' : ''}`}>
              <i className={`ti ${item.icon}`} />
              <span className="label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="sb-footer">
        <button onClick={handleLogout} className="sb-item-logout">
          <i className="ti ti-logout" />
          <span className="label">Sign out</span>
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--paper)' }}>
      {/* Desktop sidebar */}
      <aside className="sb">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <div className={`sb-overlay ${menuOpen ? 'open' : ''}`}>
        <div className="sb-overlay-backdrop" onClick={() => setMenuOpen(false)} />
        <div className="sb-overlay-panel">
          <SidebarContent />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--paper)' }}>
        {/* Mobile header */}
        <div className="sb-mobile-header">
          <button onClick={() => setMenuOpen(true)} className="sb-item" style={{ width: 'auto', padding: '0 8px', height: '36px', borderRadius: '8px' }}>
            <i className="ti ti-menu-2" />
          </button>
          <span className="sb-logo-icon">LF</span>
          <span className="sb-logo-name">LeadFlow</span>
        </div>

        {/* Profile warning banner */}
        {profile && (!profile.skills || profile.skills.length === 0 || !profile.hourly_rate) && (
          <div className="flex items-center gap-2.5 px-4 md:px-8 py-2.5 text-xs font-medium animate-fadeIn"
            style={{ background: 'var(--mid-bg)', borderBottom: '1px solid #F0D9A0' }}>
            <i className="ti ti-alert-triangle" style={{ color: 'var(--mid)' }} />
            <span style={{ color: '#7A5A12' }}>Complete your profile to get matched leads.</span>
            <button onClick={() => router.push('/dashboard/profile')}
              className="underline font-semibold ml-auto" style={{ color: '#5E4609' }}>Add skills &rarr;</button>
          </div>
        )}

        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="sb-bottom-nav">
        <div className="sb-bottom-nav-inner">
          {bottomNavMobile.map(item => (
            <button key={item.label} onClick={() => router.push(item.href)}
              className={`sb-bottom-item ${isActive(item.href) ? 'active' : ''}`}>
              <i className={`ti ${item.icon}`} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
