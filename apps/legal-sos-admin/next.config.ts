import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const config: NextConfig = { reactStrictMode: true };

// Sentry wrapper — only active when SENTRY_DSN is set (see
// instrumentation.ts). When env var is empty the wrapper is a no-op.
export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG ?? "gulf-international-collection",
  project: process.env.SENTRY_PROJECT ?? "legal-sos-admin",
  // Silent in prod builds — Vercel logs already capture build output.
  silent: !process.env.CI,
  // Upload source maps so prod stacktraces are readable.
  widenClientFileUpload: true,
  // Suppress source-map upload errors in dev (no SENTRY_AUTH_TOKEN).
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  disableLogger: true,
  // Tunnel client-side events through this Next route so adblockers don't
  // drop them (some block sentry.io directly).
  tunnelRoute: "/monitoring",
});
