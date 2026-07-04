import { NextResponse } from 'next/server'

// Verification route — throws so Sentry's server-side capture (onRequestError)
// records it. Delete once observability is confirmed.
class SentryExampleAPIError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SentryExampleAPIError'
  }
}

export function GET() {
  throw new SentryExampleAPIError('Flaiir Sentry test error (server API)')
  return NextResponse.json({ ok: true })
}
