// Server-side Pusher publisher.
//
// One module owns every event we broadcast so the channel + event name
// taxonomy stays in one place. Adding a new event = a new function here
// + a matching constant in the shared `events` map below.
//
// Channel naming convention:
//   case-<UUID>      → per-case status updates (client subscribes from
//                      the moment they create a case)
//   lawyer-<UUID>    → lawyer's inbox (incoming dispatches + accepted
//                      case lifecycle events)
//   system           → admin-only system-wide event firehose (used by
//                      the dashboard live feed)
//
// Production hardening (deferred):
//   • Switch case-* and lawyer-* to PRIVATE channels (`private-case-*`)
//     so subscribers must auth via /api/pusher/auth — prevents random
//     readers from sniffing case status by guessing a UUID.
//   • Add presence channels for "lawyer-online" so the admin can see
//     who's currently subscribed.

import Pusher from "pusher";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER ?? "ap2";

let cached: Pusher | null = null;

function getClient(): Pusher {
  if (cached) return cached;
  if (!appId || !key || !secret) {
    throw new Error(
      "Pusher creds incomplete. Set PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET.",
    );
  }
  cached = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  return cached;
}

export function isPusherConfigured(): boolean {
  return Boolean(appId && key && secret);
}

// ── Channel name builders ───────────────────────────────────────────

export const channels = {
  case: (caseId: string) => `case-${caseId}`,
  lawyer: (lawyerId: string) => `lawyer-${lawyerId}`,
  system: () => "system",
} as const;

// ── Event taxonomy (typed payloads) ─────────────────────────────────
//
// Keep these in sync with mobile/lib/pusher.ts. We don't share via a
// package yet — small enough to duplicate, low churn.

export interface CaseStatusChangedEvent {
  caseId: string;
  caseRef: string;
  status:
    | "pending"
    | "mobilizing"
    | "arrived"
    | "completed"
    | "cancelled"
    | "disputed";
  at: string; // ISO timestamp
  assignedLawyerId?: string;
}

export interface CaseLocationUpdatedEvent {
  caseId: string;
  lat: number;
  lng: number;
  headingDeg?: number;
  etaMinutes?: number;
  at: string;
}

export interface LawyerNewDispatchEvent {
  caseId: string;
  caseRef: string;
  caseType: string;
  fulfillment: "remote" | "field";
  clientName: string;
  locationAddress?: string;
  baseFeeBhd: string;
  at: string;
}

export interface SystemCaseEvent {
  kind: "case.created" | "case.assigned" | "case.completed" | "case.cancelled";
  caseId: string;
  caseRef: string;
  at: string;
}

// ── Publishers (one per event type) ─────────────────────────────────

export async function publishCaseStatus(
  caseId: string,
  payload: CaseStatusChangedEvent,
): Promise<void> {
  if (!isPusherConfigured()) return; // no-op in dev without creds
  await getClient().trigger(channels.case(caseId), "status-changed", payload);
}

export async function publishCaseLocation(
  caseId: string,
  payload: CaseLocationUpdatedEvent,
): Promise<void> {
  if (!isPusherConfigured()) return;
  await getClient().trigger(channels.case(caseId), "location-updated", payload);
}

export async function publishLawyerDispatch(
  lawyerId: string,
  payload: LawyerNewDispatchEvent,
): Promise<void> {
  if (!isPusherConfigured()) return;
  await getClient().trigger(channels.lawyer(lawyerId), "new-dispatch", payload);
}

export async function publishSystemEvent(
  payload: SystemCaseEvent,
): Promise<void> {
  if (!isPusherConfigured()) return;
  await getClient().trigger(channels.system(), payload.kind, payload);
}

/**
 * Batched broadcast — when a new SOS comes in we fan-out to N lawyer
 * inboxes plus the system channel in one Pusher API call (faster +
 * cheaper than N round-trips). Pusher accepts up to 10 events per call.
 */
export async function publishBatch(
  events: Array<{ channel: string; name: string; data: unknown }>,
): Promise<void> {
  if (!isPusherConfigured() || events.length === 0) return;
  // Pusher's batch API caps at 10 per call.
  const chunks: typeof events[] = [];
  for (let i = 0; i < events.length; i += 10) {
    chunks.push(events.slice(i, i + 10));
  }
  for (const chunk of chunks) {
    await getClient().triggerBatch(
      chunk.map((e) => ({ channel: e.channel, name: e.name, data: e.data })),
    );
  }
}
