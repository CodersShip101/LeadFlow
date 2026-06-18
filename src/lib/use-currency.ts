'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_CURRENCY, type CurrencyCode, CURRENCIES } from './currency'

const STORAGE_KEY = 'flaiir_currency'

/**
 * Resolves the display currency: a manual override (localStorage) wins,
 * otherwise we geo-detect via /api/geo once and cache it.
 */
export function useCurrency(): {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
} {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY)

  useEffect(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    if (saved && saved in CURRENCIES) {
      setCurrencyState(saved as CurrencyCode)
      return
    }
    let cancelled = false
    fetch('/api/geo')
      .then(r => r.json())
      .then(d => { if (!cancelled && d?.currency in CURRENCIES) setCurrencyState(d.currency) })
      .catch(() => { /* keep default */ })
    return () => { cancelled = true }
  }, [])

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c)
    try { localStorage.setItem(STORAGE_KEY, c) } catch { /* ignore */ }
  }

  return { currency, setCurrency }
}
