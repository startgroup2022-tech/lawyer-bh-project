// Sentry — browser/admin-dashboard half. Loads in every client component.
//
// DSN is read from NEXT_PUBLIC_SENTRY_DSN at build time. Without it the
// init no-ops so dev environments without a Sentry project don't error.

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: process.env.NODE_ENV !== "production",
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    // Strip passwords + tokens before sending.
    beforeSend(event) {
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        if (h.Authorization) h.Authorization = "[redacted]";
        if (h.Cookie) h.Cookie = "[redacted]";
      }
      return event;
    },
  });
}
