// PostHog browser client for the admin dashboard.
//
// Loads in the authed layout, identifies the operator with their
// admin user ID so we can see per-operator usage in PostHog.
// Pageviews + clicks are auto-captured by posthog-js's defaults.

"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as Provider } from "posthog-js/react";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

let initialized = false;
function init() {
  if (initialized || !KEY || typeof window === "undefined") return;
  posthog.init(KEY, {
    api_host: HOST,
    // Session replay — disabled by default since the admin dashboard
    // surfaces case details (CPR, phone numbers). Enable per-page if
    // you want it on non-PII screens.
    disable_session_recording: true,
    capture_pageview: true,
    capture_pageleave: true,
    persistence: "localStorage",
    // Don't send events from development bundles to keep prod dashboards clean.
    loaded: (ph) => {
      if (process.env.NODE_ENV !== "production") ph.opt_out_capturing();
    },
  });
  initialized = true;
}

export function PostHogClientProvider({
  children,
  adminUserId,
  email,
}: {
  children: React.ReactNode;
  adminUserId?: string;
  email?: string;
}) {
  useEffect(() => {
    init();
    if (adminUserId) {
      posthog.identify(adminUserId, { email });
    }
    return () => {
      // Don't reset on unmount — survives client-side route changes.
    };
  }, [adminUserId, email]);

  // Skip the provider entirely when key isn't set so dev without
  // NEXT_PUBLIC_POSTHOG_KEY doesn't error.
  if (!KEY) return <>{children}</>;

  return <Provider client={posthog}>{children}</Provider>;
}
