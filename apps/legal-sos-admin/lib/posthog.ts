// PostHog server-side client (admin/backend events).
//
// Use when an action lives on the server and there's no browser to
// fire the event itself — case auto-assignment, payment confirmation,
// payout transfer, etc. Browser-driven UI clicks should fire from the
// `posthog-js` client in components/admin/PostHogClient.tsx instead.

import { PostHog } from "posthog-node";

function env() {
  return {
    key: process.env.POSTHOG_KEY ?? process.env.NEXT_PUBLIC_POSTHOG_KEY,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
  };
}

let cached: PostHog | null = null;

export function isPostHogConfigured(): boolean {
  return Boolean(env().key);
}

export function getPostHog(): PostHog {
  if (cached) return cached;
  const { key, host } = env();
  if (!key) {
    throw new Error(
      "POSTHOG_KEY not set — analytics disabled. Set it in .env.local / Vercel env.",
    );
  }
  cached = new PostHog(key, {
    host,
    // Flush 20 events at once or every 10s — keeps request latency low.
    flushAt: 20,
    flushInterval: 10_000,
  });
  return cached;
}

/**
 * Capture a server-side event. Safe-fire — never throws and never
 * blocks the request handler.
 */
export async function capture(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!isPostHogConfigured()) return;
  try {
    getPostHog().capture({ distinctId, event, properties });
  } catch (err) {
    console.error("[posthog]", err);
  }
}

/** Call from a long-running process or graceful shutdown. */
export async function shutdownPostHog(): Promise<void> {
  if (!cached) return;
  try {
    await cached.shutdown();
  } catch {
    /* ignore */
  }
  cached = null;
}

/** Same taxonomy as mobile — server emits the lifecycle events the
 *  client can't observe (case auto-assignment, payment captured, etc.). */
export const ServerEvents = {
  // Auth + identity
  AdminSignin: "admin_signin",
  AdminSignout: "admin_signout",
  MobileSignin: "mobile_signin",
  OtpDelivered: "otp_delivered",
  OtpFailed: "otp_failed",
  // Case lifecycle (server-authoritative)
  CaseCreated: "case_created",
  CaseAssigned: "case_assigned",
  CaseAccepted: "case_accepted",
  CaseArrived: "case_arrived",
  CaseCompleted: "case_completed",
  CaseRefunded: "case_refunded",
  // Money
  PaymentAuthorized: "payment_authorized",
  PaymentCaptured: "payment_captured",
  PaymentFailed: "payment_failed",
  PayoutIssued: "payout_issued",
  // Realtime + push
  DispatchBroadcast: "dispatch_broadcast",
  PushSent: "push_sent",
} as const;
