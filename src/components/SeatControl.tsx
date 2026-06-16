'use client'

// Team seat picker — used on both the landing pricing ladder and the dashboard
// billing page. You can click −/+ or type a number directly; minimum 2 seats.

import { useState, useEffect } from 'react'

const MIN_SEATS = 2
const MAX_SEATS = 200

const clampSeats = (n: number) => Math.max(MIN_SEATS, Math.min(MAX_SEATS, n))

type Props = {
  seats: number
  setSeats: (n: number) => void
  price: number
}

export default function SeatControl({ seats, setSeats, price }: Props) {
  // Local text buffer so multi-digit entry (e.g. "15") isn't clamped mid-type;
  // we only clamp on blur / Enter.
  const [text, setText] = useState(String(seats))
  useEffect(() => { setText(String(seats)) }, [seats])

  const commit = (raw: string) => {
    const n = parseInt(raw, 10)
    const clamped = clampSeats(Number.isNaN(n) ? MIN_SEATS : n)
    setSeats(clamped)
    setText(String(clamped))
  }

  return (
    <div className="bill-seat">
      <div className="bill-seat-label">Team size</div>
      <div className="bill-seat-pick">
        <button type="button" onClick={() => setSeats(clampSeats(seats - 1))} aria-label="Fewer seats">&minus;</button>
        <input
          className="bill-seat-input"
          type="number"
          inputMode="numeric"
          min={MIN_SEATS}
          max={MAX_SEATS}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={e => commit(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          aria-label="Number of seats"
        />
        <button type="button" onClick={() => setSeats(clampSeats(seats + 1))} aria-label="More seats">+</button>
      </div>
      <div className="bill-seat-sum">Total: <b>&pound;{price * seats}/mo</b> for {seats} seats</div>
    </div>
  )
}
