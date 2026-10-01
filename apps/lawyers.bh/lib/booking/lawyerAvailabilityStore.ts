import type postgres from "postgres";

import {
  computeAvailableSlots,
  formatTime,
  isBookableSlot,
  localDate,
  parseTime,
  rangesOverlap,
  weekdayOf,
  type AvailabilityWindow,
  type AvailableSlot,
  type BlockedPeriod,
  type BusyPeriod,
} from "./lawyerAvailability";

export type Sql = postgres.Sql;

export type AvailabilityRow = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  consultation_type: string;
  is_active: boolean;
};

export type BlockedDateRow = {
  id: string;
  blocked_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason_type: string;
  reason: string | null;
};

export type AppointmentRow = {
  slot_id: string;
  booking_id: string;
  country_code: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  admin_status: string;
  payment_status: string;
  service: string;
  consultation_type: string;
  duration_minutes: number;
  video_provider: string | null;
  lawyer_id: string | null;
  lawyer_name: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  client_account_id: string | null;
  created_at: string | Date;
};

function toTime(value: unknown): string | null {
  const minutes = parseTime(value);
  return minutes == null ? null : formatTime(minutes);
}

function windowFromRow(row: AvailabilityRow): AvailabilityWindow {
  return {
    weekday: Number(row.weekday),
    start: parseTime(row.start_time) ?? 0,
    end: parseTime(row.end_time) ?? 0,
    slotDurationMinutes: Number(row.slot_duration_minutes),
    consultationType: row.consultation_type,
  };
}

function blockFromRow(row: BlockedDateRow): BlockedPeriod {
  const start = row.all_day ? null : toTime(row.start_time);
  const end = row.all_day ? null : toTime(row.end_time);
  return {
    date: String(row.blocked_date).slice(0, 10),
    allDay: row.all_day === true,
    start: start == null ? null : parseTime(start),
    end: end == null ? null : parseTime(end),
  };
}

/** The weekly windows a lawyer accepts appointments in. */
export async function loadAvailability(sql: Sql, lawyerId: string): Promise<AvailabilityWindow[]> {
  const rows = await sql<AvailabilityRow[]>`
    SELECT id, weekday, start_time, end_time, slot_duration_minutes, consultation_type, is_active
    FROM public.bahrain_lawyer_availability
    WHERE lawyer_id = ${lawyerId}::uuid AND is_active = true
    ORDER BY weekday, start_time
  `;
  return rows.map(windowFromRow);
}

export async function loadBlockedDates(
  sql: Sql,
  lawyerId: string,
  range?: { from?: string; to?: string },
): Promise<BlockedPeriod[]> {
  const from = range?.from ?? null;
  const to = range?.to ?? null;
  const rows = await sql<BlockedDateRow[]>`
    SELECT id, blocked_date, all_day, start_time, end_time, reason_type, reason
    FROM public.bahrain_lawyer_blocked_dates
    WHERE lawyer_id = ${lawyerId}::uuid
      AND (${from}::date IS NULL OR blocked_date >= ${from}::date)
      AND (${to}::date IS NULL OR blocked_date <= ${to}::date)
    ORDER BY blocked_date
  `;
  return rows.map(blockFromRow);
}

export async function listBlockedDateRows(
  sql: Sql,
  lawyerId: string,
): Promise<BlockedDateRow[]> {
  return await sql<BlockedDateRow[]>`
    SELECT id, blocked_date, all_day, start_time, end_time, reason_type, reason
    FROM public.bahrain_lawyer_blocked_dates
    WHERE lawyer_id = ${lawyerId}::uuid
    ORDER BY blocked_date DESC
  `;
}

/** Active (booked/confirmed) appointments for a lawyer on a date. */
export async function loadBusySlots(
  sql: Sql,
  lawyerId: string,
  date: string,
): Promise<BusyPeriod[]> {
  const rows = await sql<{ start_time: string; end_time: string }[]>`
    SELECT start_time, end_time
    FROM public.bahrain_appointment_slots
    WHERE lawyer_id = ${lawyerId}::uuid
      AND appointment_date = ${date}::date
      AND status IN ('booked', 'confirmed')
  `;
  return rows
    .map((row) => ({ start: parseTime(row.start_time) ?? 0, end: parseTime(row.end_time) ?? 0 }))
    .filter((period) => period.end > period.start);
}

export type AvailableSlotsResult = {
  date: string;
  weekday: number;
  slots: AvailableSlot[];
};

/** The real free slots for a lawyer on a date, or null when the date is invalid. */
export async function listAvailableSlots(
  sql: Sql,
  input: { lawyerId: string; date: string; now?: Date },
): Promise<AvailableSlotsResult> {
  const now = input.now ?? new Date();
  const [windows, blocked, busy] = await Promise.all([
    loadAvailability(sql, input.lawyerId),
    loadBlockedDates(sql, input.lawyerId, { from: input.date, to: input.date }),
    loadBusySlots(sql, input.lawyerId, input.date),
  ]);

  const slots = computeAvailableSlots({
    date: input.date,
    now,
    windows,
    blocked,
    busy,
  });

  return { date: input.date, weekday: weekdayOf(input.date), slots };
}

export type AvailabilityWindowInsert = {
  weekday: number;
  start: number;
  end: number;
  slotDurationMinutes: number;
  consultationType: string;
};

/**
 * Replaces a lawyer's whole weekly grid. The payload is validated by
 * `validateAvailabilityPayload` before it gets here. A per-lawyer advisory
 * lock serialises concurrent writers so two replacements cannot interleave
 * into a half-merged grid.
 */
export async function replaceAvailability(
  sql: Sql,
  input: {
    countryCode: string;
    lawyerId: string;
    windows: AvailabilityWindowInsert[];
  },
): Promise<AvailabilityWindow[]> {
  return await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${input.lawyerId}))`;
    await tx`
      DELETE FROM public.bahrain_lawyer_availability
      WHERE lawyer_id = ${input.lawyerId}::uuid
    `;
    for (const window of input.windows) {
      await tx`
        INSERT INTO public.bahrain_lawyer_availability
          (country_code, lawyer_id, weekday, start_time, end_time, slot_duration_minutes, consultation_type)
        VALUES (
          ${input.countryCode}, ${input.lawyerId}::uuid, ${window.weekday},
          ${formatTime(window.start)}::time, ${formatTime(window.end)}::time,
          ${window.slotDurationMinutes}, ${window.consultationType}
        )
      `;
    }
    const rows = await tx<AvailabilityRow[]>`
      SELECT id, weekday, start_time, end_time, slot_duration_minutes, consultation_type, is_active
      FROM public.bahrain_lawyer_availability
      WHERE lawyer_id = ${input.lawyerId}::uuid
      ORDER BY weekday, start_time
    `;
    return rows.map(windowFromRow);
  });
}

export async function createBlockedDate(
  sql: Sql,
  input: {
    countryCode: string;
    lawyerId: string;
    date: string;
    allDay: boolean;
    start?: string | null;
    end?: string | null;
    reasonType: string;
    reason?: string | null;
  },
): Promise<string> {
  const rows = await sql<{ id: string }[]>`
    INSERT INTO public.bahrain_lawyer_blocked_dates
      (country_code, lawyer_id, blocked_date, all_day, start_time, end_time, reason_type, reason)
    VALUES (
      ${input.countryCode}, ${input.lawyerId}::uuid, ${input.date}::date,
      ${input.allDay},
      ${input.allDay ? null : input.start ?? null}::time,
      ${input.allDay ? null : input.end ?? null}::time,
      ${input.reasonType}, ${input.reason ?? null}
    )
    RETURNING id
  `;
  return rows[0].id;
}

export async function deleteBlockedDate(
  sql: Sql,
  lawyerId: string,
  id: string,
): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    DELETE FROM public.bahrain_lawyer_blocked_dates
    WHERE id = ${id}::uuid AND lawyer_id = ${lawyerId}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

export type BookingSlotError =
  | "slot_unavailable"
  | "slot_taken"
  | "already_booked";

export class BookingSlotErrorException extends Error {
  constructor(public readonly code: BookingSlotError) {
    super(code);
  }
}

/**
 * Reserves a slot for a booking. The slot must be one the lawyer actually
 * published for that date and still be free; the partial unique index on
 * (lawyer_id, appointment_date, start_time) is the final guard, so a race
 * between two clients loses with `slot_taken` instead of double booking.
 */
export async function bookAppointmentSlot(
  sql: Sql,
  input: {
    countryCode: string;
    lawyerId: string;
    bookingId: string;
    date: string;
    start: string;
    end: string;
    now?: Date;
  },
): Promise<void> {
  const start = parseTime(input.start);
  const end = parseTime(input.end);
  if (start == null || end == null || start >= end) {
    throw new BookingSlotErrorException("slot_unavailable");
  }

  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${input.lawyerId}))`;

    const existing = await tx<{ id: string; status: string }[]>`
      SELECT id, status FROM public.bahrain_appointment_slots
      WHERE booking_request_id = ${input.bookingId}::uuid
      LIMIT 1
    `;
    if (existing[0] && existing[0].status !== "cancelled") {
      throw new BookingSlotErrorException("already_booked");
    }

    const [windows, blocked, busy] = await Promise.all([
      loadAvailability(tx as unknown as Sql, input.lawyerId),
      loadBlockedDates(tx as unknown as Sql, input.lawyerId, {
        from: input.date,
        to: input.date,
      }),
      loadBusySlots(tx as unknown as Sql, input.lawyerId, input.date),
    ]);

    const bookable = isBookableSlot({
      date: input.date,
      slot: { start, end },
      now: input.now ?? new Date(),
      windows,
      blocked,
      busy,
    });
    if (!bookable) throw new BookingSlotErrorException("slot_unavailable");

    const overlap = busy.some((period) => rangesOverlap({ start, end }, period));
    if (overlap) throw new BookingSlotErrorException("slot_taken");

    try {
      if (existing[0]) {
        await tx`
          UPDATE public.bahrain_appointment_slots
          SET status = 'booked', appointment_date = ${input.date}::date,
              start_time = ${formatTime(start)}::time, end_time = ${formatTime(end)}::time,
              updated_at = now()
          WHERE id = ${existing[0].id}::uuid
        `;
      } else {
        await tx`
          INSERT INTO public.bahrain_appointment_slots
            (country_code, lawyer_id, booking_request_id, appointment_date, start_time, end_time, status)
          VALUES (
            ${input.countryCode}, ${input.lawyerId}::uuid, ${input.bookingId}::uuid,
            ${input.date}::date, ${formatTime(start)}::time, ${formatTime(end)}::time, 'booked'
          )
        `;
      }
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "23505"
      ) {
        throw new BookingSlotErrorException("slot_taken");
      }
      throw error;
    }
  });
}

/** Releases a booking's slot (cancel/reject). Idempotent. */
export async function releaseAppointmentSlot(sql: Sql, bookingId: string): Promise<void> {
  await sql`
    UPDATE public.bahrain_appointment_slots
    SET status = 'cancelled', updated_at = now()
    WHERE booking_request_id = ${bookingId}::uuid AND status <> 'cancelled'
  `;
}

/** Keeps the denormalised slot status in step with the booking's admin status. */
export async function syncAppointmentSlotStatus(
  sql: Sql,
  bookingId: string,
  status: "booked" | "confirmed" | "cancelled",
): Promise<void> {
  await sql`
    UPDATE public.bahrain_appointment_slots
    SET status = ${status}, updated_at = now()
    WHERE booking_request_id = ${bookingId}::uuid
  `;
}

const APPOINTMENT_SELECT = `
  SELECT s.id AS slot_id, b.id AS booking_id, b.country_code,
         s.appointment_date::text AS appointment_date, s.start_time, s.end_time, s.status,
         b.admin_status, b.payment_status, b.service, b.consultation_type,
         b.duration_minutes, b.video_provider,
         b.selected_lawyer_id AS lawyer_id, b.selected_lawyer_name AS lawyer_name,
         b.customer_name, b.customer_phone, b.customer_email,
         b.client_account_id, b.created_at
  FROM public.bahrain_appointment_slots s
  JOIN public.bahrain_booking_requests b ON b.id = s.booking_request_id
`;

/** A client's own appointments, newest first. */
export async function listClientAppointments(
  sql: Sql,
  clientAccountId: string,
): Promise<AppointmentRow[]> {
  return await sql<AppointmentRow[]>`
    ${sql.unsafe(APPOINTMENT_SELECT)}
    WHERE b.client_account_id = ${clientAccountId}::uuid
    ORDER BY s.appointment_date DESC, s.start_time DESC
  `;
}

export async function listLawyerAppointments(
  sql: Sql,
  input: { lawyerId: string; from?: string; to?: string },
): Promise<AppointmentRow[]> {
  const from = input.from ?? null;
  const to = input.to ?? null;
  return await sql<AppointmentRow[]>`
    ${sql.unsafe(APPOINTMENT_SELECT)}
    WHERE s.lawyer_id = ${input.lawyerId}::uuid
      AND (${from}::date IS NULL OR s.appointment_date >= ${from}::date)
      AND (${to}::date IS NULL OR s.appointment_date <= ${to}::date)
    ORDER BY s.appointment_date, s.start_time
  `;
}

export async function loadAppointment(
  sql: Sql,
  bookingId: string,
): Promise<AppointmentRow | null> {
  const rows = await sql<AppointmentRow[]>`
    ${sql.unsafe(APPOINTMENT_SELECT)}
    WHERE b.id = ${bookingId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export type CancelResult = "cancelled" | "not_found" | "not_allowed";

/** The party that cancelled, for notification targeting. */
export type CancelActor = "client" | "lawyer";

/**
 * Cancels an appointment. Only the owning client (`clientAccountId`) or the
 * booked lawyer (`lawyerId`) may cancel, and only while the booking is still
 * live. The slot is released in the same transaction.
 */
export async function cancelAppointment(
  sql: Sql,
  input: { bookingId: string; clientAccountId?: string; lawyerId?: string; reason?: string },
): Promise<CancelResult> {
  return await sql.begin(async (tx) => {
    const rows = await tx<{ id: string; client_account_id: string | null; selected_lawyer_id: string | null; admin_status: string }[]>`
      SELECT id, client_account_id, selected_lawyer_id, admin_status
      FROM public.bahrain_booking_requests
      WHERE id = ${input.bookingId}::uuid
      LIMIT 1
    `;
    const booking = rows[0];
    if (!booking) return "not_found";

    const isOwner =
      input.clientAccountId != null &&
      booking.client_account_id === input.clientAccountId;
    const isLawyer =
      input.lawyerId != null && booking.selected_lawyer_id === input.lawyerId;
    if (!isOwner && !isLawyer) return "not_allowed";

    if (booking.admin_status === "cancelled" || booking.admin_status === "rejected") {
      return "cancelled";
    }
    if (booking.admin_status === "completed") return "not_allowed";

    const reason = input.reason?.trim() || "cancelled_by_" + (isOwner ? "client" : "lawyer");
    const payload = JSON.stringify({ cancellationReason: reason, cancelledAt: new Date().toISOString() });

    await tx`
      UPDATE public.bahrain_booking_requests
      SET admin_status = 'cancelled',
          cancelled_at = COALESCE(cancelled_at, now()),
          request_payload = COALESCE(request_payload, '{}'::jsonb) || ${payload}::jsonb,
          updated_at = now()
      WHERE id = ${input.bookingId}::uuid
    `;
    await tx`
      UPDATE public.bahrain_appointment_slots
      SET status = 'cancelled', updated_at = now()
      WHERE booking_request_id = ${input.bookingId}::uuid
    `;
    return "cancelled";
  });
}
