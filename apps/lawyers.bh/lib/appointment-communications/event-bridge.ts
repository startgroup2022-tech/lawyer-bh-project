import "server-only";

import { createPostgresEventBridge, type BridgedCommunicationEvent } from "@/lib/communications/postgres-event-bridge";

/**
 * Durable signaling bus for appointment conversations. Same contract as the SOS
 * bridge, but rows live in `bahrain_appointment_signal_events` keyed by
 * conversation id, so the two contexts never share a channel.
 */
export const appointmentEventBridge = createPostgresEventBridge({
  async insert(input) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<{ id: string }[]>`
      WITH cleanup AS (
        DELETE FROM bahrain_appointment_signal_events WHERE expires_at <= now()
      )
      INSERT INTO bahrain_appointment_signal_events (conversation_id, sender_role, event)
      VALUES (${input.requestId}::uuid, ${input.senderRole}, ${JSON.stringify(input.event)}::text::jsonb)
      RETURNING id::text
    `;
    if (!rows[0]) throw new Error("signal_event_not_persisted");
    return rows[0].id;
  },
  async notify(id) {
    const { sqlClient } = await import("@/lib/db/client");
    await sqlClient.notify("appointment_signal_event", id);
  },
  async find(id) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<{
      conversation_id: string;
      sender_role: "client" | "lawyer";
      event: BridgedCommunicationEvent["event"];
    }[]>`
      SELECT conversation_id::text, sender_role, event
      FROM bahrain_appointment_signal_events
      WHERE id = ${id}::uuid AND expires_at > now()
      LIMIT 1
    `;
    const row = rows[0];
    return row
      ? { eventId: id, requestId: row.conversation_id, senderRole: row.sender_role, event: row.event }
      : null;
  },
  async listen(handler) {
    const { sqlClient } = await import("@/lib/db/client");
    const listener = await sqlClient.listen("appointment_signal_event", handler);
    return async () => {
      await listener.unlisten();
    };
  },
});

/**
 * Replays missed frames on (re)connect. Call frames are bounded to the live
 * call window; `message.created` frames are always replayed so a client that
 * reconnects still receives messages it missed while offline.
 */
export async function replayAppointmentSignals(ticket: {
  requestId: string;
  actorRole: string;
}): Promise<string[]> {
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<{ id: string; event: BridgedCommunicationEvent["event"] }[]>`
    SELECT e.id::text, e.event
    FROM bahrain_appointment_signal_events e
    WHERE e.conversation_id = ${ticket.requestId}::uuid
      AND e.sender_role <> ${ticket.actorRole}
      AND e.expires_at > now()
      AND (
        e.event->>'type' = 'message.created'
        OR EXISTS (
          SELECT 1 FROM bahrain_appointment_calls c
          WHERE c.id::text = e.event->>'callId'
            AND c.conversation_id = e.conversation_id
            AND c.status IN ('ringing', 'accepted', 'connected')
            AND (c.status <> 'ringing' OR c.ringing_at > now() - interval '45 seconds')
        )
      )
    ORDER BY e.created_at, e.id
    LIMIT 512
  `;
  return rows.map((row) => JSON.stringify({ ...row.event, eventId: row.id }));
}
