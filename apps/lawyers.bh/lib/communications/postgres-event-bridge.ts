import type { CommunicationClientEvent } from "./events";

export type BridgedCommunicationEvent = { eventId?: string; requestId: string; senderRole: "client" | "lawyer"; event: CommunicationClientEvent };
type Dependencies = {
  insert(event: BridgedCommunicationEvent): Promise<string>;
  notify(id: string): Promise<void>;
  find(id: string): Promise<BridgedCommunicationEvent | null>;
  listen(handler: (id: string) => void): Promise<() => Promise<void>>;
};

export function createPostgresEventBridge(dependencies: Dependencies) {
  return {
    async publish(event: BridgedCommunicationEvent) {
      const id = await dependencies.insert(event);
      await dependencies.notify(id);
    },
    start(deliver: (event: BridgedCommunicationEvent) => void) {
      return dependencies.listen((id) => {
        void dependencies.find(id).then((event) => { if (event) deliver(event); });
      });
    },
  };
}

type SignalRow = { request_id: string; sender_role: "client" | "lawyer"; event: CommunicationClientEvent };

export const postgresCommunicationEventBridge = createPostgresEventBridge({
  async insert(input) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<{ id: string }[]>`
      WITH cleanup AS (
        DELETE FROM bahrain_communication_signal_events WHERE expires_at <= now()
      )
      INSERT INTO bahrain_communication_signal_events (request_id, sender_role, event)
      VALUES (${input.requestId}::uuid, ${input.senderRole}, ${JSON.stringify(input.event)}::text::jsonb)
      RETURNING id::text
    `;
    if (!rows[0]) throw new Error("signal_event_not_persisted");
    return rows[0].id;
  },
  async notify(id) { const { sqlClient } = await import("@/lib/db/client"); await sqlClient.notify("communication_signal_event", id); },
  async find(id) {
    const { sqlClient } = await import("@/lib/db/client");
    const rows = await sqlClient<SignalRow[]>`
      SELECT request_id::text, sender_role, event
      FROM bahrain_communication_signal_events
      WHERE id = ${id}::uuid AND expires_at > now()
      LIMIT 1
    `;
    const row = rows[0];
    return row ? { eventId: id, requestId: row.request_id, senderRole: row.sender_role, event: row.event } : null;
  },
  async listen(handler) {
    const { sqlClient } = await import("@/lib/db/client");
    const listener = await sqlClient.listen("communication_signal_event", handler);
    return async () => { await listener.unlisten(); };
  },
});

export async function replayCommunicationSignals(ticket: {requestId: string; actorRole: string}) {
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<{id: string; event: CommunicationClientEvent}[]>`
    SELECT e.id::text, e.event FROM bahrain_communication_signal_events e
    JOIN bahrain_communication_calls c ON c.id::text = e.event->>'callId' AND c.request_id = e.request_id
    WHERE e.request_id = ${ticket.requestId}::uuid AND e.sender_role <> ${ticket.actorRole}
      AND e.expires_at > now() AND c.status IN ('ringing','accepted','connected')
      AND (c.status <> 'ringing' OR c.ringing_at > now() - interval '45 seconds')
    ORDER BY e.created_at, e.id LIMIT 512
  `;
  return rows.map(row => JSON.stringify({...row.event, eventId: row.id}));
}
