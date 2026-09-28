import { resolveRequestCommunicationAccess } from "@/lib/communications/server-access";
import { mobilePushSender } from "@/lib/sos/mobile-push";
import { sendPeerVoipPush } from "@/lib/communications/voip-push";
import { isActiveChatSuspension } from "@/lib/communications/safety/policy";
import { getCommunicationSafetyState } from "@/lib/communications/safety/store";

type Context = { params: Promise<{ requestId: string }> };
type CallRow = { id: string; media_kind: "audio" | "video"; status: string; ringing_at: Date | string };

export async function POST(request: Request, context: Context) {
  const { requestId } = await context.params;
  const participant = await resolveRequestCommunicationAccess(requestId, request);
  if (!participant) return Response.json({ error: "communication_forbidden" }, { status: 403 });
  if (!participant.capabilities.call) return Response.json({ error: "communication_read_only" }, { status: 409 });
  const safety = await getCommunicationSafetyState(participant);
  if (safety.blockedByMe || safety.blockedByPeer) return Response.json({ error: "communication_blocked" }, { status: 409 });
  if (isActiveChatSuspension(safety.chatSuspendedUntil)) return Response.json({ error: "chat_suspended" }, { status: 409 });
  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
  const mediaKind = data.mediaKind;
  if (mediaKind !== "audio" && mediaKind !== "video") return Response.json({ error: "invalid_media_kind" }, { status: 400 });
  const { sqlClient } = await import("@/lib/db/client");
  try {
    await sqlClient`
      UPDATE bahrain_communication_calls
         SET status = 'missed', ended_at = now(), updated_at = now(),
             end_reason = 'ring_timeout'
       WHERE request_id = ${requestId}::uuid
         AND status = 'ringing'
         AND ringing_at < now() - interval '45 seconds'
    `;
    const rows = await sqlClient<CallRow[]>`
      INSERT INTO bahrain_communication_calls (request_id, initiator_role, initiator_id, media_kind)
      VALUES (${requestId}::uuid, ${participant.actor.role}, ${participant.actor.id}, ${mediaKind})
      RETURNING id::text, media_kind, status, ringing_at
    `;
    const call = rows[0];
    if (!call) return Response.json({ error: "call_not_persisted" }, { status: 500 });

    try {
      const voipDelivery = sendPeerVoipPush({
        requestId,
        actorRole: participant.peer.role,
        actorId: participant.peer.id,
        callId: call.id,
        mediaKind: call.media_kind,
        callerName: "LegalSOS",
      }).catch(error => {
        console.error('communication_voip_delivery_failed', {callId: call.id, error: error instanceof Error ? error.message : 'unknown'});
      });
      const sender = await mobilePushSender();
      const push = {
        eventType: "incoming_call" as const,
        requestId,
        callId: call.id,
        mediaKind: call.media_kind,
        callerName: "LegalSOS",
        locale: "ar" as const,
      };
      if (participant.peer.role === "lawyer") {
        await sender.sendLawyerPush({
          ...push,
          lawyerId: participant.peer.id,
        });
      } else {
        await sender.sendClientPush(push);
      }
      await voipDelivery;
    } catch (error) {
      console.error("communication_call_push_failed", {
        requestId,
        callId: call.id,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }

    return Response.json({ call: { id: call.id, mediaKind: call.media_kind, status: call.status, ringingAt: new Date(call.ringing_at).toISOString() } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") return Response.json({ error: "active_call_exists" }, { status: 409 });
    throw error;
  }
}
