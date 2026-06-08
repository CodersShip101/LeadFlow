'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newLeadCount, setNewLeadCount] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)
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
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'active')
          .gte('posted_date', new Date(lastSeen).toISOString())
        setNewLeadCount(count || 0)
      }
      localStorage.setItem('lastSeen', String(Date.now()))
    }
    load()
  }, [supabase, router])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/lead')
    return pathname.startsWith(href)
  }

  const isFree = profile?.subscription_status === 'free'

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const sidebarSections = [
    {
      label: 'Main',
      items: [
        { icon: 'ti-layout-dashboard', label: 'Feed',       href: '/dashboard' },
        { icon: 'ti-bookmark',         label: 'Saved',      href: '/dashboard/saved' },
        { icon: 'ti-send',            label: 'Pipeline',    href: '/dashboard/applied' },
      ],
    },
    {
      label: 'Insights',
      items: [
        { icon: 'ti-chart-line',  label: 'Analytics', href: '/dashboard/analytics' },
        { icon: 'ti-calendar',    label: 'Calendar',  href: '/dashboard/calendar' },
        { icon: 'ti-message-2',   label: 'Messages',  href: '/dashboard/messages' },
      ],
    },
    {
      label: 'Account',
      items: [
        { icon: 'ti-settings',    label: 'Settings',  href: '/dashboard/profile' },
        { icon: 'ti-credit-card', label: 'Billing',   href: '/dashboard/billing' },
      ],
    },
  ]

  const bottomItems = [
    { icon: 'ti-layout-dashboard', label: 'Feed',     href: '/dashboard' },
    { icon: 'ti-bookmark',         label: 'Saved',    href: '/dashboard/saved' },
    { icon: 'ti-send',             label: 'Pipeline', href: '/dashboard/applied' },
    { icon: 'ti-settings',         label: 'Profile',  href: '/dashboard/profile' },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: '#F9FAFB' }}>
      {/* ── SIDEBAR ── */}
      <aside className="hidden md:flex w-[220px] shrink-0 flex-col" style={{ background: '#0F172A' }}>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b shrink-0" style={{ borderColor: '#1E293B' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: '#1B6B4A' }}>
            LF
          </div>
          <span className="text-sm font-semibold" style={{ color: '#F1F5F9' }}>LeadFlow</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-5">
          {sidebarSections.map(section => (
            <div key={section.label}>
              <div className="text-[10px] font-semibold uppercase tracking-widest px-3 mb-1.5" style={{ color: '#475569' }}>
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.href)}
                      className={`sidebar-link ${active ? 'active' : ''}`}
                    >
                      <i className={`ti ${item.icon}`} style={{ fontSize: '16px' }} />
                      <span>{item.label}</span>
                      {item.label === 'Feed' && newLeadCount > 0 && (
                        <span className="ml-auto w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="shrink-0 px-3 py-3 border-t" style={{ borderColor: '#1E293B' }}>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors cursor-pointer" style={{ color: '#94A3B8' }} onClick={() => setAccountOpen(!accountOpen)}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: '#1B6B4A' }}>
              {(profile?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate" style={{ color: '#F1F5F9' }}>{profile?.email?.split('@')[0] || 'User'}</div>
              <div className="text-[10px] font-medium" style={{ color: isFree ? '#64748B' : '#22C55E' }}>
                {isFree ? 'Free plan' : 'Pro plan'}
              </div>
            </div>
            <i className={`ti ${accountOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '14px' }} />
          </div>
          {accountOpen && (
            <div className="px-3 pt-1.5 space-y-1">
              <button onClick={() => router.push('/dashboard/profile')} className="sidebar-link text-xs">Profile settings</button>
              <button onClick={() => router.push('/dashboard/billing')} className="sidebar-link text-xs">Manage plan</button>
              <button onClick={handleLogout} className="sidebar-link text-xs" style={{ color: '#EF4444' }}>Sign out</button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {profile && (!profile.skills || profile.skills.length === 0 || !profile.hourly_rate) && (
          <div className="flex items-center gap-2.5 px-4 md:px-8 py-2.5 text-xs font-medium animate-fade-in" style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '14px', color: '#D97706' }} />
            <span style={{ color: '#92400E' }}>Complete your profile to get matched leads.</span>
            <button onClick={() => router.push('/dashboard/profile')} className="underline font-semibold ml-auto" style={{ color: '#92400E' }}>Add skills →</button>
          </div>
        )}
        {children}
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40" style={{ background: '#0F172A', borderTop: '1px solid #1E293B', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-14">
          {bottomItems.map(item => {
            const active = isActive(item.href)
            return (
              <button key={item.label} onClick={() => router.push(item.href)}
                className="flex flex-col items-center gap-0.5 px-4 py-1.5 min-h-[44px] min-w-[64px] transition-all active:scale-[0.97]"
                style={{ color: active ? '#22C55E' : '#64748B' }}>
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
