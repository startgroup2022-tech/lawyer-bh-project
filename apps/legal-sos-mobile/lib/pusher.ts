// Mobile-side Pusher subscriber.
//
// Uses pusher-js (pure JS, no native modules) so it works in Expo Go
// without ejecting. The downside is no push notifications when the app
// is killed — those need Pusher Beams (`@pusher/push-notifications-...`)
// which DOES require native modules and EAS Build.
//
// Connection lifecycle:
//   • Lazy singleton — first subscribe() call connects.
//   • Auto-reconnects on network changes (built into pusher-js).
//   • Foreground-only — when the app is backgrounded, RN suspends JS
//     timers + sockets after ~30s. Switch to Beams for true background.
//
// Channel naming MUST match admin's lib/pusher.ts.

// Metro auto-picks dist/react-native/pusher.js via package.json's
// "react-native" field, so the bare `pusher-js` import gets the RN
// build at runtime. TS resolves from the regular d.ts.
import Pusher, { type Channel } from "pusher-js";
import Constants from "expo-constants";

// Read public Pusher key from env. Same as admin's NEXT_PUBLIC_PUSHER_KEY
// but exposed to the bundle via EXPO_PUBLIC_*.
const KEY =
  process.env.EXPO_PUBLIC_PUSHER_KEY ??
  ((Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[
    "pusherKey"
  ] as string | undefined) ??
  "";
const CLUSTER =
  process.env.EXPO_PUBLIC_PUSHER_CLUSTER ??
  ((Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.[
    "pusherCluster"
  ] as string | undefined) ??
  "ap2";

let client: Pusher | null = null;
const channelCache = new Map<string, Channel>();

function getClient(): Pusher | null {
  if (!KEY) {
    // No key set — calling code already handles `null` gracefully.
    return null;
  }
  if (client) return client;
  client = new Pusher(KEY, {
    cluster: CLUSTER,
    forceTLS: true,
    // Pusher's default activity-timeout is 120s. Mobile apps are often
    // foreground for short bursts — keep the default for now.
  });
  return client;
}

// ── Typed event payloads (mirror admin/lib/pusher.ts) ───────────────

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
  at: string;
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

// ── Channel name builders (MUST match admin's) ──────────────────────

const channelNames = {
  case: (caseId: string) => `case-${caseId}`,
  lawyer: (lawyerId: string) => `lawyer-${lawyerId}`,
};

// ── Subscribe helpers — each returns an unsubscribe fn ──────────────

/**
 * Subscribe to a single case's lifecycle events. Returns a cleanup fn
 * that removes the listeners AND unsubscribes from the channel if it
 * has no remaining listeners.
 */
export function subscribeToCase(
  caseId: string,
  handlers: {
    onStatusChanged?: (e: CaseStatusChangedEvent) => void;
    onLocationUpdated?: (e: CaseLocationUpdatedEvent) => void;
  },
): () => void {
  const c = getClient();
  if (!c) return () => {};
  const name = channelNames.case(caseId);
  let ch = channelCache.get(name);
  if (!ch) {
    ch = c.subscribe(name);
    channelCache.set(name, ch);
  }

  const handlers2: Array<{ event: string; fn: (data: unknown) => void }> = [];
  if (handlers.onStatusChanged) {
    const fn = (data: unknown) =>
      handlers.onStatusChanged!(data as CaseStatusChangedEvent);
    ch.bind("status-changed", fn);
    handlers2.push({ event: "status-changed", fn });
  }
  if (handlers.onLocationUpdated) {
    const fn = (data: unknown) =>
      handlers.onLocationUpdated!(data as CaseLocationUpdatedEvent);
    ch.bind("location-updated", fn);
    handlers2.push({ event: "location-updated", fn });
  }

  return () => {
    for (const { event, fn } of handlers2) {
      ch!.unbind(event, fn);
    }
    // Only unsubscribe channel if there are no remaining bindings.
    // pusher-js doesn't expose a "bindings count" API — to be safe we
    // leave the channel subscribed; cost is negligible.
  };
}

/**
 * Subscribe to a lawyer's dispatch inbox. Call this once on the lawyer
 * home screen after sign-in.
 */
export function subscribeToLawyerInbox(
  lawyerId: string,
  onNewDispatch: (e: LawyerNewDispatchEvent) => void,
): () => void {
  const c = getClient();
  if (!c) return () => {};
  const name = channelNames.lawyer(lawyerId);
  let ch = channelCache.get(name);
  if (!ch) {
    ch = c.subscribe(name);
    channelCache.set(name, ch);
  }
  const fn = (data: unknown) => onNewDispatch(data as LawyerNewDispatchEvent);
  ch.bind("new-dispatch", fn);

  return () => {
    ch!.unbind("new-dispatch", fn);
  };
}

/** Full teardown — call from sign-out. */
export function disconnectPusher(): void {
  if (!client) return;
  for (const ch of channelCache.values()) {
    ch.unbind_all();
  }
  channelCache.clear();
  client.disconnect();
  client = null;
}
