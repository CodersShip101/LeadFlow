// Client-side instrumentation — runs once in the browser. Initialises both
// Sentry (errors + session replay) and PostHog (product analytics).
// DSN/token come from NEXT_PUBLIC_* env vars; absent = harmless no-op.
import * as Sentry from '@sentry/nextjs'
import posthog from 'posthog-js'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
  debug: false,
})

if (process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    defaults: '2026-05-30',
  })
}

// Report client-side navigation transitions to Sentry tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
