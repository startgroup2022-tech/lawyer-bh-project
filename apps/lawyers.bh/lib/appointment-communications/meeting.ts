import "server-only";

import { sqlClient } from "@/lib/db/client";

import { resolveAppointmentCommunication, type AppointmentCommunicationParticipant } from "./access";
import { isActive } from "./status";

export type MeetingJoinResult =
  | { ok: true; participant: AppointmentCommunicationParticipant; consultationMethod: string | null; meetingId: string }
  | { ok: false; error: "not_found" | "forbidden" | "not_active" };

/**
 * Authorizes joining the appointment meeting. The meeting is *derived* from the
 * authenticated participant and the appointment, never from a meeting id the
 * client supplies: `bookingRequestId` is authorized first, and the meeting row
 * is then keyed to that same booking, so an unrelated appointment or a
 * cancelled one cannot be joined.
 */
export async function openAppointmentMeeting(
  bookingRequestId: string,
  request: Request,
): Promise<MeetingJoinResult> {
  const participant = await resolveAppointmentCommunication(bookingRequestId, request);
  if (!participant) return { ok: false, error: "forbidden" };

  const rows = await sqlClient<{ admin_status: string; consultation_method: string | null }[]>`
    SELECT admin_status, consultation_method
    FROM public.bahrain_booking_requests
    WHERE id = ${bookingRequestId}::uuid
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return { ok: false, error: "not_found" };
  if (!isActive(booking.admin_status)) return { ok: false, error: "not_active" };

  const meetingRows = await sqlClient<{ id: string }[]>`
    INSERT INTO public.bahrain_appointment_meetings (
      conversation_id, booking_request_id, opened_by_role, opened_by_id
    ) VALUES (
      ${participant.conversationId}::uuid, ${bookingRequestId}::uuid,
      ${participant.actor.role}, ${participant.actor.id}
    )
    RETURNING id::text
  `;

  return {
    ok: true,
    participant,
    consultationMethod: booking.consultation_method,
    meetingId: meetingRows[0].id,
  };
}

export async function closeAppointmentMeeting(meetingId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(meetingId)) return;
  await sqlClient`
    UPDATE public.bahrain_appointment_meetings
    SET closed_at = clock_timestamp()
    WHERE id = ${meetingId}::uuid AND closed_at IS NULL
  `;
}
