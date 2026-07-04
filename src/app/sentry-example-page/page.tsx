'use client'

// Verification page — delete once Sentry + PostHog are confirmed working.
// Visit /sentry-example-page and click the button to send a test error + event.
import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'
import { useState } from 'react'

export default function SentryExamplePage() {
  const [sent, setSent] = useState(false)

  const trigger = async () => {
    // PostHog: fire a test event so you can confirm analytics ingestion.
    posthog.capture('sentry_test_clicked', { source: 'sentry-example-page' })
    // Sentry: server error via the test API, wrapped in a trace span…
    await Sentry.startSpan({ name: 'Example Frontend Span', op: 'test' }, async () => {
      await fetch('/api/sentry-example-api').catch(() => {})
    })
    setSent(true)
    // …then an unhandled client error.
    throw new Error('Flaiir Sentry test error (client)')
  }

  return (
    <main style={{ padding: 48, fontFamily: 'system-ui', maxWidth: 560 }}>
      <h1 style={{ fontWeight: 800 }}>Observability test</h1>
      <p style={{ color: '#555', lineHeight: 1.6 }}>
        Clicking below fires a PostHog event, a Sentry trace, a server error, and a client error.
        Then check your Sentry Issues and PostHog Activity.
      </p>
      <button
        onClick={trigger}
        style={{ marginTop: 16, padding: '12px 22px', borderRadius: 10, border: 'none',
          background: '#C4F000', color: '#15201A', fontWeight: 800, cursor: 'pointer' }}
      >
        Throw a test error
      </button>
      {sent && <p style={{ marginTop: 14, color: '#7E9E0A' }}>Sent — check Sentry &amp; PostHog.</p>}
    </main>
  )
}
