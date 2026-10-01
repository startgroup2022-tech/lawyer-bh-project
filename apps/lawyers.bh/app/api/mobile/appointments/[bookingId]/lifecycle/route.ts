import { resolveAppointmentCommunication } from "@/lib/appointment-communications/access";
import { transitionAppointment } from "@/lib/appointment-communications/lifecycle";
import { canTransition, type AppointmentStatus } from "@/lib/appointment-communications/status";
import { notifyAppointmentCompleted, notifyAppointmentAccepted } from "@/lib/appointment-communications/notifications";
import { scheduleAppointmentReminders } from "@/lib/appointment-communications/reminder-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const actions: Record<string, AppointmentStatus> = {
  start: "in_progress",
  complete: "completed",
  cancel: "cancelled",
  accept: "confirmed",
};

/**
 * Advances an appointment's lifecycle (start / complete / cancel / accept).
 * The caller must be an authorized participant of the appointment, and the
 * transition itself is validated by the shared state machine, so a client can
 * never complete an appointment and a lawyer can never reject one.
 */
export async function PATCH(request: Request, context: Context) {
  const { bookingId } = await context.params;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ ok: false, error: "forbidden" }, 403);

  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);

  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const to = actions[String(data.action ?? "")];
  if (!to) return json({ ok: false, error: "invalid_action" }, 400);

  const result = await transitionAppointment({ bookingRequestId: bookingId, participant, to });
  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 409;
    return json({ ok: false, error: result.error }, status);
  }

  try {
    if (to === "completed") await notifyAppointmentCompleted(bookingId);
    if (to === "confirmed") await notifyAppointmentAccepted(bookingId);
    if (to === "cancelled" || to === "in_progress" || to === "confirmed") {
      await scheduleAppointmentReminders(bookingId);
    }
  } catch (error) {
    console.error("[mobile/appointments] lifecycle side effects failed", {
      bookingId,
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return json({ ok: true, status: result.status });
}

/** Reports which transitions the caller may perform, for the app's UI. */
export async function GET(request: Request, context: Context) {
  const { bookingId } = await context.params;
  const participant = await resolveAppointmentCommunication(bookingId, request);
  if (!participant) return json({ ok: false, error: "forbidden" }, 403);

  const from = "approved" as AppointmentStatus;
  const allowed = Object.entries(actions)
    .filter(([, to]) => canTransition(from, to, participant.actor.role))
    .map(([action]) => action);
  return json({ ok: true, readOnly: participant.readOnly, allowedActions: participant.readOnly ? [] : allowed });
}
