'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { SearchProvider } from '@/components/TopbarSearch'
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
  const [acctOpen, setAcctOpen] = useState(false)
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
    '/dashboard/saved': 'Shortlist',
    '/dashboard/applied': 'Pipeline',
    '/dashboard/profile': 'Settings',
    '/dashboard/billing': 'Plan & billing',
    '/dashboard/templates': 'Pitch templates',
    '/dashboard/team': 'Team',
    '/dashboard/analytics': 'Analytics',
    '/dashboard/lead': 'Lead',
    '/dashboard/calendar': 'Calendar',
    '/dashboard/messages': 'Messages',
  }
  // Match the most specific (longest) path so sub-pages don't fall back to "Feed".
  const pageTitle = Object.entries(pageTitles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([k]) => pathname === k || pathname.startsWith(k + '/'))?.[1] || 'Feed'

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
      setAppCount(apps.filter((a: any) => a.status !== 'saved' && a.status !== 'lost').length)
    }
    load()
  }, [supabase, router, pathname])

  useEffect(() => { setMenuOpen(false); setAcctOpen(false) }, [pathname])

  if (isOnboarding) return <>{children}</>

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/lead')
    return pathname.startsWith(href)
  }

  const navTo = (href: string) => { setMenuOpen(false); router.push(href) }
  const handleLogout = async () => {
    // Clear both client state and server cookies, then hard-navigate so no
    // cached session survives (see /auth/signout for why both are needed).
    try { await supabase.auth.signOut() } catch { /* proceed regardless */ }
    await fetch('/auth/signout', { method: 'POST' }).catch(() => {})
    window.location.href = '/'
  }

  return (
    <SearchProvider>
    <div id="app">
      {/* ─── Sidebar ─── */}
      <aside id="rail" className={menuOpen ? 'open' : ''}>
        <div className="brand">
          <span className="brand-name">Fl<span className="brand-ai">ai</span>ir</span>
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
        <button className={`nav-item ${isActive('/dashboard/analytics') ? 'active' : ''}`} onClick={() => navTo('/dashboard/analytics')}>
          <i className="ti ti-chart-bar"></i> Analytics
        </button>

        {(plan === 'max' || plan === 'team') && (
          <button className={`nav-item ${isActive('/dashboard/templates') ? 'active' : ''}`} onClick={() => navTo('/dashboard/templates')}>
            <i className="ti ti-template"></i> Templates
          </button>
        )}
        {plan === 'team' && (
          <button className={`nav-item ${isActive('/dashboard/team') ? 'active' : ''}`} onClick={() => navTo('/dashboard/team')}>
            <i className="ti ti-users-group"></i> Team
          </button>
        )}

        <div className="rail-spacer"></div>

        <div className="rail-foot">
          {isFree && (
            <div className="usage-mini">
              <div className="um-top">
                <span className="um-label">Applications</span>
                <span className="um-val">{appCount} / 5</span>
              </div>
              <div className="usage-track">
                <div className="usage-fill" style={{ width: `${usagePct}%` }}></div>
              </div>
              <button className="upgrade-link" onClick={() => navTo('/dashboard/billing')}>
                <i className="ti ti-bolt"></i> Upgrade
              </button>
            </div>
          )}

          {/* Account card — settings/plan/sign-out live in its popover, not the rail. */}
          <div className="acct-wrap">
            {acctOpen && (
              <>
                <div className="acct-backdrop" onClick={() => setAcctOpen(false)} />
                <div className="acct-pop" role="menu">
                  <button className="acct-pop-item" onClick={() => navTo('/dashboard/profile')}>
                    <i className="ti ti-adjustments" /> Settings
                  </button>
                  <button className="acct-pop-item" onClick={() => navTo('/dashboard/billing')}>
                    <i className="ti ti-sparkles" /> Plan &amp; billing
                  </button>
                  <div className="acct-pop-sep" />
                  <button className="acct-pop-item danger" onClick={handleLogout}>
                    <i className="ti ti-logout" /> Sign out
                  </button>
                </div>
              </>
            )}
            <button
              className={`acct-card ${acctOpen ? 'open' : ''}`}
              onClick={() => setAcctOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={acctOpen}
            >
              <span className="acct-avatar">{profileInitials(profile?.full_name)}</span>
              <span className="acct-meta">
                <span className="acct-name">{profile?.full_name || 'Your account'}</span>
                <span className="acct-plan">{plan === 'free' ? 'Free plan' : `${plan.charAt(0).toUpperCase()}${plan.slice(1)} plan`}</span>
              </span>
              <i className={`ti ${acctOpen ? 'ti-chevron-down' : 'ti-chevron-up'} acct-chev`} />
            </button>
          </div>
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
          <span className="brand-name" style={{ color: 'var(--ink)', fontSize: 19 }}>Fl<span className="brand-ai">ai</span>ir</span>
          <div className="avatar" style={{ marginLeft: 'auto', width: 30, height: 30, fontSize: 11 }}>
            {profileInitials(profile?.full_name)}
          </div>
        </div>

        {/* desktop topbar */}
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
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
