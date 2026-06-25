'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, timeAgo, isNewLead, formatDate } from '@/lib/utils'

interface LeadCardProps {
  lead: Lead
  profile: Profile | null
  application: Application | null
  isFreeUser?: boolean
  index?: number
  onBookmark: (id: string) => void
  onInterest: (id: string) => void
  onUpgrade: () => void
}

function getSourceClass(srcLabel: string): string {
  const map: Record<string, string> = {
    reddit: 'sb-reddit', reed: 'sb-reed', indeed: 'sb-indeed',
    cwjobs: 'sb-cwjobs', linkedin: 'sb-linkedin', upwork: 'sb-upwork',
    'people per hour': 'sb-peopleperhour', freelancer: 'sb-freelancer',
  }
  return map[srcLabel.toLowerCase()] || 'sb-default'
}

function timeAgoShort(dateStr?: string | number) {
  if (!dateStr) return ''
  const now = Date.now()
  const then = typeof dateStr === 'number' ? dateStr : new Date(dateStr).getTime()
  const diff = now - then
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

function formatBudgetShort(min?: number | null, max?: number | null): string {
  if (!min && !max) return ''
  const fmt = (n: number) => n >= 1000 ? `£${n / 1000}k` : `£${n}`
  if (min && max) return `${fmt(min)}–${fmt(max)}`
  if (min) return `${fmt(min)}+`
  if (max) return `up to ${fmt(max)}`
  return ''
}

export default function LeadCard({ lead, profile, application, isFreeUser, index = 0, onBookmark, onInterest, onUpgrade }: LeadCardProps) {
  const router = useRouter()
  const src = getSourceInfo(lead.source_url)
  const match = computeMatchExplanation(lead, profile)
  const isLocked = isFreeUser && index >= 3
  const isInterested = !!(application && application.status !== 'saved')
  const isSaved = application?.status === 'saved'
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleClick = useCallback(() => {
    if (isLocked) { onUpgrade(); return }
    router.push(`/dashboard/lead/${lead.id}`)
  }, [isLocked, lead.id, onUpgrade, router])

  const handleBookmark = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onBookmark(lead.id)
  }, [lead.id, onBookmark])

  const handleInterest = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onInterest(lead.id)
  }, [lead.id, onInterest])

  const handleView = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLocked) { onUpgrade(); return }
    router.push(`/dashboard/lead/${lead.id}`)
  }, [isLocked, lead.id, onUpgrade, router])

  const handleApply = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer')
  }, [lead.source_url])

  const toggleMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(prev => !prev)
  }, [])

  if (isLocked) {
    return (
      <div
        onClick={onUpgrade}
        className="rounded-xl px-4 py-3 select-none"
        style={{ border: '0.5px solid #E5E7EB', background: '#F9FAFB', opacity: 0.4, cursor: 'not-allowed' }}
      >
        <div className="flex items-center gap-2">
          <span className="sbadge sb-default">{src.label}</span>
          <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#AAB0BB' }}>Pro Lead</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#F2F3F7', color: '#AAB0BB' }}>Pro only</span>
          <span className="text-[10px]" style={{ color: '#C0C6D2' }}>{timeAgo(lead.posted_date)}</span>
        </div>
      </div>
    )
  }

  const budget = formatBudgetShort(lead.budget_min, lead.budget_max)

  return (
    <div
      onClick={handleClick}
      className="group relative rounded-xl px-4 py-3 cursor-pointer select-none active:scale-[0.998]"
      style={{
        background: '#FFFFFF',
        border: '0.5px solid #E5E7EB',
        borderLeft: isInterested ? '3px solid #1B6B4A' : '0.5px solid #E5E7EB',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#D0D4DE'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '#E5E7EB'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Top row: source badge + New + score + bookmark + dots */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`sbadge ${getSourceClass(src.label)}`}>{src.label}</span>
        {isNewLead(lead.posted_date) && <span className="bnew">New</span>}
        <div className="ml-auto flex items-center gap-1.5">
          <span className={`mscore ${match.score >= 8 ? 'ms-hi' : match.score >= 6 ? 'ms-mid' : 'ms-lo'}`}>
            {match.score}/10
          </span>
          <button
            onClick={handleBookmark}
            className={`ibtn ${isSaved ? 'saved' : ''}`}
            title={isSaved ? 'Saved' : 'Save'}
          >
            <i className="ti ti-bookmark" />
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={toggleMenu} className="ibtn dots" title="More"><i className="ti ti-dots" /></button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-50 min-w-[140px]" style={{ borderColor: '#ECEEF2' }}>
                <button onClick={handleView} className="flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left hover:bg-gray-50" style={{ color: '#6B7280' }}>
                  <i className="ti ti-eye" style={{ fontSize: '13px' }} /> View details
                </button>
                {lead.source_url && (
                  <button onClick={handleApply} className="flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left hover:bg-gray-50" style={{ color: '#6B7280' }}>
                    <i className="ti ti-external-link" style={{ fontSize: '13px' }} /> Apply externally
                  </button>
                )}
                <div className="border-t my-1" style={{ borderColor: '#ECEEF2' }} />
                <button onClick={handleInterest} className="flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left hover:bg-gray-50" style={{ color: isInterested ? '#1B6B4A' : '#6B7280' }}>
                  <i className="ti ti-send" style={{ fontSize: '13px' }} /> {isInterested ? 'Mark not interested' : "I'm interested"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-[13.5px] font-semibold leading-snug mb-1 line-clamp-1" style={{ color: '#1A1D23' }}>
        {lead.title}
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed line-clamp-2 mb-2" style={{ color: '#6B7280' }}>
        {lead.description}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {budget && (
          <span className="mpill bud"><i className="ti ti-currency-pound" />{budget}</span>
        )}
        {lead.client_location && (
          <span className="mpill loc"><i className="ti ti-map-pin" />{lead.client_location}</span>
        )}
        {lead.project_type && (
          <span className="mpill typ">
            <i className={`ti ${lead.project_type === 'contract' ? 'ti-file-description' : 'ti-refresh'}`} />
            {lead.project_type}
          </span>
        )}
      </div>

      {/* Footer: skills + CTA */}
      <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid #ECEEF2' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.skills_required?.slice(0, 3).map(s => (
            <span key={s} className={`sk ${profile?.skills?.some(ps => ps.toLowerCase() === s.toLowerCase()) ? 'm' : ''}`}>
              {s}
            </span>
          ))}
          {(lead.skills_required?.length || 0) > 3 && (
            <span className="text-[10px]" style={{ color: '#AAB0BB' }}>+{lead.skills_required!.length - 3}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInterest}
            className={`btn-int min-h-[36px] ${isInterested ? 'on' : ''}`}
          >
            <i className={`ti ${isInterested ? 'ti-check' : 'ti-heart'}`} style={{ fontSize: '12px' }} />
            {' '}{isInterested ? 'Interested' : "I'm interested"}
          </button>
          <span className="text-[10.5px]" style={{ color: '#AAB0BB' }} title={formatDate(lead.posted_date)}>
            {timeAgoShort(lead.posted_date)}
          </span>
        </div>
      </div>
    </div>
  )
}
