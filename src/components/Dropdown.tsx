'use client'

import { useState } from 'react'

type Opt = { value: string; label: string; icon?: string; hint?: string }

// Styled replacement for small native <select>s (role pickers, assignees).
// Button + popover menu; closes on outside click via a fixed backdrop.
export default function Dropdown({ value, options, onChange, ariaLabel, compact = false, up = false }: {
  value: string
  options: Opt[]
  onChange: (v: string) => void
  ariaLabel: string
  compact?: boolean
  up?: boolean
}) {
  const [open, setOpen] = useState(false)
  const sel = options.find(o => o.value === value) ?? options[0]

  return (
    <div className={`dd ${compact ? 'dd-compact' : ''}`} onClick={e => e.stopPropagation()}>
      <button type="button" className={`dd-btn ${open ? 'open' : ''}`} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => setOpen(v => !v)}>
        {sel?.icon && <i className={`ti ${sel.icon}`} />}
        <span className="dd-btn-label">{sel?.label ?? '—'}</span>
        <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'} dd-chev`} />
      </button>
      {open && (
        <>
          <div className="dd-backdrop" onClick={() => setOpen(false)} />
          <div className={`dd-menu ${up ? 'up' : ''}`} role="listbox">
            {options.map(o => (
              <button key={o.value} type="button" role="option" aria-selected={o.value === value}
                className={`dd-item ${o.value === value ? 'sel' : ''}`}
                onClick={() => { setOpen(false); if (o.value !== value) onChange(o.value) }}>
                {o.icon && <i className={`ti ${o.icon}`} />}
                <span className="dd-item-main">
                  {o.label}
                  {o.hint && <span className="dd-item-hint">{o.hint}</span>}
                </span>
                {o.value === value && <i className="ti ti-check dd-check" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
