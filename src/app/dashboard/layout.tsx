'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import TopbarSearch, { SearchProvider } from '@/components/TopbarSearch'
import type { Profile } from '@/types'

const profileInitials = (name?: string | null) => {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newCount, setNewCount] = useState(0)
  const [appCount, setAppCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname() || ''
  const supabase = createClient()

  const isOnboarding = pathname === '/dashboard/onboarding'

  const plan = profile?.subscription_status || 'free'
  const isFree = plan === 'free'
  const usageMax = isFree ? 5 : Infinity
  const usagePct = Math.min(100, Math.round((appCount / usageMax) * 100))

  const pageTitles: Record<string, string> = {
    '/dashboard': 'Feed',
    '/dashboard/saved': 'Saved',
    '/dashboard/applied': 'Pipeline',
    '/dashboard/profile': 'Settings',
    '/dashboard/billing': 'Plan',
  }
  const pageTitle = Object.entries(pageTitles).find(([k]) => pathname.startsWith(k))?.[1] || 'Feed'

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)

      if ((!data || !data.onboarding_completed) && pathname !== '/dashboard/onboarding') {
        router.push('/dashboard/onboarding')
        return
      }

      const lastSeen = parseInt(localStorage.getItem('lastSeen') || '0')
      if (lastSeen > 0) {
        const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'active').gte('posted_date', new Date(lastSeen).toISOString())
        setNewCount(count || 0)
      }
      localStorage.setItem('lastSeen', String(Date.now()))

      const res = await fetch('/api/applications')
      const apps = res.ok ? await res.json() : []
      setAppCount(apps.filter((a: any) => a.status !== 'saved').length)
    }
    load()
  }, [supabase, router, pathname])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (isOnboarding) return <>{children}</>

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/lead')
    return pathname.startsWith(href)
  }

  const navTo = (href: string) => { setMenuOpen(false); router.push(href) }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  return (
    <SearchProvider>
    <div id="app">
      {/* ─── Sidebar ─── */}
      <aside id="rail" className={menuOpen ? 'open' : ''}>
        <div className="brand">
          <span className="brand-name">fl<span className="brand-ai">ai</span>ir</span>
        </div>

        <div className="rail-label">Leads</div>
        <button className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`} onClick={() => navTo('/dashboard')}>
          <i className="ti ti-layout-grid"></i> Feed{newCount > 0 && <span className="nav-badge">{newCount}</span>}
        </button>
        <button className={`nav-item ${isActive('/dashboard/saved') ? 'active' : ''}`} onClick={() => navTo('/dashboard/saved')}>
          <i className="ti ti-bookmark"></i> Saved
        </button>
        <button className={`nav-item ${isActive('/dashboard/applied') ? 'active' : ''}`} onClick={() => navTo('/dashboard/applied')}>
          <i className="ti ti-arrows-split"></i> Pipeline
        </button>

        <div className="rail-label">Account</div>
        <button className={`nav-item ${isActive('/dashboard/profile') ? 'active' : ''}`} onClick={() => navTo('/dashboard/profile')}>
          <i className="ti ti-adjustments"></i> Settings
        </button>
        <button className={`nav-item ${isActive('/dashboard/billing') ? 'active' : ''}`} onClick={() => navTo('/dashboard/billing')}>
          <i className="ti ti-sparkles"></i> Plan
        </button>

        <div className="rail-spacer"></div>

        <div className="rail-foot">
          <div className="usage-mini">
            <div className="um-top">
              <span className="um-label">Applications</span>
              <span className="um-val">{isFree ? `${appCount} / 5` : 'Unlimited'}</span>
            </div>
            <div className="usage-track">
              <div className="usage-fill" style={{ width: `${isFree ? usagePct : 100}%` }}></div>
            </div>
            <button className="upgrade-link" onClick={() => navTo('/dashboard/billing')}>
              <i className="ti ti-bolt"></i> Upgrade to Pro
            </button>
          </div>
          <button className="nav-item" onClick={handleLogout}><i className="ti ti-logout"></i> Sign out</button>
        </div>
      </aside>
      <div className={`overlay ${menuOpen ? 'show' : ''}`} onClick={() => setMenuOpen(false)} />

      {/* ─── Main ─── */}
      <main id="main">
        {/* mobile top */}
        <div id="mobile-top">
          <button onClick={() => setMenuOpen(true)} className="btn-icon tip" data-tip="Menu" aria-label="Open menu">
            <i className="ti ti-menu-2"></i>
          </button>
          <span className="brand-name" style={{ color: 'var(--ink)', fontSize: 19 }}>fl<span className="brand-ai">ai</span>ir</span>
          <div className="avatar" style={{ marginLeft: 'auto', width: 30, height: 30, fontSize: 11 }}>
            {profileInitials(profile?.full_name)}
          </div>
        </div>

        {/* desktop topbar */}
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
          </div>
          <div className="tb-right">
            <TopbarSearch />
            <div className="avatar">{profileInitials(profile?.full_name)}</div>
          </div>
        </header>

        {/* Profile warning banner */}
        {profile && profile.onboarding_completed && !profile.hourly_rate && (
          <div className="profile-banner">
            <i className="ti ti-alert-triangle"></i>
            <div className="pb-txt"><b>Finish your profile</b> — add your skills and rate so we can score leads for you.</div>
            <a onClick={() => navTo('/dashboard/profile')}>Complete profile &rarr;</a>
          </div>
        )}

        <div className="page">
          <div className="page-inner">
            {children}
          </div>
        </div>
      </main>

      {/* mobile tabs */}
      <nav id="mobile-tabs">
        <button className={`mtab ${isActive('/dashboard') ? 'on' : ''}`} onClick={() => router.push('/dashboard')}>
          <i className="ti ti-layout-grid"></i> Feed
        </button>
        <button className={`mtab ${isActive('/dashboard/saved') ? 'on' : ''}`} onClick={() => router.push('/dashboard/saved')}>
          <i className="ti ti-bookmark"></i> Saved
        </button>
        <button className={`mtab ${isActive('/dashboard/applied') ? 'on' : ''}`} onClick={() => router.push('/dashboard/applied')}>
          <i className="ti ti-arrows-split"></i> Pipeline
        </button>
        <button className={`mtab ${isActive('/dashboard/profile') ? 'on' : ''}`} onClick={() => router.push('/dashboard/profile')}>
          <i className="ti ti-user"></i> Profile
        </button>
      </nav>
    </div>
    </SearchProvider>
  )
}
