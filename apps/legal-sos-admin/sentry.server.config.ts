// Sentry — server-side (Node.js runtime). Captures errors from server
// components, route handlers, server actions, and tRPC mutations.

import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    debug: process.env.NODE_ENV !== "production",
    environment: process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
    beforeSend(event) {
      // Never ship Tap secret keys, Twilio tokens, DATABASE_URL, etc.
      // through breadcrumbs or stack frames.
      if (event.extra) {
        for (const k of Object.keys(event.extra)) {
          if (
            /password|secret|token|key|cookie|authorization/i.test(k) &&
            typeof event.extra[k] === "string"
          ) {
            event.extra[k] = "[redacted]";
          }
        }
      }
      return event;
    },
  });
}
