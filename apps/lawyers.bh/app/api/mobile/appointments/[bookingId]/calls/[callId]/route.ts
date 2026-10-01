import { resolveAppointmentCommunication } from "@/lib/appointment-communications/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string; callId: string }> };
type Action = "accept" | "reject" | "connect" | "end" | "cancel" | "fail";
type CallRow = {
  id: string;
  media_kind: string;
  status: string;
  ringing_at: Date | string;
  accepted_at: Date | string | null;
  connected_at: Date | string | null;
  ended_at: Date | string | null;
  duration_seconds: number | null;
  end_reason: string | null;
  ended_by_role: string | null;
};

const uuid = /^[0-9a-f-]{36}$/i;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function publicCall(call: CallRow) {
  return {
    id: call.id,
    mediaKind: call.media_kind,
    status: call.status,
    ringingAt: new Date(call.ringing_at).toISOString(),
    acceptedAt: call.accepted_at == null ? null : new Date(call.accepted_at).toISOString(),
    connectedAt: call.connected_at == null ? null : new Date(call.connected_at).toISOString(),
    endedAt: call.ended_at == null ? null : new Date(call.ended_at).toISOString(),
    durationSeconds: call.duration_seconds,
    endReason: call.end_reason,
    endedByRole: call.ended_by_role,
  };
}

/**
 * Transitions an appointment call. The WHERE clause encodes the whole state
 * machine and the initiator rules in SQL, so a stale action or an action by the
 * wrong party simply matches no row (409) rather than mutating state.
 */
export async function PATCH(request: Request, context: Context) {
  const { bookingId, callId } = await context.params;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "forbidden" }, 403);

  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);
  if (!uuid.test(callId)) return json({ ok: false, error: "invalid_call_id" }, 400);

  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const action = data.action as Action;
  const config = {
    accept: { from: "ringing", to: "accepted" },
    reject: { from: "ringing", to: "rejected" },
    connect: { from: "accepted,connected", to: "connected" },
    end: { from: "accepted,connected", to: "ended" },
    cancel: { from: "ringing", to: "cancelled" },
    fail: { from: "ringing,accepted,connected", to: "failed" },
  }[action];
  if (!config) return json({ ok: false, error: "invalid_call_action" }, 400);

  if (participant.readOnly && (action === "accept" || action === "connect")) {
    return json({ ok: false, error: "communication_read_only" }, 409);
  }

  const allowed = config.from.split(",");
  const { sqlClient } = await import("@/lib/db/client");
  const rows = await sqlClient<CallRow[]>`
    UPDATE bahrain_appointment_calls SET
      status = ${config.to},
      accepted_at = CASE WHEN ${config.to} = 'accepted' THEN now() ELSE accepted_at END,
      connected_at = CASE WHEN ${config.to} = 'connected' THEN COALESCE(connected_at, now()) ELSE connected_at END,
      ended_at = CASE WHEN ${config.to} IN ('ended','rejected','cancelled','failed') THEN now() ELSE ended_at END,
      duration_seconds = CASE WHEN ${config.to} IN ('ended','failed') AND connected_at IS NOT NULL THEN GREATEST(0, floor(extract(epoch from (now() - connected_at)))::int) ELSE duration_seconds END,
      end_reason = CASE WHEN ${config.to} IN ('ended','rejected','cancelled','failed') THEN ${String(data.reason ?? action).slice(0, 100)} ELSE end_reason END,
      ended_by_role = CASE WHEN ${config.to} IN ('ended','rejected','cancelled','failed') THEN ${participant.actor.role} ELSE ended_by_role END,
      updated_at = now()
    WHERE id = ${callId}::uuid AND conversation_id = ${participant.conversationId}::uuid AND status = ANY(${allowed})
      AND (${action} NOT IN ('accept','reject') OR initiator_role <> ${participant.actor.role})
      AND (${action} <> 'cancel' OR initiator_role = ${participant.actor.role})
      AND (${action} <> 'accept' OR ringing_at > now() - interval '45 seconds')
    RETURNING id::text, media_kind, status, ringing_at, accepted_at, connected_at, ended_at, duration_seconds, end_reason, ended_by_role
  `;
  const call = rows[0];
  if (!call) return json({ ok: false, error: "stale_call_transition" }, 409);
  return json({ ok: true, call: publicCall(call) });
}
