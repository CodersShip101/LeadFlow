import { NextRequest, NextResponse } from 'next/server'
import { currencyForCountry } from '@/lib/currency'

// Returns the visitor's country (from Vercel's edge geo header) and the
// currency we should display. Locally there's no header, so it falls back.
export async function GET(req: NextRequest) {
  const country =
    req.headers.get('x-vercel-ip-country') ||
    req.headers.get('cf-ipcountry') ||
    null

  return NextResponse.json({
    country,
    currency: currencyForCountry(country),
  })
}
