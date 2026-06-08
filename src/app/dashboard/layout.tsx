'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import type { Profile } from '@/types'
import {
  LayoutDashboard, Bookmark, Send, MessageSquare,
  CalendarDays, Settings, AlertTriangle, Bell
} from 'lucide-react'

const today = new Date()
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function getCalendarDays() {
  const y = today.getFullYear(), m = today.getMonth()
  const first = new Date(y, m, 1).getDay()
  const total = new Date(y, m + 1, 0).getDate()
  const d: (number | null)[] = []
  for (let i = 0; i < first; i++) d.push(null)
  for (let i = 1; i <= total; i++) d.push(i)
  return { month: months[m], year: y, days: d }
}

const sidebarItems = [
  { label: 'Feed',        icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Saved',       icon: Bookmark,        href: '/dashboard/saved' },
  { label: 'Applications',icon: Send,            href: '/dashboard/applied' },
  { label: 'Messages',    icon: MessageSquare,   href: '/dashboard/messages' },
  { label: 'Calendar',    icon: CalendarDays,    href: '/dashboard/calendar' },
  { label: 'Settings',    icon: Settings,        href: '/dashboard/profile' },
]

const mobileItems = [
  { icon: LayoutDashboard, label: 'Feed',     href: '/dashboard' },
  { icon: Bookmark,        label: 'Saved',    href: '/dashboard/saved' },
  { icon: Send,            label: 'Applied',   href: '/dashboard/applied' },
  { icon: Settings,        label: 'Profile',   href: '/dashboard/profile' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [newLeadCount, setNewLeadCount] = useState(0)
  const [cal, setCal] = useState({ month: '', year: 0, days: [] as (number | null)[] })
  const router = useRouter()
  const pathname = usePathname() || ''
  const supabase = createClient()

  useEffect(() => {
    setCal(getCalendarDays())
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)

      // Count new leads since last seen
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

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F3F7' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[210px] bg-white border-r shrink-0 flex-col" style={{ borderColor: '#ECEEF2' }}>
        <div className="flex items-center gap-2 px-5 h-14 border-b shrink-0" style={{ borderColor: '#ECEEF2' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ background: '#1B6B4A' }}>L</div>
          <span className="text-base font-semibold" style={{ color: '#1A1D23' }}>LeadFlow</span>
        </div>
        <nav className="flex-1 px-3 pt-5 space-y-0.5">
          {sidebarItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <button
                key={item.label}
                onClick={() => router.push(item.href)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors"
                style={{
                  background: active ? '#EBF5F0' : 'transparent',
                  color: active ? '#1B6B4A' : '#6B7280',
                  fontWeight: active ? 500 : 400,
                }}
              >
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
              </button>
            )
          })}
        </nav>
        <div className="px-3 mb-2">
          <button onClick={() => router.push('/dashboard')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full text-left transition-colors relative" style={{ color: '#6B7280' }}>
            <Bell size={16} />
            <span className="flex-1">Notifications</span>
            {newLeadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: '#1B6B4A', minWidth: '18px', textAlign: 'center' }}>
                {newLeadCount > 9 ? '9+' : newLeadCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2 px-5 py-3.5 border-t shrink-0" style={{ borderColor: '#ECEEF2' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium" style={{ background: '#1B6B4A' }}>
            {(profile?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate" style={{ color: '#1A1D23' }}>{profile?.email?.split('@')[0] || 'User'}</div>
            <div className="text-[10px]" style={{ color: '#AAB0BB' }}>{isFree ? 'Free' : 'Pro'}</div>
          </div>
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
        {mobileItems.map(item => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              className="flex flex-col items-center gap-0.5 px-4 py-1"
              style={{ color: active ? '#1B6B4A' : '#AAB0BB' }}>
              <Icon size={17} />
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
