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
  const [appCount, setAppCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname() || ''
  const supabase = createClient()

  const isOnboarding = pathname === '/dashboard/onboarding'

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      // Single onboarding gate: incomplete profiles are funnelled to the wizard
      if ((!data || !data.onboarding_completed) && pathname !== '/dashboard/onboarding') {
        router.push('/dashboard/onboarding')
        return
      }
      try {
        const res = await fetch('/api/applications')
        if (res.ok) { const apps = await res.json(); setAppCount(apps.filter((a: any) => a.status !== 'saved').length) }
      } catch { /* ignore */ }
      const lastSeen = parseInt(localStorage.getItem('lastSeen') || '0')
      if (lastSeen > 0) {
        const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('posted_date', new Date(lastSeen).toISOString())
        setNewCount(count || 0)
      }
      localStorage.setItem('lastSeen', String(Date.now()))
    }
    load()
  }, [supabase, router, pathname])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  // Onboarding is a full-screen wizard — render it without the dashboard chrome.
  if (isOnboarding) return <>{children}</>

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
        <div className="usage-mini">
          <div className="um-top"><span className="um-label">Applications</span><span className="um-val" id="usage-text">{profile?.subscription_status === 'free' ? `${appCount} / 5` : 'Unlimited'}</span></div>
          <div className="usage-track"><div className="usage-fill" id="usage-fill" style={{ width: profile?.subscription_status === 'free' ? `${Math.min(100, (appCount / 5) * 100)}%` : '100%' }}></div></div>
          {(!profile || profile.subscription_status === 'free') && (
            <button className="upgrade-link" onClick={() => router.push('/dashboard/billing')}><i className="ti ti-bolt" style={{ fontSize: 14 }}></i> Upgrade to Pro</button>
          )}
          {profile?.subscription_status === 'pro' && (
            <button className="upgrade-link" onClick={() => router.push('/dashboard/billing')}><i className="ti ti-bolt" style={{ fontSize: 14 }}></i> Upgrade to Max</button>
          )}
        </div>
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

        {/* Profile warning banner — fine-tuning prompt for completed profiles missing a rate */}
        {profile && profile.onboarding_completed && !profile.hourly_rate && (
          <div className="flex items-center gap-2.5 px-4 md:px-8 py-2.5 text-xs font-medium animate-fadeIn"
            style={{ background: 'var(--mid-bg)', borderBottom: '1px solid #F0D9A0' }}>
            <i className="ti ti-alert-triangle" style={{ color: 'var(--mid)' }} />
            <span style={{ color: '#7A5A12' }}>Add your rate to sharpen your match scores.</span>
            <button onClick={() => router.push('/dashboard/profile')}
              className="underline font-semibold ml-auto" style={{ color: '#5E4609' }}>Update profile &rarr;</button>
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
