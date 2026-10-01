import "server-only";

import { sqlClient } from "@/lib/db/client";

import { planReminders, appointmentStart, type ReminderKind } from "./reminder-schedule";

export type AppointmentReminderEvent = {
  id: string;
  bookingRequestId: string;
  countryCode: string;
  reminderKind: ReminderKind;
  clientAccountId: string | null;
  lawyerId: string | null;
  clientName: string | null;
  lawyerName: string | null;
  appointmentDate: string;
  appointmentTime: string;
  locale: string;
};

/**
 * Recomputes the pending reminder rows for a booking from its *current*
 * appointment time. Existing rows are updated in place (so a reschedule moves
 * them) and rows for reminders that no longer apply are dropped. Because the
 * (booking_request_id, reminder_kind) unique index is used, repeated calls are
 * idempotent and never create duplicates.
 */
export async function scheduleAppointmentReminders(
  bookingRequestId: string,
  now: Date = new Date(),
): Promise<void> {
  const rows = await sqlClient<{
    appointment_date: string;
    appointment_time: string;
    admin_status: string;
    reminder_opt_in: boolean;
    started_at: Date | null;
    completed_at: Date | null;
    country_code: string;
  }[]>`
    SELECT appointment_date::text, appointment_time, admin_status, reminder_opt_in,
           started_at, completed_at, country_code
    FROM public.bahrain_booking_requests
    WHERE id = ${bookingRequestId}::uuid
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking) return;

  const cancelled =
    booking.admin_status === "cancelled" ||
    booking.admin_status === "rejected" ||
    booking.completed_at !== null;

  if (cancelled || !booking.reminder_opt_in) {
    await cancelAppointmentReminders(bookingRequestId);
    return;
  }

  const start = appointmentStart(booking.appointment_date, booking.appointment_time);
  if (!start) return;

  const planned = planReminders(start, now, { graceMinutes: 5 });
  const kinds = planned.map((reminder) => reminder.kind);

  await sqlClient.begin(async (tx) => {
    // Drop rows for reminders that no longer apply (e.g. moved further out).
    if (kinds.length) {
      await tx`
        DELETE FROM public.bahrain_appointment_reminder_outbox
        WHERE booking_request_id = ${bookingRequestId}::uuid
          AND reminder_kind <> ALL(${tx.array(kinds, 1000)}::text[])
          AND status IN ('pending', 'leased')
      `;
    } else {
      await tx`
        UPDATE public.bahrain_appointment_reminder_outbox
        SET status = 'cancelled', updated_at = now()
        WHERE booking_request_id = ${bookingRequestId}::uuid AND status IN ('pending', 'leased')
      `;
      return;
    }

    for (const reminder of planned) {
      await tx`
        INSERT INTO public.bahrain_appointment_reminder_outbox (
          booking_request_id, country_code, reminder_kind, due_at, status
        ) VALUES (
          ${bookingRequestId}::uuid, ${booking.country_code}, ${reminder.kind},
          ${reminder.dueAt.toISOString()}::timestamptz, 'pending'
        )
        ON CONFLICT (booking_request_id, reminder_kind) DO UPDATE
          SET due_at = EXCLUDED.due_at,
              status = CASE
                WHEN bahrain_appointment_reminder_outbox.status = 'sent' THEN 'sent'
                ELSE 'pending'
              END,
              lease_expires_at = NULL,
              claimed_at = NULL,
              updated_at = now()
      `;
    }
  });
}

export async function cancelAppointmentReminders(bookingRequestId: string): Promise<void> {
  await sqlClient`
    UPDATE public.bahrain_appointment_reminder_outbox
    SET status = 'cancelled', updated_at = now()
    WHERE booking_request_id = ${bookingRequestId}::uuid
      AND status IN ('pending', 'leased')
  `;
}

type DueRow = {
  id: string;
  booking_request_id: string;
  country_code: string;
  reminder_kind: ReminderKind;
  client_account_id: string | null;
  lawyer_id: string | null;
  customer_name: string | null;
  selected_lawyer_name: string | null;
  lawyer_full_name_ar: string | null;
  lawyer_full_name_en: string | null;
  appointment_date: string;
  appointment_time: string;
  locale: string;
};

/**
 * Claims due reminders with a lease. FOR UPDATE SKIP LOCKED means two workers
 * running at the same moment take disjoint rows; the lease means a crashed
 * worker's row becomes claimable again after it expires, so no reminder is
 * silently lost and none is sent twice.
 */
export async function claimDueAppointmentReminders(
  now: Date,
  limit: number,
): Promise<AppointmentReminderEvent[]> {
  const leaseExpiresAt = new Date(now.getTime() + 2 * 60_000).toISOString();
  const rows = await sqlClient<DueRow[]>`
    WITH due AS (
      SELECT id FROM public.bahrain_appointment_reminder_outbox
      WHERE due_at <= ${now.toISOString()}::timestamptz
        AND (
          status = 'pending'
          OR (status = 'leased' AND lease_expires_at <= ${now.toISOString()}::timestamptz)
        )
      ORDER BY due_at, id
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    ), claimed AS (
      UPDATE public.bahrain_appointment_reminder_outbox outbox
      SET status = 'leased',
          attempt_count = attempt_count + 1,
          claimed_at = ${now.toISOString()}::timestamptz,
          lease_expires_at = ${leaseExpiresAt}::timestamptz,
          updated_at = now()
      FROM due WHERE outbox.id = due.id
      RETURNING outbox.*
    )
    SELECT claimed.id::text, claimed.booking_request_id::text, claimed.country_code,
           claimed.reminder_kind, booking.client_account_id::text, booking.selected_lawyer_id::text,
           booking.customer_name, booking.selected_lawyer_name,
           lawyer.full_name_ar AS lawyer_full_name_ar, lawyer.full_name_en AS lawyer_full_name_en,
           booking.appointment_date::text, booking.appointment_time, booking.lang AS locale
    FROM claimed
    JOIN public.bahrain_booking_requests booking ON booking.id = claimed.booking_request_id
    LEFT JOIN public.bahrain_lawyers lawyer ON lawyer.id = booking.selected_lawyer_id
    WHERE booking.admin_status NOT IN ('cancelled', 'rejected')
      AND booking.completed_at IS NULL
  `;

  return rows.map((row) => ({
    id: row.id,
    bookingRequestId: row.booking_request_id,
    countryCode: row.country_code,
    reminderKind: row.reminder_kind,
    clientAccountId: row.client_account_id,
    lawyerId: row.lawyer_id,
    clientName: row.customer_name,
    lawyerName: row.lawyer_full_name_ar || row.lawyer_full_name_en || row.selected_lawyer_name,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time.slice(0, 5),
    locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
  }));
}

export async function completeAppointmentReminder(id: string, sentAt: Date): Promise<void> {
  await sqlClient`
    UPDATE public.bahrain_appointment_reminder_outbox
    SET status = 'sent', sent_at = ${sentAt.toISOString()}::timestamptz,
        lease_expires_at = NULL, last_error = NULL, updated_at = now()
    WHERE id = ${id}::uuid
  `;
}

export async function failAppointmentReminder(id: string, error: string): Promise<void> {
  await sqlClient`
    UPDATE public.bahrain_appointment_reminder_outbox
    SET status = CASE WHEN attempt_count >= 5 THEN 'failed' ELSE 'pending' END,
        last_error = ${error.slice(0, 500)},
        lease_expires_at = NULL, updated_at = now()
    WHERE id = ${id}::uuid
  `;
}
