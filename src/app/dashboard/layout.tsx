'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import { AlertTriangle } from 'lucide-react'

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

  const railItems = [
    { icon: 'ti-layout-dashboard', label: 'Feed',          href: '/dashboard' },
    { icon: 'ti-bookmark',         label: 'Saved',         href: '/dashboard/saved' },
    { icon: 'ti-send',            label: 'Pipeline',  href: '/dashboard/applied' },
    { icon: 'ti-chart-line',       label: 'Analytics',     href: '/dashboard/analytics' },
    { icon: 'ti-calendar',         label: 'Calendar',      href: '/dashboard/calendar' },
    { icon: 'ti-settings',         label: 'Settings',      href: '/dashboard/profile' },
  ]

  const sidebarSections = [
    {
      label: 'Workspace',
      items: [
        { icon: 'ti-layout-dashboard', label: 'Feed',          href: '/dashboard' },
        { icon: 'ti-bookmark',         label: 'Saved',         href: '/dashboard/saved' },
        { icon: 'ti-send',            label: 'Pipeline',  href: '/dashboard/applied' },
        { icon: 'ti-chart-line',       label: 'Analytics',     href: '/dashboard/analytics' },
      ],
    },
    {
      label: 'Manage',
      items: [
        { icon: 'ti-calendar-event', label: 'Calendar', href: '/dashboard/calendar' },
        { icon: 'ti-message-2',     label: 'Messages', href: '/dashboard/messages' },
      ],
    },
  ]

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F3F7' }}>
      {/* ── ICON RAIL ── */}
      <aside className="hidden md:flex w-[52px] bg-white border-r shrink-0 flex-col items-center pt-4 gap-1" style={{ borderColor: '#ECEEF2' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 shrink-0" style={{ background: '#1B6B4A' }}>
          <i className="ti ti-link text-white" style={{ fontSize: '16px' }} />
        </div>
        {railItems.map(item => {
          const active = isActive(item.href)
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150 group"
              style={{
                background: active ? '#EBF5F0' : 'transparent',
                color: active ? '#1B6B4A' : '#AAB0BB',
              }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: '18px' }} />
              {item.label === 'Feed' && newLeadCount > 0 && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white" style={{ background: '#DC2626' }} />
              )}
              <div className="absolute left-12 bg-white text-xs px-2 py-1 rounded-md shadow-md border whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50" style={{ borderColor: '#ECEEF2', color: '#1A1D23' }}>
                {item.label}
              </div>
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          onClick={() => setAccountOpen(!accountOpen)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold mb-4 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1B6B4A, #2D8B5E)',
            color: 'white',
            border: '1.5px solid rgba(27,107,74,0.3)',
          }}
        >
          {(profile?.email?.[0] || 'U').toUpperCase()}
        </button>
      </aside>

      {/* ── SIDEBAR ── */}
      <aside className="hidden md:flex w-[196px] bg-white border-r shrink-0 flex-col" style={{ borderColor: '#ECEEF2' }}>
        <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-4">
          {sidebarSections.map(section => (
            <div key={section.label}>
              <div className="text-[10px] font-semibold uppercase tracking-wider px-3 mb-1" style={{ color: '#B0B6C2' }}>
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.href)}
                      className="flex items-center gap-2.5 px-3 min-h-[44px] text-sm w-full text-left transition-all duration-150 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
                      style={{
                        background: active ? '#EBF5F0' : 'transparent',
                        color: active ? '#1B6B4A' : '#6B7280',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      <i className={`ti ${item.icon}`} style={{ fontSize: '16px' }} />
                      <span className="flex-1">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="border-t pt-3 space-y-0.5" style={{ borderColor: '#ECEEF2' }}>
            <button
              onClick={() => router.push('/dashboard/profile')}
              className="flex items-center gap-2.5 px-3 min-h-[44px] text-sm w-full text-left rounded-lg transition-colors hover:bg-gray-50 active:scale-[0.98]"
              style={{ color: '#6B7280' }}
            >
              <i className="ti ti-settings" style={{ fontSize: '16px' }} /> Settings
            </button>
            <button
              onClick={() => {}}
              className="flex items-center gap-2.5 px-3 min-h-[44px] text-sm w-full text-left rounded-lg transition-colors hover:bg-gray-50 active:scale-[0.98]"
              style={{ color: '#6B7280' }}
            >
              <i className="ti ti-help-circle" style={{ fontSize: '16px' }} /> Help
            </button>
          </div>
        </nav>

        {/* Account footer */}
        <div className="shrink-0 px-4 py-3 border-t" style={{ borderColor: '#ECEEF2' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: '#1B6B4A' }}>
              {(profile?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate" style={{ color: '#1A1D23' }}>{profile?.email?.split('@')[0] || 'User'}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: isFree ? '#F5F5F7' : '#EBF5F0', color: isFree ? '#AAB0BB' : '#1B6B4A' }}>
                  {isFree ? 'Free' : 'Pro'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => router.push('/dashboard/profile')} className="text-[10px] flex items-center gap-1 transition-all hover:opacity-80 active:scale-[0.97] min-h-[28px]" style={{ color: '#AAB0BB' }}>
              <i className="ti ti-user" style={{ fontSize: '10px' }} /> Profile
            </button>
            <button onClick={() => router.push('/dashboard/billing')} className="text-[10px] flex items-center gap-1 transition-all hover:opacity-80 active:scale-[0.97] min-h-[28px]" style={{ color: '#AAB0BB' }}>
              <i className="ti ti-credit-card" style={{ fontSize: '10px' }} /> Billing
            </button>
            <button onClick={handleLogout} className="text-[10px] flex items-center gap-1 transition-all hover:opacity-80 active:scale-[0.97] min-h-[28px]" style={{ color: '#DC2626' }}>
              <i className="ti ti-logout" style={{ fontSize: '10px' }} /> Exit
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {profile && (!profile.skills || profile.skills.length === 0 || !profile.hourly_rate) && (
          <div className="flex items-center gap-2 px-4 md:px-8 py-2.5 text-xs font-medium" style={{ background: '#FAEEDA', borderBottom: '1px solid #FCD68A' }}>
            <AlertTriangle size={14} style={{ color: '#D97706' }} />
            <span style={{ color: '#92400E' }}>Complete your profile to get matched leads.</span>
            <button onClick={() => router.push('/dashboard/profile')} className="underline font-semibold" style={{ color: '#92400E' }}>Add your skills now →</button>
          </div>
        )}
        {children}
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t flex items-center justify-around z-40" style={{ borderColor: '#ECEEF2' }}>
        {[
          { icon: 'ti-layout-dashboard', label: 'Feed',     href: '/dashboard' },
          { icon: 'ti-bookmark',         label: 'Saved',    href: '/dashboard/saved' },
          { icon: 'ti-send',             label: 'Pipeline',   href: '/dashboard/applied' },
          { icon: 'ti-settings',         label: 'Profile',   href: '/dashboard/profile' },
        ].map(item => {
          const active = isActive(item.href)
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-0.5 px-4 py-1"
              style={{ color: active ? '#1B6B4A' : '#AAB0BB' }}>
              <i className={`ti ${item.icon}`} style={{ fontSize: '17px' }} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
