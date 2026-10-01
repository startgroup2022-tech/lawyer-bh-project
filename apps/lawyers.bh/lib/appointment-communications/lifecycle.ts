import "server-only";

import { sqlClient } from "@/lib/db/client";

import type { AppointmentCommunicationParticipant } from "./access";
import { canTransition, type AppointmentActorRole, type AppointmentStatus } from "./status";

export type TransitionResult =
  | { ok: true; status: AppointmentStatus }
  | { ok: false; error: "not_found" | "invalid_transition" };

/**
 * Moves an appointment through its lifecycle. The transition rules are checked
 * against the role derived from the authenticated participant, and the UPDATE
 * is guarded by the expected current status so two concurrent requests cannot
 * both advance it (the second matches no row and is rejected as stale).
 */
export async function transitionAppointment(input: {
  bookingRequestId: string;
  participant: AppointmentCommunicationParticipant;
  to: AppointmentStatus;
}): Promise<TransitionResult> {
  const role: AppointmentActorRole = input.participant.actor.role;
  const { sqlClient: sql } = await import("@/lib/db/client");

  const rows = await sql<{ admin_status: string; started_at: Date | null }[]>`
    SELECT admin_status, started_at
    FROM public.bahrain_booking_requests
    WHERE id = ${input.bookingRequestId}::uuid
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return { ok: false, error: "not_found" };

  const from = booking.admin_status as AppointmentStatus;
  // A consultation cannot be completed without first having started, and the
  // in-progress state is only reachable from a not-yet-started appointment.
  if (input.to === "in_progress" && booking.started_at) return { ok: false, error: "invalid_transition" };
  if (input.to === "completed" && !booking.started_at) return { ok: false, error: "invalid_transition" };
  if (!canTransition(from, input.to, role)) return { ok: false, error: "invalid_transition" };

  const updated = await sql<{ admin_status: string }[]>`
    UPDATE public.bahrain_booking_requests
    SET admin_status = ${input.to},
        started_at = CASE WHEN ${input.to} = 'in_progress' THEN COALESCE(started_at, now()) ELSE started_at END,
        completed_at = CASE WHEN ${input.to} = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END,
        cancelled_at = CASE WHEN ${input.to} = 'cancelled' THEN COALESCE(cancelled_at, now()) ELSE cancelled_at END,
        updated_at = now()
    WHERE id = ${input.bookingRequestId}::uuid AND admin_status = ${from}
    RETURNING admin_status
  `;
  if (!updated[0]) return { ok: false, error: "invalid_transition" };

  if (input.to === "completed" || input.to === "cancelled") {
    await sql`
      UPDATE public.bahrain_appointment_slots
      SET status = ${input.to === "completed" ? "completed" : "cancelled"}, updated_at = now()
      WHERE booking_request_id = ${input.bookingRequestId}::uuid
    `;
  }

  return { ok: true, status: updated[0].admin_status as AppointmentStatus };
}

/**
 * The stored lifecycle status of an appointment, or null if it does not exist.
 */
export async function getAppointmentStatus(bookingRequestId: string): Promise<AppointmentStatus | null> {
  if (!/^[0-9a-f-]{36}$/i.test(bookingRequestId)) return null;
  const rows = await sqlClient<{ admin_status: string }[]>`
    SELECT admin_status FROM public.bahrain_booking_requests
    WHERE id = ${bookingRequestId}::uuid LIMIT 1
  `;
  return rows[0] ? (rows[0].admin_status as AppointmentStatus) : null;
}

/**
 * Auto-completes appointments whose end time has passed and were never closed
 * by hand, and closes any stale in-progress call/slot rows. Returns the
 * booking ids that were completed so the caller can notify them.
 */
export async function autoCompletePastAppointments(now: Date, limit: number): Promise<string[]> {
  const rows = await sqlClient<{ id: string }[]>`
    UPDATE public.bahrain_booking_requests b
    SET admin_status = 'completed',
        completed_at = COALESCE(b.completed_at, now()),
        updated_at = now()
    WHERE b.id IN (
      SELECT id FROM public.bahrain_booking_requests
      WHERE admin_status IN ('approved', 'confirmed', 'in_progress')
        AND (appointment_date::text || ' ' || appointment_time)::timestamp
            + (COALESCE(NULLIF(duration_minutes, 0), 60) || ' minutes')::interval
            < (${now.toISOString()}::timestamptz AT TIME ZONE 'Asia/Bahrain')
      ORDER BY appointment_date, appointment_time
      LIMIT ${limit}
    )
    RETURNING b.id::text
  `;
  if (!rows.length) return [];

  const ids = rows.map((row) => row.id);
  await sqlClient`
    UPDATE public.bahrain_appointment_slots
    SET status = 'completed', updated_at = now()
    WHERE booking_request_id = ANY(${sqlClient.array(ids, 2950)}::uuid[]) AND status IN ('booked', 'confirmed')
  `;
  await sqlClient`
    UPDATE public.bahrain_appointment_calls c
    SET status = 'ended', ended_at = COALESCE(ended_at, now()), end_reason = 'auto_timeout', updated_at = now()
    WHERE c.status IN ('ringing', 'accepted', 'connected')
      AND c.conversation_id IN (
        SELECT id FROM public.bahrain_appointment_conversations WHERE booking_request_id = ANY(${sqlClient.array(ids, 2950)}::uuid[])
      )
  `;
  return ids;
}
