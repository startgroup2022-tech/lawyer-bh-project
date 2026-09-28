import { resolveRequestCommunicationAccess } from "@/lib/communications/server-access";

type Context = { params: Promise<{ requestId: string; callId: string }> };
type Action = "accept" | "reject" | "connect" | "end" | "cancel" | "fail";
type CallRow = { id: string; media_kind: string; status: string; ringing_at: Date | string; accepted_at: Date | string | null; connected_at: Date | string | null; ended_at: Date | string | null; duration_seconds: number | null; end_reason: string | null; ended_by_role: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function publicCall(call: CallRow) {
  return { id: call.id, mediaKind: call.media_kind, status: call.status, ringingAt: new Date(call.ringing_at).toISOString(), acceptedAt: call.accepted_at == null ? null : new Date(call.accepted_at).toISOString(), connectedAt: call.connected_at == null ? null : new Date(call.connected_at).toISOString(), endedAt: call.ended_at == null ? null : new Date(call.ended_at).toISOString(), durationSeconds: call.duration_seconds, endReason: call.end_reason, endedByRole: call.ended_by_role };
}

export async function PATCH(request: Request, context: Context) {
  const { requestId, callId } = await context.params;
  const participant = await resolveRequestCommunicationAccess(requestId, request);
  if (!participant) return Response.json({ error: "communication_forbidden" }, { status: 403 });
  if (!uuid.test(callId)) return Response.json({ error: "invalid_call_id" }, { status: 400 });
  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
  const action = data.action as Action;
  const config = {
    accept: { from: "ringing", to: "accepted" }, reject: { from: "ringing", to: "rejected" },
    connect: { from: "accepted,connected", to: "connected" }, end: { from: "accepted,connected", to: "ended" },
    cancel: { from: "ringing", to: "cancelled" }, fail: { from: "ringing,accepted,connected", to: "failed" },
  }[action];
  if (!config) return Response.json({ error: "invalid_call_action" }, { status: 400 });
  // Completed requests retain history and allow cleanup, never a new connection.
  if (!participant.capabilities.call && (action === "accept" || action === "connect")) {
    return Response.json({ error: "communication_read_only" }, { status: 409 });
  }
  const allowed = config.from.split(",");
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<CallRow[]>`
    UPDATE bahrain_communication_calls SET
      status = ${config.to},
      accepted_at = CASE WHEN ${config.to} = 'accepted' THEN now() ELSE accepted_at END,
      connected_at = CASE WHEN ${config.to} = 'connected' THEN COALESCE(connected_at, now()) ELSE connected_at END,
      ended_at = CASE WHEN ${config.to} IN ('ended','rejected','cancelled','failed') THEN now() ELSE ended_at END,
      duration_seconds = CASE WHEN ${config.to} IN ('ended','failed') AND connected_at IS NOT NULL THEN GREATEST(0, floor(extract(epoch from (now() - connected_at)))::int) ELSE duration_seconds END,
      end_reason = CASE WHEN ${config.to} IN ('ended','rejected','cancelled','failed') THEN ${String(data.reason ?? action).slice(0, 100)} ELSE end_reason END,
      ended_by_role = CASE WHEN ${config.to} IN ('ended','rejected','cancelled','failed') THEN ${participant.actor.role} ELSE ended_by_role END,
      updated_at = now()
    WHERE id = ${callId}::uuid AND request_id = ${requestId}::uuid AND status = ANY(${allowed})
      AND (${action} NOT IN ('accept','reject') OR initiator_role <> ${participant.actor.role})
      AND (${action} <> 'cancel' OR initiator_role = ${participant.actor.role})
      AND (${action} <> 'accept' OR ringing_at > now() - interval '45 seconds')
    RETURNING id::text, media_kind, status, ringing_at, accepted_at, connected_at, ended_at, duration_seconds, end_reason, ended_by_role
  `;
  const call = rows[0];
  if (!call) return Response.json({ error: "stale_call_transition" }, { status: 409 });
  return Response.json({ call: publicCall(call) });
}
