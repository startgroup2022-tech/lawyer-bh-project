import { resolveAppointmentCommunication } from "@/lib/appointment-communications/access";
import { createSocketTicketCodec } from "@/lib/communications/socket-ticket";
import { communicationIceServers } from "@/lib/communications/cloudflare-turn";
import { communicationSocketSecret } from "@/lib/communications/socket-runtime";
import { openAppointmentMeeting } from "@/lib/appointment-communications/meeting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Opens an authorized meeting session for an appointment: the socket ticket,
 * the ICE servers and the meeting id. The ticket's `requestId` is the
 * conversation id, so it only ever authorizes this conversation's signaling.
 */
export async function POST(request: Request, context: Context) {
  const { bookingId } = await context.params;
  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);

  const meeting = await openAppointmentMeeting(bookingId, request);
  if (!meeting.ok) {
    const status = meeting.error === "forbidden" ? 403 : meeting.error === "not_active" ? 409 : 404;
    return json({ ok: false, error: meeting.error }, status);
  }

  const callable = !participant.readOnly;
  const iceServers = callable ? await communicationIceServers() : [];
  const relayReady = iceServers.some((server) =>
    server.username && server.credential && server.urls.some((url) => /^turns?:/.test(url)),
  );

  const ticket = createSocketTicketCodec({
    secret: communicationSocketSecret(),
    now: () => new Date(),
    ttlSeconds: 60,
  }).issue({
    requestId: participant.conversationId,
    actorRole: participant.actor.role,
    actorId: participant.actor.id,
  });

  const url = new URL(request.url);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/api/mobile/appointments/ws";
  url.search = "";

  return json({
    ok: true,
    bookingRequestId: participant.bookingRequestId,
    conversationId: participant.conversationId,
    meetingId: meeting.meetingId,
    consultationMethod: meeting.consultationMethod,
    ticket,
    webSocketUrl: url.toString(),
    peer: { role: participant.peer.role, displayName: participant.peer.displayName },
    capabilities: { send: callable, call: callable && relayReady },
    iceServers: relayReady ? iceServers : [],
  });
}
