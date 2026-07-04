// Sentry — edge runtime init (middleware / edge routes). Loaded by src/instrumentation.ts.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
  debug: false,
})
