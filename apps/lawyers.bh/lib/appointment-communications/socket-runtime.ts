import type { WebSocket } from "ws";

import { attachCommunicationSocket } from "@/lib/communications/socket-handler";
import { communicationSocketHub } from "@/lib/communications/socket-hub";
import { createSocketTicketCodec } from "@/lib/communications/socket-ticket";
import { communicationSocketSecret } from "@/lib/communications/socket-runtime";

import { appointmentEventBridge, replayAppointmentSignals } from "./event-bridge";

declare global {
  // eslint-disable-next-line no-var
  var __appointmentBridgeStarted: Promise<void> | undefined;
}

/**
 * Starts the appointment bridge once per process. The delivery callback must
 * resolve to the same hub the sockets register with, so both are process-global
 * (mirrors the SOS runtime).
 */
export function ensureAppointmentBridgeStarted() {
  if (!globalThis.__appointmentBridgeStarted) {
    globalThis.__appointmentBridgeStarted = appointmentEventBridge
      .start((input) => communicationSocketHub.deliver(input))
      .then(() => undefined)
      .catch((error) => {
        globalThis.__appointmentBridgeStarted = undefined;
        throw error;
      });
  }
  return globalThis.__appointmentBridgeStarted;
}

/**
 * Authorises a signaling frame against the durable appointment call row. The
 * ticket already proves the caller is a participant of this conversation; this
 * additionally proves the frame's callId belongs to that conversation and is in
 * a state that permits the frame.
 */
export async function verifyAppointmentCall(
  callId: string,
  conversationId: string,
  eventType?: string,
  actorRole?: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(callId)) return false;
  const terminal =
    eventType === "call.rejected" ? "rejected" : eventType === "call.cancelled" ? "cancelled" : eventType === "call.ended" ? "ended" : "";
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<{ allowed: boolean }[]>`
    SELECT true AS allowed
    FROM bahrain_appointment_calls
    WHERE id = ${callId}::uuid AND conversation_id = ${conversationId}::uuid
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

/**
 * Wires a socket into the shared hub for an *appointment* conversation. The
 * ticket's `requestId` is the conversation id, so authorization is per
 * conversation and cross-conversation delivery is impossible.
 */
export function attachAppointmentSocket(socket: WebSocket) {
  const bridgeStarted = ensureAppointmentBridgeStarted();
  const codec = createSocketTicketCodec({ secret: communicationSocketSecret(), now: () => new Date(), ttlSeconds: 60 });
  attachCommunicationSocket({
    socket,
    verifyTicket: codec.verify,
    verifyCall: verifyAppointmentCall,
    replay: replayAppointmentSignals,
    publish: (event) => appointmentEventBridge.publish(event),
    register: (connection) => communicationSocketHub.register(connection),
    authTimeoutMs: 5_000,
  });
  bridgeStarted.catch((error) => {
    console.error("appointment_bridge_start_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
  });
}

/** Alias used by the self-hosted server's upgrade adapter. */
export const attachAppointmentRuntimeSocket = attachAppointmentSocket;
