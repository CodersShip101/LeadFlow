'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import {
  LayoutDashboard, Bookmark, Send, MessageSquare,
  CalendarDays, Settings, AlertTriangle, Bell,
  LogOut, CreditCard, User, ChevronDown
} from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newLeadCount, setNewLeadCount] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/dashboard/lead')
    return pathname.startsWith(href)
  }

  const isFree = profile?.subscription_status === 'free'

  const sidebarSections = [
    {
      label: 'Main',
      items: [
        { label: 'Feed',        icon: LayoutDashboard, href: '/dashboard' },
        { label: 'Saved',       icon: Bookmark,        href: '/dashboard/saved' },
        { label: 'Applications',icon: Send,            href: '/dashboard/applied' },
      ],
    },
    {
      label: 'Connect',
      items: [
        { label: 'Messages',    icon: MessageSquare,   href: '/dashboard/messages' },
        { label: 'Calendar',    icon: CalendarDays,    href: '/dashboard/calendar' },
      ],
    },
  ]

  const handleLogout = async () => {
    setAccountOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F3F7' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[220px] bg-white border-r shrink-0 flex-col" style={{ borderColor: '#ECEEF2' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b shrink-0" style={{ borderColor: '#ECEEF2' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: '#1B6B4A' }}>L</div>
          <span className="text-sm font-bold tracking-tight" style={{ color: '#1A1D23' }}>LeadFlow</span>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4 space-y-4">
          {sidebarSections.map(section => (
            <div key={section.label}>
              <div className="text-[9px] font-semibold uppercase tracking-wider px-3 mb-1" style={{ color: '#B0B6C2' }}>
                {section.label}
              </div>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const Icon = item.icon
                  const active = isActive(item.href)
                  return (
                    <button
                      key={item.label}
                      onClick={() => router.push(item.href)}
                      className="flex items-center gap-3 px-3 py-2 text-sm w-full text-left transition-all duration-150 relative"
                      style={{
                        color: active ? '#1B6B4A' : '#6B7280',
                        fontWeight: active ? 500 : 400,
                        paddingLeft: '15px',
                      }}
                    >
                      {active && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                          style={{ background: '#1B6B4A' }}
                        />
                      )}
                      <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
                      <span className="flex-1">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Notifications */}
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider px-3 mb-1" style={{ color: '#B0B6C2' }}>
              Alerts
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-3 px-3 py-2 text-sm w-full text-left transition-all duration-150 relative"
              style={{ color: '#6B7280', paddingLeft: '15px' }}
            >
              <Bell size={16} strokeWidth={1.5} />
              <span className="flex-1">Notifications</span>
              {newLeadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#1B6B4A', minWidth: '18px', textAlign: 'center' }}>
                  {newLeadCount > 9 ? '9+' : newLeadCount}
                </span>
              )}
            </button>
          </div>
        </nav>

        {/* Account card at bottom */}
        <div className="shrink-0 px-3 pb-3 pt-2 relative" ref={accountRef}>
          <div className="border-t mb-2" style={{ borderColor: '#ECEEF2' }} />
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg w-full text-left transition-colors hover:bg-gray-50"
            style={{ color: '#1A1D23' }}
          >
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: '#1B6B4A' }}>
              {(profile?.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate" style={{ color: '#1A1D23' }}>{profile?.email?.split('@')[0] || 'User'}</div>
              <div className="text-[10px]" style={{ color: '#AAB0BB' }}>{isFree ? 'Free' : 'Pro'}</div>
            </div>
            <ChevronDown size={12} style={{ color: '#AAB0BB' }} className={`transition-transform duration-150 ${accountOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Account popover */}
          {accountOpen && (
            <div
              className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-lg shadow-lg border py-1 z-50"
              style={{ borderColor: '#ECEEF2' }}
            >
              <button
                onClick={() => { setAccountOpen(false); router.push('/dashboard/profile') }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs w-full text-left hover:bg-gray-50 transition-colors"
                style={{ color: '#6B7280' }}
              >
                <User size={14} /> Profile & Settings
              </button>
              <button
                onClick={() => { setAccountOpen(false); router.push('/dashboard/billing') }}
                className="flex items-center gap-2.5 px-3 py-2 text-xs w-full text-left hover:bg-gray-50 transition-colors"
                style={{ color: '#6B7280' }}
              >
                <CreditCard size={14} /> Billing & Usage
              </button>
              <div className="border-t my-1" style={{ borderColor: '#ECEEF2' }} />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 text-xs w-full text-left hover:bg-gray-50 transition-colors"
                style={{ color: '#DC2626' }}
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        {/* Profile banner */}
        {profile && (!profile.skills || profile.skills.length === 0 || !profile.hourly_rate) && (
          <div className="flex items-center gap-2 px-4 md:px-8 py-2.5 text-xs font-medium" style={{ background: '#FAEEDA', borderBottom: '1px solid #FCD68A' }}>
            <AlertTriangle size={14} style={{ color: '#D97706' }} />
            <span style={{ color: '#92400E' }}>Complete your profile to get matched leads.</span>
            <button onClick={() => router.push('/dashboard/profile')} className="underline font-semibold" style={{ color: '#92400E' }}>Add your skills now →</button>
          </div>
        )}

        {children}
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t flex items-center justify-around z-40" style={{ borderColor: '#ECEEF2' }}>
        {[
          { icon: LayoutDashboard, label: 'Feed',     href: '/dashboard' },
          { icon: Bookmark,        label: 'Saved',    href: '/dashboard/saved' },
          { icon: Send,            label: 'Applied',   href: '/dashboard/applied' },
          { icon: Settings,        label: 'Profile',   href: '/dashboard/profile' },
        ].map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-0.5 px-4 py-1"
              style={{ color: active ? '#1B6B4A' : '#AAB0BB' }}>
              <Icon size={17} strokeWidth={active ? 2.5 : 1.5} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
