'use client'

import Link from 'next/link'
import type { Lead } from '@/types'

interface LeadCardProps {
  lead: Lead
  isFreeUser?: boolean
  visibleCount?: number
  index?: number
}

export default function LeadCard({ lead, isFreeUser, visibleCount = 3, index = 0 }: LeadCardProps) {
  const isLocked = isFreeUser && index >= visibleCount

  return (
    <Link
      href={isLocked ? '/dashboard/billing' : `/dashboard/lead/${lead.id}`}
      className={`block rounded-xl border p-5 hover:shadow-md transition-shadow ${
        isLocked ? 'border-gray-200 bg-gray-50 relative overflow-hidden' : 'border-gray-200 bg-white'
      }`}
    >
      {isLocked && (
        <div className="absolute inset-0 backdrop-blur-xs z-10 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-sm font-medium text-gray-500">Upgrade to view</p>
          </div>
        </div>
      )}
      <div className={isLocked ? 'blur-sm' : ''}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold text-gray-900">{lead.title}</h3>
          {(lead.budget_min || lead.budget_max) && (
            <span className="shrink-0 text-sm font-medium text-green-600">
              £{lead.budget_min || 0}{lead.budget_max ? ` - £${lead.budget_max}` : '+'}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{lead.description}</p>
        {lead.skills_required && lead.skills_required.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {lead.skills_required.slice(0, 4).map((skill) => (
              <span key={skill} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-md">
                {skill}
              </span>
            ))}
            {lead.skills_required.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
                +{lead.skills_required.length - 4}
              </span>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
          {lead.project_type && <span>{lead.project_type}</span>}
          {lead.client_location && <span>{lead.client_location}</span>}
          <span>{new Date(lead.posted_date).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  )
}
