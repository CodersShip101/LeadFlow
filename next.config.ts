import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
};

export default withSentryConfig(nextConfig, {
  org: "flaiir",
  project: "javascript-nextjs",
  // Quiet build logs unless in CI.
  silent: !process.env.CI,
  // Source-map upload only runs when a token is present (prod builds); dev/local skip it.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  widenClientFileUpload: true,
  // Route Sentry requests through a first-party rewrite to dodge ad-blockers.
  tunnelRoute: "/monitoring",
});
