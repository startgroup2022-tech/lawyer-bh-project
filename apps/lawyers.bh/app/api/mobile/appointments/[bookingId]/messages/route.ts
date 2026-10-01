import { resolveAppointmentCommunication } from "@/lib/appointment-communications/access";
import {
  appointmentUnreadCount,
  insertAppointmentMessage,
  listAppointmentMessages,
} from "@/lib/appointment-communications/store";
import { notifyAppointmentMessage } from "@/lib/appointment-communications/notifications";
import { appointmentEventBridge } from "@/lib/appointment-communications/event-bridge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> };

const uuid = /^[0-9a-f-]{36}$/i;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * The appointment conversation history. Authorization is resolved from the
 * signed-in caller and the appointment, so a client can only read its own
 * appointment and a lawyer only the one assigned to them.
 */
export async function GET(request: Request, { params }: Context) {
  const { bookingId } = await params;
  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);

  const url = new URL(request.url);
  try {
    const { messages, nextCursor } = await listAppointmentMessages({
      conversationId: participant.conversationId,
      limit: Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
      cursorAt: url.searchParams.get("cursorAt"),
      cursorId: url.searchParams.get("cursorId"),
    });
    const unreadCount = await appointmentUnreadCount(participant);
    return json({
      ok: true,
      conversationId: participant.conversationId,
      bookingRequestId: participant.bookingRequestId,
      peer: participant.peer,
      readOnly: participant.readOnly,
      capabilities: { send: !participant.readOnly, call: !participant.readOnly },
      unreadCount,
      messages,
      nextCursor,
    });
  } catch (error) {
    console.error("[mobile/appointments/messages] read failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "messages_unavailable" }, 503);
  }
}

/** Sends a message to the peer on the appointment conversation. */
export async function POST(request: Request, { params }: Context) {
  const { bookingId } = await params;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);
  if (participant.readOnly) return json({ ok: false, error: "communication_read_only" }, 409);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const clientMessageId = String(body.clientMessageId ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!uuid.test(clientMessageId) || !text || text.length > 4000) {
    return json({ ok: false, error: "invalid_message" }, 400);
  }

  try {
    const { message, inserted } = await insertAppointmentMessage({
      participant,
      clientMessageId,
      body: text,
    });

    if (inserted) {
      // Fan out to the peer's live socket (best effort), then persist the
      // notification and push.
      try {
        await appointmentEventBridge.publish({
          requestId: participant.conversationId,
          senderRole: participant.actor.role,
          event: { type: "message.created", message: { ...message } },
        });
      } catch (error) {
        console.warn("[mobile/appointments/messages] socket fanout failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
      await notifyAppointmentMessage({
        bookingRequestId: participant.bookingRequestId,
        senderRole: participant.actor.role,
        messageId: message.id,
      });
    }

    return json({ ok: true, message }, 201);
  } catch (error) {
    console.error("[mobile/appointments/messages] send failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "message_not_persisted" }, 503);
  }
}
