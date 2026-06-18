/**
 * Multi-currency pricing.
 *
 * The amounts here are the SINGLE SOURCE OF TRUTH for what the site displays.
 * They MUST match the per-currency amounts you configure on each Stripe Price
 * (Stripe Dashboard → Price → add currency / currency_options), so the number
 * the visitor sees on the site equals what they're charged at checkout.
 *
 * We deliberately use rounded, "psychological" local price points rather than
 * live FX conversion.
 */
import type { Tier } from './tiers'

export type CurrencyCode = 'GBP' | 'USD' | 'EUR'

export const CURRENCIES: Record<CurrencyCode, { symbol: string; locale: string }> = {
  GBP: { symbol: '£', locale: 'en-GB' },
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'en-IE' },
}

export const DEFAULT_CURRENCY: CurrencyCode = 'GBP'

// Per-tier amounts in each currency. { monthly, annual } where `annual` is the
// per-month price when billed yearly. null = not purchasable (free/enterprise).
type Amounts = { monthly: number | null; annual: number | null }

export const PRICE_TABLE: Record<Tier, Record<CurrencyCode, Amounts>> = {
  free: {
    GBP: { monthly: 0, annual: 0 }, USD: { monthly: 0, annual: 0 }, EUR: { monthly: 0, annual: 0 },
  },
  pro: { // "Starter"
    GBP: { monthly: 15, annual: 12 }, USD: { monthly: 19, annual: 15 }, EUR: { monthly: 18, annual: 14 },
  },
  max: { // "Pro"
    GBP: { monthly: 49, annual: 39 }, USD: { monthly: 59, annual: 47 }, EUR: { monthly: 57, annual: 45 },
  },
  team: { // per seat
    GBP: { monthly: 39, annual: 32 }, USD: { monthly: 49, annual: 39 }, EUR: { monthly: 46, annual: 37 },
  },
  enterprise: {
    GBP: { monthly: null, annual: null }, USD: { monthly: null, annual: null }, EUR: { monthly: null, annual: null },
  },
}

// Eurozone ISO country codes → EUR.
const EUROZONE = new Set([
  'AT', 'BE', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'HR',
])
// UK + crown dependencies → GBP.
const GBP_COUNTRIES = new Set(['GB', 'UK', 'GG', 'JE', 'IM'])

/** Map an ISO country code (e.g. from x-vercel-ip-country) to a currency. */
export function currencyForCountry(country?: string | null): CurrencyCode {
  const c = (country || '').toUpperCase()
  if (GBP_COUNTRIES.has(c)) return 'GBP'
  if (EUROZONE.has(c)) return 'EUR'
  if (!c) return DEFAULT_CURRENCY
  return 'USD' // sensible global default for everywhere else
}

/** Amount for a tier/cycle in a currency (per-month figure). */
export function amountFor(tier: Tier, cycle: 'monthly' | 'annual', currency: CurrencyCode): number | null {
  return PRICE_TABLE[tier]?.[currency]?.[cycle] ?? null
}

/** Format a whole-number amount as a currency string, e.g. £15, $19, €18. */
export function formatPrice(amount: number, currency: CurrencyCode): string {
  const { locale } = CURRENCIES[currency]
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
