export interface NormalizedPay {
  min: number | null
  max: number | null
}

export function normalizePay(raw: string): NormalizedPay | null {
  const text = raw.toLowerCase()
  const num = (s: string) => { const n = parseFloat(s.replace(/[£$€,]/g, '')); return Number.isFinite(n) ? n : null }

  // £50/hr or $50/hour
  const hourly = text.match(/[£$€]\s*([\d,]+(?:\.\d+)?)\s*\/\s*hr?/i)
  if (hourly) {
    const rate = num(hourly[1])
    return rate ? { min: Math.round(rate * 8), max: null } : null
  }

  // £300–500/day or £300-500 per day
  const dayRange = text.match(/[£$€]\s*([\d,]+)\s*(?:–|-|to)\s*[£$€]?\s*([\d,]+)\s*\/\s*day/i)
  if (dayRange) return { min: num(dayRange[1]), max: num(dayRange[2]) }
  const daySingle = text.match(/[£$€]\s*([\d,]+(?:\.\d+)?)\s*\/\s*day/i)
  if (daySingle) return { min: num(daySingle[1]), max: null }

  // £3,000–5,000/mo
  const moRange = text.match(/[£$€]\s*([\d,]+)\s*(?:–|-|to)\s*[£$€]?\s*([\d,]+)\s*\/\s*(?:mo|month)/i)
  if (moRange) return { min: num(moRange[1]) ? Math.round(num(moRange[1])! / 21.6) : null, max: num(moRange[2]) ? Math.round(num(moRange[2])! / 21.6) : null }
  const moSingle = text.match(/[£$€]\s*([\d,]+(?:\.\d+)?)\s*\/\s*(?:mo|month)/i)
  if (moSingle) { const v = num(moSingle[1]); return v ? { min: Math.round(v / 21.6), max: null } : null }

  // £60,000/yr or £50k pa
  const yr = text.match(/[£$€]\s*([\d,]+(?:k|K)?)\s*\/\s*(?:yr|year|pa|annum|annual)/i)
  if (yr) { const v = num(yr[1]); return v ? { min: Math.round(v / 220), max: null } : null }
  const yrRange = text.match(/[£$€]\s*([\d,]+(?:k|K)?)\s*(?:–|-|to)\s*[£$€]?\s*([\d,]+(?:k|K)?)\s*\/\s*(?:yr|year|pa|annum)/i)
  if (yrRange) return { min: num(yrRange[1]) ? Math.round(num(yrRange[1])! / 220) : null, max: num(yrRange[2]) ? Math.round(num(yrRange[2])! / 220) : null }

  return null
}
