'use client'

import { useState, useRef, useEffect } from 'react'
import type { MatchExplanation } from '@/types'

interface ScoreBadgeProps {
  match: MatchExplanation
  /** size variant */
  size?: 'sm' | 'md'
}

/**
 * Score chip that opens a "Why this score?" breakdown popover on click.
 * Shows the weighted sub-scores (Skill / Rate / Recency / Detail).
 */
export default function ScoreBadge({ match, size = 'md' }: ScoreBadgeProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tone = match.score >= 8 ? 'hi' : match.score >= 6 ? 'mid' : 'lo'

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`score-chip ${tone}`}
        style={size === 'sm' ? { fontSize: '.68rem', padding: '2px 7px' } : undefined}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        title="Why this score?"
        aria-expanded={open}
      >
        <i className="ti ti-sparkles" aria-hidden="true" />
        {match.score}/10
      </button>

      {open && (
        <div className="score-pop" onClick={e => e.stopPropagation()} role="dialog" aria-label="Score breakdown">
          <div className="score-pop-head">
            <span className="t">Why this score?</span>
            <span className="v">{match.score}/10</span>
          </div>
          <p className="score-pop-why">{match.why}</p>
          {match.subScores.map(s => {
            const pct = s.value * 10
            const barTone = s.value >= 7 ? '' : s.value >= 4 ? 'warn' : 'weak'
            return (
              <div className="score-row" key={s.label}>
                <i className={`ti ti-${s.icon}`} aria-hidden="true" />
                <div className="score-row-main">
                  <div className="score-row-lbl">
                    <span>{s.label}</span>
                    <span className="n">{s.value}/10</span>
                  </div>
                  <div className="score-bar"><span className={barTone} style={{ width: `${pct}%` }} /></div>
                  <div className="score-row-detail">{s.detail}</div>
                </div>
                <span className="score-pop-weight">{Math.round(s.weight * 100)}%</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
