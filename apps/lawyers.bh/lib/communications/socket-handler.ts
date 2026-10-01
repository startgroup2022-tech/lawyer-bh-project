import { decodeClientEvent } from "./events";
import type { ClientCommunicationEvent } from "./events";
import type { BridgedCommunicationEvent } from "./postgres-event-bridge";

export type CommunicationSocket = {
  send(payload: string): void;
  close(code?: number, reason?: string): void;
  on(
    name: "message" | "close" | "error",
    handler: (...args: unknown[]) => void,
  ): void;
};

type Ticket = {
  requestId: string;
  actorRole: "client" | "lawyer";
  actorId: string;
};

export function attachCommunicationSocket(input: {
  socket: CommunicationSocket;

  verifyTicket(ticket: string): Ticket | null;

  verifyCall(
    callId: string,
    requestId: string,
    eventType?: string,
    actorRole?: "client" | "lawyer",
  ): Promise<boolean>;
  replay?(ticket: Ticket): Promise<string[]>;

  publish(
    event: BridgedCommunicationEvent,
  ): Promise<void> | void;

  register(connection: {
    requestId: string;
    actorRole: "client" | "lawyer";
    actorId: string;
    send(payload: string): void;
  }): () => void;

  authTimeoutMs: number;
}) {
  let ticket: Ticket | null = null;

  let unregister: (() => void) | null = null;

  let chain = Promise.resolve();
  let stage = 'authentication';
  let bootstrapping = true;
  let closed = false;
  const pending: string[] = [];
  const seen = new Set<string>();
  let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
  let recoveryUntil = 0;
  // NOTIFY is only a fast path. Recover durable signaling during setup,
  // without polling an idle chat or running overlapping database reads.
  const scheduleRecovery = () => {
    if (!input.replay || closed || recoveryTimer || Date.now() >= recoveryUntil) return;
    recoveryTimer = setTimeout(async () => {
      try {
        if (!closed && ticket && Date.now() < recoveryUntil) {
          for (const payload of await input.replay!(ticket)) deliver(payload);
        }
      } catch {
        console.warn('communication_signal_recovery_failed');
      } finally {
        recoveryTimer = undefined;
        scheduleRecovery();
      }
    }, 2000);
    recoveryTimer.unref?.();
  };
  const enableRecovery = () => {
    recoveryUntil = Date.now() + 60_000;
    scheduleRecovery();
  };
  const deliver = (payload: string) => {
    if (closed) return;
    const id = (JSON.parse(payload) as {eventId?: string}).eventId;
    if (id && seen.has(id)) return;
    if (id) { seen.add(id); if (seen.size > 1024) seen.delete(seen.values().next().value!); }
    input.socket.send(payload);
  };

  const timeout = setTimeout(() => {
    if (!ticket) {
      input.socket.close(
        1008,
        "authentication_timeout",
      );
    }
  }, input.authTimeoutMs);

  const cleanup = () => {
    closed = true;
    clearTimeout(timeout);
    clearTimeout(recoveryTimer);
    recoveryTimer = undefined;

    unregister?.();
    unregister = null;
  };

input.socket.on("close", (...args: unknown[]) => {
  console.warn("communication_socket_closed", {
    requestId: ticket?.requestId,
    actorRole: ticket?.actorRole,
    stage,
    args: args.map((value) =>
      Buffer.isBuffer(value) ? value.toString("utf8") : String(value ?? ""),
    ),
  });

  cleanup();
});

input.socket.on("error", (...args: unknown[]) => {
  console.error("communication_socket_transport_error", {
    requestId: ticket?.requestId,
    actorRole: ticket?.actorRole,
    stage,
    args: args.map((value) =>
      value instanceof Error ? value.message : String(value ?? ""),
    ),
  });

  cleanup();
});

  input.socket.on("message", (raw) => {
    chain = chain
      .then(async () => {
        if (closed) return;
        const frame = Buffer.isBuffer(raw)
          ? raw.toString("utf8")
          : String(raw ?? "");

        //
        // Authentication
        //
        if (!ticket) {
          let auth: unknown;

          try {
            auth = JSON.parse(frame);
          } catch {
            input.socket.close(
              1008,
              "authentication_required",
            );
            return;
          }

          if (
            !auth ||
            typeof auth !== "object" ||
            (auth as { type?: unknown }).type !==
              "auth" ||
            typeof (auth as { ticket?: unknown })
                .ticket !== "string"
          ) {
            input.socket.close(
              1008,
              "authentication_required",
            );
            return;
          }

          ticket = input.verifyTicket(
            (auth as { ticket: string }).ticket,
          );

          if (!ticket) {
            input.socket.close(
              1008,
              "invalid_ticket",
            );
            return;
          }

          clearTimeout(timeout);

          unregister = input.register({
            ...ticket,

            send: (payload) => { if (bootstrapping) pending.push(payload); else deliver(payload); },
          });

          input.socket.send(
            JSON.stringify({
              type: "ready",
              requestId: ticket.requestId,
            }),
          );
          stage = 'replay';
          for (const payload of await input.replay?.(ticket) ?? []) deliver(payload);
          bootstrapping = false;
          for (const payload of pending.splice(0)) deliver(payload);
          enableRecovery();

          return;
        }

        //
        // Decode incoming communication event
        //
        let event: ClientCommunicationEvent;

        try {
          event = decodeClientEvent(frame);
        } catch {
          input.socket.close(
            1008,
            "invalid_event",
          );
          return;
        }

        //
        // Heartbeat
        //
        if (event.type === "ping") {
          input.socket.send(
            JSON.stringify({
              type: "pong",
            }),
          );

          return;
        }

        //
        // Every communication event from this point
        // belongs to a call.
        //
        stage = 'verify_call';
        const allowed = await input.verifyCall(
          event.callId,
          ticket.requestId,
          event.type,
          ticket.actorRole,
        );

        if (!allowed) {
          console.warn('communication_socket_denied', { requestId: ticket.requestId, actorRole: ticket.actorRole, reason: 'call_forbidden' });
          input.socket.close(
            1008,
            "call_forbidden",
          );
          return;
        }

        //
        // Publish to PostgreSQL bridge.
        //
        // This includes:
        //
        // call.invite
        // call.rejected
        // call.cancelled
        // call.ended
        // signal.offer
        // signal.answer
        // signal.ice
        //
        stage = 'publish';
        enableRecovery();
        await input.publish({
          requestId: ticket.requestId,
          senderRole: ticket.actorRole,
          event,
        });
      })
      .catch((error: unknown) => {
        const code = (error as { code?: unknown } | null)?.code;
        console.error('communication_socket_failure', {
          requestId: ticket?.requestId,
          actorRole: ticket?.actorRole,
          stage,
          errorCode: typeof code === 'string' && /^[A-Z0-9_]{1,40}$/.test(code) ? code : 'unknown',
          errorName: error instanceof Error ? error.name : 'unknown',
        });
        input.socket.close(
          1011,
          "socket_error",
        );
      });
  });

  return cleanup;
}
