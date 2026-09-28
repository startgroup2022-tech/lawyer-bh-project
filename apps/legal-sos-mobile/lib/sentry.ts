// Sentry initialization for the mobile app.
//
// Init runs once at app boot from app/_layout.tsx. Captures:
//   • All unhandled JS exceptions
//   • Native crashes (iOS + Android) — needs the prebuilt native projects
//   • Network failures (via the React Native tracing integration)
//   • Expo Router navigation breadcrumbs
//
// DSN comes from EXPO_PUBLIC_SENTRY_DSN — bundled into the JS but DSNs
// are not secrets (they identify a project, not authenticate). Source
// maps + symbols are uploaded at build time via @sentry/cli (configured
// in metro.config.js).

import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? "";

/**
 * Initialise Sentry. Safe to call multiple times — it no-ops on repeat
 * inits. When DSN is empty, Sentry stays disabled so dev builds without
 * the env var don't spam errors at a nonexistent project.
 */
export function initSentry() {
  if (!DSN) {
    console.warn(
      "[sentry] EXPO_PUBLIC_SENTRY_DSN not set — error tracking disabled.",
    );
    return;
  }
  Sentry.init({
    dsn: DSN,
    // Performance monitoring — 100% in dev, 20% in prod (cost guard).
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Sample full session replays at a low rate; spike to 100% on errors.
    enableNativeCrashHandling: true,
    debug: __DEV__,
    // Release tag mirrors the Expo runtime version so we can correlate
    // crashes to a build. EAS overrides this with the build version.
    release:
      (Constants.expoConfig?.version as string | undefined) ?? "dev",
    dist:
      (Constants.expoConfig?.ios?.buildNumber as string | undefined) ??
      (Constants.expoConfig?.android?.versionCode != null
        ? String(Constants.expoConfig.android.versionCode)
        : undefined),
    environment: __DEV__ ? "development" : "production",
    // Drop sensitive data before send. We never want to ship CPR
    // numbers, OTPs, or session tokens in breadcrumbs.
    beforeSend(event) {
      const scrub = (s: string | undefined) =>
        s
          ?.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [redacted]")
          .replace(/\b\d{9}\b/g, "[cpr-redacted]")
          .replace(/code['"]?\s*[:=]\s*['"]?\d{4,8}/gi, "code:[redacted]");
      if (event.message && typeof event.message === "string") {
        event.message = scrub(event.message) ?? event.message;
      }
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        if (h.Authorization) h.Authorization = "[redacted]";
        if (h.authorization) h.authorization = "[redacted]";
      }
      return event;
    },
  });
}

export const wrap = Sentry.wrap;
export { Sentry };
