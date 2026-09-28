import type { CommunicationClientEvent } from "./events";

type Connection = { requestId: string; actorRole: "client" | "lawyer"; actorId: string; send(payload: string): void };

export function createSocketHub() {
  const rooms = new Map<string, Set<Connection>>();
  return {
    register(connection: Connection) {
      const room = rooms.get(connection.requestId) ?? new Set<Connection>();
      room.add(connection); rooms.set(connection.requestId, room);
      return () => { room.delete(connection); if (room.size === 0) rooms.delete(connection.requestId); };
    },
    deliver(input: { eventId?: string; requestId: string; senderRole: "client" | "lawyer"; event: CommunicationClientEvent }) {
      const payload = JSON.stringify({...input.event, ...(input.eventId ? {eventId: input.eventId} : {})});
      for (const connection of rooms.get(input.requestId) ?? []) {
        if (connection.actorRole !== input.senderRole) connection.send(payload);
      }
    },
  };
}

declare global { var __communicationSocketHub: ReturnType<typeof createSocketHub> | undefined; }
export const communicationSocketHub = globalThis.__communicationSocketHub ?? createSocketHub();
// The bridge callback is process-global too: both must retain the same hub.
globalThis.__communicationSocketHub = communicationSocketHub;
