import { resolveAppointmentCommunication } from "@/lib/appointment-communications/access";
import { mobilePushSender } from "@/lib/sos/mobile-push";
import { sendPeerVoipPush } from "@/lib/communications/voip-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> };
type CallRow = { id: string; media_kind: "audio" | "video"; status: string; ringing_at: Date | string };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Starts a voice/video call on the appointment conversation. The call row is
 * keyed to the conversation, so signaling can only ever be authorized for this
 * appointment, and the peer is rung through the existing VoIP + FCM path.
 */
export async function POST(request: Request, context: Context) {
  const { bookingId } = await context.params;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "forbidden" }, 403);

  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);
  if (participant.readOnly) return json({ ok: false, error: "communication_read_only" }, 409);

  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const mediaKind = data.mediaKind;
  if (mediaKind !== "audio" && mediaKind !== "video") {
    return json({ ok: false, error: "invalid_media_kind" }, 400);
  }

  const { sqlClient } = await import("@/lib/db/client");
  try {
    await sqlClient`
      UPDATE bahrain_appointment_calls
         SET status = 'missed', ended_at = now(), updated_at = now(), end_reason = 'ring_timeout'
       WHERE conversation_id = ${participant.conversationId}::uuid
         AND status = 'ringing'
         AND ringing_at < now() - interval '45 seconds'
    `;
    const rows = await sqlClient<CallRow[]>`
      INSERT INTO bahrain_appointment_calls (conversation_id, initiator_role, initiator_id, media_kind)
      VALUES (${participant.conversationId}::uuid, ${participant.actor.role}, ${participant.actor.id}, ${mediaKind})
      RETURNING id::text, media_kind, status, ringing_at
    `;
    const call = rows[0];
    if (!call) return json({ ok: false, error: "call_not_persisted" }, 500);

    try {
      const voip = sendPeerVoipPush({
        requestId: participant.conversationId,
        actorRole: participant.peer.role,
        actorId: participant.peer.id,
        callId: call.id,
        mediaKind: call.media_kind,
        callerName: participant.actor.displayName || "Lawyers.bh",
      }).catch((error) => {
        console.error("appointment_voip_delivery_failed", {
          callId: call.id,
          error: error instanceof Error ? error.message : "unknown",
        });
      });

      const sender = await mobilePushSender();
      const push = {
        eventType: "incoming_call" as const,
        requestId: participant.conversationId,
        callId: call.id,
        mediaKind: call.media_kind,
        callerName: participant.actor.displayName || "Lawyers.bh",
        locale: "ar" as const,
      };
      if (participant.peer.role === "lawyer") {
        await sender.sendLawyerPush({ ...push, lawyerId: participant.peer.id });
      } else {
        await sender.sendClientPush(push);
      }
      await voip;
    } catch (error) {
      console.error("appointment_call_push_failed", {
        callId: call.id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }

    return json(
      {
        ok: true,
        call: {
          id: call.id,
          mediaKind: call.media_kind,
          status: call.status,
          ringingAt: new Date(call.ringing_at).toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return json({ ok: false, error: "active_call_exists" }, 409);
    }
    console.error("[mobile/appointments/calls] failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ ok: false, error: "call_unavailable" }, 503);
  }
}
