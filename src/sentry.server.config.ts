// Sentry — server (Node.js runtime) init. Loaded by src/instrumentation.ts.
// DSN comes from NEXT_PUBLIC_SENTRY_DSN in .env.local; if absent, Sentry is a
// harmless no-op (no reporting, no crash).
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Performance tracing: 100% now; lower (e.g. 0.1) once traffic grows.
  tracesSampleRate: 1.0,
  // GDPR: do not attach user PII (IP, cookies, request bodies) automatically.
  sendDefaultPii: false,
  environment: process.env.NODE_ENV,
  debug: false,
})
