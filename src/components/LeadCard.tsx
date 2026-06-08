'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo } from '@/lib/utils'
import { Bookmark, Eye, ExternalLink } from 'lucide-react'

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

export default function LeadCard({ lead, profile, application, isFreeUser, index = 0, onBookmark, onInterest, onUpgrade }: LeadCardProps) {
  const router = useRouter()
  const src = getSourceInfo(lead.source_url)
  const budget = formatBudgetGBP(lead.budget_min, lead.budget_max)
  const match = computeMatchExplanation(lead, profile)
  const isLocked = isFreeUser && index >= 3
  const isInterested = !!(application && application.status !== 'saved')
  const isSaved = application?.status === 'saved'

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

  if (isLocked) {
    return (
      <div
        onClick={onUpgrade}
        className="rounded-xl px-4 py-3 select-none"
        style={{ border: '0.5px solid #E5E7EB', background: '#F9FAFB', opacity: 0.4, cursor: 'not-allowed' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-[22px] h-[22px] rounded flex items-center justify-center text-[8px] font-medium shrink-0" style={{ background: src.bg, color: src.color }}>{src.label[0]}</div>
          <span className="text-xs font-semibold flex-1 truncate" style={{ color: '#AAB0BB' }}>Pro Lead</span>
          {budget && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F2F3F7', color: '#AAB0BB' }}>{budget}</span>}
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#F2F3F7', color: '#AAB0BB' }}>Pro only</span>
          <span className="text-[10px]" style={{ color: '#C0C6D2' }}>{timeAgo(lead.posted_date)}</span>
        </div>
      </div>
    )
  }

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
      {/* Row 1: source icon + title + bookmark + score badge */}
      <div className="flex items-center gap-2">
        <button
          onClick={e => { e.stopPropagation(); if (isFreeUser) { onUpgrade(); return } if (lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }}
          className="w-[22px] h-[22px] rounded flex items-center justify-center text-[8px] font-medium shrink-0 transition-opacity hover:opacity-80"
          style={{ background: src.bg, color: src.color }}
          title={`View on ${src.label}`}
        >
          {src.label[0]}
        </button>
        <h3
          className="text-xs font-bold flex-1 truncate"
          style={{ color: '#1A1D23', fontWeight: 700, fontSize: '13px' }}
        >
          {lead.title}
        </h3>
        <button
          onClick={handleBookmark}
          className="p-0.5 rounded transition-all duration-150 hover:scale-110"
          style={{ color: isSaved ? '#2563EB' : '#D0D4DE', transition: 'color 150ms ease, transform 150ms ease' }}
        >
          <Bookmark size={13} fill={isSaved ? '#2563EB' : 'none'} />
        </button>
        <span
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0"
          style={{
            background: match.score >= 8 ? '#EBF5F0' : match.score >= 6 ? '#FEF3E2' : '#F5F5F7',
            color: match.score >= 8 ? '#1B6B4A' : match.score >= 6 ? '#D97706' : '#AAB0BB',
          }}
        >
          {match.score}
        </span>
      </div>

      {/* Row 2: description (2 lines, ~30px left padding from source icon) */}
      <p
        className="text-[11px] leading-relaxed line-clamp-2 mt-1"
        style={{ paddingLeft: '26px', color: isLocked ? '#AAB0BB' : '#6B7280' }}
      >
        {isLocked ? '████████████████████████████████████████████████████████████' : lead.description}
      </p>

      {/* Row 3: pills + action buttons + time */}
      <div className="flex items-center gap-1.5 mt-1.5" style={{ paddingLeft: '26px' }}>
        {budget && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F5F5F7', color: '#6B7280' }}>{budget}</span>
        )}
        {lead.client_location && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#F5F5F7', color: '#6B7280' }}>{lead.client_location}</span>
        )}
        {lead.project_type && (
          <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: '#F5F5F7', color: '#6B7280' }}>{lead.project_type}</span>
        )}
        {lead.skills_required?.slice(0, 2).map(s => (
          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: '#EBF1FC', color: '#2563EB' }}>{s}</span>
        ))}
        {(lead.skills_required?.length || 0) > 2 && (
          <span className="text-[9px]" style={{ color: '#AAB0BB' }}>+{lead.skills_required!.length - 2}</span>
        )}

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            onClick={handleView}
            className="p-1 rounded hover:bg-gray-100 transition-colors duration-150"
            style={{ color: '#AAB0BB' }}
          >
            <Eye size={13} />
          </button>
          <button
            onClick={handleInterest}
            className="text-[10px] font-semibold px-2.5 py-1 rounded transition-all duration-150"
            style={{
              background: isInterested ? '#1B6B4A' : '#F5F5F7',
              color: isInterested ? '#FFFFFF' : '#6B7280',
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            {isInterested ? 'Interested ✓' : 'Interested'}
          </button>
          <span className="text-[10px]" style={{ color: '#B0B6C2' }}>{timeAgo(lead.posted_date)}</span>
        </div>
      </div>
    </div>
  )
}
