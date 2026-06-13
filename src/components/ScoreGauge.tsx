'use client'

import { useRef, useEffect, useState } from 'react'
import type { MatchExplanation } from '@/types'

interface ScoreGaugeProps {
  score: number
  match?: MatchExplanation
  /** size variant */
  size?: 'sm' | 'md'
}

function scoreColor(s: number) {
  if (s >= 8) return 'var(--hi)'
  if (s >= 5) return 'var(--mid)'
  return 'var(--lo)'
}

/**
 * Radial SVG score gauge — the signature visual element.
 * Compact ring showing 1–10 with colour coding.
 * Click to expand inline sub-score breakdown (no popover).
 */
export default function ScoreGauge({ score, size = 'md' }: ScoreGaugeProps) {
  const sizePx = size === 'sm' ? 34 : 42
  const r = (sizePx - 8) / 2
  const circ = 2 * Math.PI * r
  const off = circ * (1 - score / 10)
  const col = scoreColor(score)
  const fontSize = size === 'sm' ? 12 : 14

  return (
    <div className="gauge-ring" style={{ width: sizePx, height: sizePx }}>
      <svg width={sizePx} height={sizePx} viewBox={`0 0 ${sizePx} ${sizePx}`}>
        <circle cx={sizePx/2} cy={sizePx/2} r={r} fill="none" stroke="var(--line)" strokeWidth={size === 'sm' ? 3 : 4} />
        <circle cx={sizePx/2} cy={sizePx/2} r={r} fill="none" stroke={col} strokeWidth={size === 'sm' ? 3 : 4}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.34,1.4,.5,1)' }} />
      </svg>
      <span className="gauge-num" style={{ color: col, fontSize }}>{score}</span>
    </div>
  )
}
