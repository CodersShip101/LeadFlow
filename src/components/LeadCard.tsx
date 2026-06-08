'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Lead, Profile, Application } from '@/types'
import { computeMatchExplanation } from '@/types'
import { getSourceInfo, formatBudgetGBP, timeAgo, isNewLead } from '@/lib/utils'

interface LeadCardProps {
  lead: Lead
  profile: Profile | null
  application: Application | null
  isFreeUser: boolean
  index: number
  onBookmark: (id: string) => void
  onInterest: (id: string) => void
  onUpgrade: () => void
}

export default function LeadCard({ lead, profile, application, onBookmark, onInterest }: LeadCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const match = computeMatchExplanation(lead, profile)
  const source = getSourceInfo(lead.source_url)
  const isSaved = application?.status === 'saved'
  const isInterested = !!application && application.status !== 'saved'

  return (
    <div className="card card-hover overflow-hidden"
      onClick={() => router.push(`/dashboard/lead/${lead.id}`)} style={{ cursor: 'pointer' }}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Source badge + title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); if (lead.source_url) window.open(lead.source_url, '_blank', 'noopener,noreferrer') }}
                className="tag shrink-0 transition-opacity hover:opacity-80"
                style={{ background: source.bg, color: source.color }} title={`View on ${source.label}`}>
                {source.label}
              </button>
              {isNewLead(lead.posted_date) && (
                <span className="tag" style={{ background: '#ECFDF5', color: '#059669' }}>New</span>
              )}
            </div>
            <h3 className="text-sm font-semibold mt-1.5 truncate" style={{ color: '#111827' }}>{lead.title}</h3>
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: '#6B7280' }}>{lead.description}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {formatBudgetGBP(lead.budget_min, lead.budget_max) && (
                <span className="tag" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                  {formatBudgetGBP(lead.budget_min, lead.budget_max)}
                </span>
              )}
              {lead.skills_required?.slice(0, 3).map(s => (
                <span key={s} className="tag" style={{ background: '#EFF6FF', color: '#2563EB' }}>{s}</span>
              ))}
              <span className="text-[10px]" style={{ color: '#9CA3AF' }} title={lead.posted_date}>{timeAgo(lead.posted_date)}</span>
            </div>
          </div>

          {/* Match score + actions */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
              match.score >= 8 ? 'bg-[#ECFDF5] text-[#059669]' :
              match.score >= 6 ? 'bg-[#FFFBEB] text-[#D97706]' :
              'bg-[#F3F4F6] text-[#9CA3AF]'
            }`}>
              {match.score}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); onBookmark(lead.id) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-[0.93]"
                title={isSaved ? 'Unsave' : 'Save'} aria-label={isSaved ? 'Unsave lead' : 'Save lead'}>
                <i className={`ti ${isSaved ? 'ti-bookmark-filled' : 'ti-bookmark'}`} style={{ fontSize: '15px', color: isSaved ? '#1B6B4A' : '#9CA3AF' }} />
              </button>
              <button onClick={e => { e.stopPropagation(); onInterest(lead.id) }}
                className={`px-3 h-8 rounded-lg text-xs font-semibold transition-all active:scale-[0.93] ${
                  isInterested
                    ? 'bg-[#ECFDF5] text-[#059669]'
                    : 'bg-[#1B6B4A] text-white hover:bg-[#155D3E]'
                }`}>
                {isInterested ? 'Interested' : 'I\'m interested'}
              </button>
              <div className="relative" ref={menuRef}>
                <button onClick={e => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-[0.93]"
                  title="More" aria-label="More actions" aria-expanded={menuOpen}>
                  <i className="ti ti-dots" style={{ fontSize: '15px', color: '#9CA3AF' }} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border py-1 z-50 min-w-[160px] animate-fade-in" style={{ borderColor: '#E5E7EB' }}>
                    <button onClick={() => { setMenuOpen(false); router.push(`/dashboard/lead/${lead.id}`) }}
                      className="flex items-center gap-2 px-3 py-2 text-xs w-full text-left hover:bg-gray-50 transition-colors" style={{ color: '#6B7280' }}>
                      <i className="ti ti-eye" style={{ fontSize: '13px' }} /> View details
                    </button>
                    {(() => { const url = lead.source_url; return url ? (
                      <button onClick={() => { setMenuOpen(false); window.open(url, '_blank', 'noopener,noreferrer') }}
                        className="flex items-center gap-2 px-3 py-2 text-xs w-full text-left hover:bg-gray-50 transition-colors" style={{ color: '#6B7280' }}>
                        <i className="ti ti-external-link" style={{ fontSize: '13px' }} /> Open source
                      </button>
                    ) : null })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
