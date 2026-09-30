import type { WebSocket } from "ws";

import { postgresCommunicationEventBridge, replayCommunicationSignals } from "./postgres-event-bridge";
import { attachCommunicationSocket } from "./socket-handler";
import { communicationSocketHub } from "./socket-hub";
import { createSocketTicketCodec } from "./socket-ticket";

// The socket ticket secret falls back through the dispatch/lawyer secrets so a
// deployment that already set one of those does not need a new variable. A
// blank value counts as unset (env templates ship these as `<...or_blank>`).
export function communicationSocketSecret() {
  const secret = [process.env.COMMUNICATION_SOCKET_SECRET, process.env.MOBILE_DISPATCH_SECRET, process.env.LAWYER_AUTH_SECRET, process.env.NEXTAUTH_SECRET]
    .map(value => value?.trim())
    .find(value => Boolean(value));
  if (!secret || secret.length < 32) throw new Error("COMMUNICATION_SOCKET_SECRET must contain at least 32 characters");
  return secret;
}

// The Postgres LISTEN/NOTIFY bridge is process-global: the delivery callback
// installed here must resolve to the same hub that later connections register
// with, otherwise a signal published in one module instance is dropped by the
// other.
declare global {
  // eslint-disable-next-line no-var
  var __communicationBridgeStarted: Promise<void> | undefined;
}

export function ensureCommunicationBridgeStarted() {
  if (!globalThis.__communicationBridgeStarted) {
    globalThis.__communicationBridgeStarted = postgresCommunicationEventBridge
      .start((input) => communicationSocketHub.deliver(input))
      .then(() => undefined)
      .catch(error => { globalThis.__communicationBridgeStarted = undefined; throw error; });
  }
  return globalThis.__communicationBridgeStarted;
}

// Authorises a signaling frame against the durable call row. Terminal events
// are only accepted from the role that actually ended the call, and ringing
// calls older than the ring window are treated as dead so a stale tab cannot
// resurrect them.
export async function verifyCommunicationCall(callId: string, requestId: string, eventType?: string, actorRole?: string) {
  if (!/^[0-9a-f-]{36}$/i.test(callId)) return false;
  const terminal = eventType === 'call.rejected' ? 'rejected' : eventType === 'call.cancelled' ? 'cancelled' : eventType === 'call.ended' ? 'ended' : '';
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<{ allowed: boolean }[]>`
    SELECT true AS allowed
    FROM bahrain_communication_calls
    WHERE id = ${callId}::uuid AND request_id = ${requestId}::uuid
      AND (
        (${terminal} = '' AND status IN ('ringing','accepted','connected')
          AND (status <> 'ringing' OR ringing_at > now() - interval '45 seconds'))
        OR (${terminal} <> '' AND (status = ${terminal} OR status = 'failed') AND ended_by_role = ${actorRole ?? ''}
          AND ended_at > now() - interval '60 seconds')
      )
    LIMIT 1
  `;
  return rows[0]?.allowed === true;
}

// Wires a freshly upgraded socket into the shared hub and bridge. Shared by the
// Vercel route handler and the self-hosted upgrade adapter so both transports
// run identical authentication, replay and call-verification logic.
//
// The socket handler is attached synchronously: a client may send its auth
// frame the instant the socket opens, and frames that arrive before a 'message'
// listener exists are lost. Starting the bridge is kicked off in parallel — it
// only needs to be listening before the first signal is published, and anything
// missed in the meantime is recovered by `replay` on connect.
export function attachCommunicationRuntimeSocket(socket: WebSocket) {
  const bridgeStarted = ensureCommunicationBridgeStarted();
  const codec = createSocketTicketCodec({ secret: communicationSocketSecret(), now: () => new Date(), ttlSeconds: 60 });
  attachCommunicationSocket({
    socket,
    verifyTicket: codec.verify,
    verifyCall: verifyCommunicationCall,
    replay: replayCommunicationSignals,
    publish: (event) => postgresCommunicationEventBridge.publish(event),
    register: (connection) => communicationSocketHub.register(connection),
    authTimeoutMs: 5_000,
  });
  bridgeStarted.catch(error => {
    console.error("communication_bridge_start_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  });
}
