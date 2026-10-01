import "server-only";

import { sqlClient } from "@/lib/db/client";
import { getMobileClient } from "@/lib/booking/mobileClient";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";

import { isActive, isTerminal } from "./status";

export type AppointmentActorRole = "client" | "lawyer";

export type AppointmentConversationRow = {
  id: string;
  countryCode: string;
  bookingRequestId: string;
  clientAccountId: string | null;
  lawyerId: string | null;
  adminStatus: string;
  paymentStatus: string;
  clientName: string | null;
  lawyerName: string | null;
  appointmentDate: string;
  appointmentTime: string;
  consultationMethod: string | null;
  durationMinutes: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type AppointmentCommunicationParticipant = {
  conversationId: string;
  bookingRequestId: string;
  actor: { role: AppointmentActorRole; id: string; displayName: string };
  peer: { role: AppointmentActorRole; id: string; displayName: string };
  /** Terminal appointments are readable but cannot be messaged or called. */
  readOnly: boolean;
};

type RawRow = {
  id: string;
  country_code: string;
  booking_request_id: string;
  client_account_id: string | null;
  lawyer_id: string | null;
  admin_status: string;
  payment_status: string;
  customer_name: string | null;
  selected_lawyer_name: string | null;
  lawyer_full_name_ar: string | null;
  lawyer_full_name_en: string | null;
  appointment_date: string;
  appointment_time: string;
  consultation_method: string | null;
  duration_minutes: number | null;
  started_at: Date | null;
  completed_at: Date | null;
};

/**
 * Creates (idempotently) the conversation row for a booking and returns its id.
 * Called from the booking route and again on join so an appointment booked
 * before this migration still gets a conversation on first use.
 */
export async function ensureAppointmentConversation(bookingRequestId: string): Promise<string | null> {
  const rows = await sqlClient<{ id: string }[]>`
    INSERT INTO public.bahrain_appointment_conversations (
      country_code, booking_request_id, client_account_id, lawyer_id
    )
    SELECT b.country_code, b.id, b.client_account_id, b.selected_lawyer_id
    FROM public.bahrain_booking_requests b
    WHERE b.id = ${bookingRequestId}::uuid
    ON CONFLICT (booking_request_id) DO UPDATE
      SET client_account_id = COALESCE(EXCLUDED.client_account_id, bahrain_appointment_conversations.client_account_id),
          lawyer_id = COALESCE(EXCLUDED.lawyer_id, bahrain_appointment_conversations.lawyer_id),
          updated_at = now()
    RETURNING id::text
  `;
  return rows[0]?.id ?? null;
}

/**
 * Resolves the participant for the *signed-in* caller against the appointment.
 *
 * Authorization is derived from the appointment every time, never from a
 * conversationId/messageId supplied by the client. A client only matches its
 * own `client_account_id`; a lawyer only matches the assigned
 * `selected_lawyer_id`, so swapping IDs cannot cross accounts or lawyers.
 */
export async function resolveAppointmentCommunication(
  bookingRequestId: string,
  request: Request,
): Promise<AppointmentCommunicationParticipant | null> {
  if (!/^[0-9a-f-]{36}$/i.test(bookingRequestId)) return null;

  const client = await getMobileClient(request);
  const lawyer = client ? null : await getMobileLawyerSession(request);
  if (!client && !lawyer) return null;

  const rows = await sqlClient<RawRow[]>`
    SELECT
      c.id::text AS id,
      c.country_code,
      c.booking_request_id::text AS booking_request_id,
      c.client_account_id::text AS client_account_id,
      c.lawyer_id::text AS lawyer_id,
      b.admin_status,
      b.payment_status,
      b.customer_name,
      b.selected_lawyer_name,
      l.full_name_ar AS lawyer_full_name_ar,
      l.full_name_en AS lawyer_full_name_en,
      b.appointment_date::text AS appointment_date,
      b.appointment_time::text AS appointment_time,
      b.consultation_method,
      b.duration_minutes,
      b.started_at,
      b.completed_at
    FROM public.bahrain_appointment_conversations c
    JOIN public.bahrain_booking_requests b ON b.id = c.booking_request_id
    LEFT JOIN public.bahrain_lawyers l ON l.id = c.lawyer_id
    WHERE c.booking_request_id = ${bookingRequestId}::uuid
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  const readOnly = isTerminal(row.admin_status);
  if (!readOnly && !isActive(row.admin_status)) return null;

  const lawyerName =
    row.lawyer_full_name_ar || row.lawyer_full_name_en || row.selected_lawyer_name || "";
  const clientName = row.customer_name || "";

  if (client) {
    if (!row.client_account_id || row.client_account_id !== client.id) return null;
    if (!row.lawyer_id) return null;
    return {
      conversationId: row.id,
      bookingRequestId: row.booking_request_id,
      actor: { role: "client", id: client.id, displayName: client.fullName },
      peer: { role: "lawyer", id: row.lawyer_id, displayName: lawyerName },
      readOnly,
    };
  }

  if (lawyer) {
    if (lawyer.countryCode !== row.country_code) return null;
    if (!row.lawyer_id || row.lawyer_id !== lawyer.lawyerId) return null;
    return {
      conversationId: row.id,
      bookingRequestId: row.booking_request_id,
      actor: { role: "lawyer", id: lawyer.lawyerId, displayName: lawyerName },
      peer: {
        role: "client",
        id: row.client_account_id ?? `booking:${row.booking_request_id}`,
        displayName: clientName,
      },
      readOnly,
    };
  }

  return null;
}
