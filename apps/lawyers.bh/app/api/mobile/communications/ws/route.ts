import { experimental_upgradeWebSocket } from "@vercel/functions";
import type { WebSocket } from "ws";

import { postgresCommunicationEventBridge, replayCommunicationSignals } from "@/lib/communications/postgres-event-bridge";
import { attachCommunicationSocket } from "@/lib/communications/socket-handler";
import { communicationSocketHub } from "@/lib/communications/socket-hub";
import { createSocketTicketCodec } from "@/lib/communications/socket-ticket";

export const runtime = "nodejs";

declare global {
  var __communicationBridgeStarted: Promise<void> | undefined;
}

function socketSecret() {
  const secret = process.env.COMMUNICATION_SOCKET_SECRET ?? process.env.MOBILE_DISPATCH_SECRET ?? process.env.LAWYER_AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("COMMUNICATION_SOCKET_SECRET must contain at least 32 characters");
  return secret;
}

function ensureBridgeStarted() {
  if (!globalThis.__communicationBridgeStarted) {
    globalThis.__communicationBridgeStarted = postgresCommunicationEventBridge
      .start((input) => communicationSocketHub.deliver(input))
      .then(() => undefined).catch(error => { globalThis.__communicationBridgeStarted = undefined; throw error; });
  }
  return globalThis.__communicationBridgeStarted;
}

async function verifyCall(callId: string, requestId: string, eventType?: string, actorRole?: string) {
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

export async function GET() {
  await ensureBridgeStarted();
  const codec = createSocketTicketCodec({ secret: socketSecret(), now: () => new Date(), ttlSeconds: 60 });
  return experimental_upgradeWebSocket((ws: WebSocket) => {
    attachCommunicationSocket({
      socket: ws,
      verifyTicket: codec.verify,
      verifyCall,
      replay: replayCommunicationSignals,
      publish: (event) => postgresCommunicationEventBridge.publish(event),
      register: (connection) => communicationSocketHub.register(connection),
      authTimeoutMs: 5_000,
    });
  }, { maxPayload: 70_000 });
}
