import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, schema, sqlClient } from "@/lib/db/client";
import { getMobileClient, rejectCrossOrigin, readJsonBody } from "@/lib/booking/mobileClient";
import {
  mapCountryProductAccessError,
  requireCountryProduct,
} from "@/lib/countries/product-access";
import { findConsultationMethod } from "@/lib/booking/consultationMethodCatalog";
import { isValidDate, parseTime } from "@/lib/booking/lawyerAvailability";
import {
  BookingSlotErrorException,
  bookAppointmentSlot,
  listClientAppointments,
} from "@/lib/booking/lawyerAvailabilityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function defaultAssignedEmail() {
  return (
    process.env.PROFESSIONAL_OFFICE_EMAIL ||
    process.env.ADMIN_REQUEST_EMAIL ||
    process.env.POSTMARK_TO_EMAIL ||
    "info@lawyers.bh"
  );
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** The signed-in client's appointments. */
export async function GET(request: Request) {
  const client = await getMobileClient(request);
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const rows = await listClientAppointments(sqlClient, client.id);
    return NextResponse.json(
      {
        ok: true,
        appointments: rows.map((row) => ({
          id: row.booking_id,
          slotId: row.slot_id,
          lawyerId: row.lawyer_id,
          lawyerName: row.lawyer_name,
          date: String(row.appointment_date).slice(0, 10),
          startTime: row.start_time.slice(0, 5),
          endTime: row.end_time.slice(0, 5),
          status: row.status,
          adminStatus: row.admin_status,
          paymentStatus: row.payment_status,
          service: row.service,
          consultationType: row.consultation_type,
          durationMinutes: row.duration_minutes,
          videoProvider: row.video_provider,
          createdAt: row.created_at,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[mobile/client-appointments] list failed", error);
    return NextResponse.json(
      { ok: false, error: "appointments_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

/**
 * Books a slot for the signed-in client.
 *
 * The requested time must be one the lawyer actually published for that date
 * and must still be free — availability is recomputed inside the booking
 * transaction, and the partial unique index on
 * (lawyer_id, appointment_date, start_time) is the final guard, so two clients
 * racing for the same slot cannot both win.
 */
export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const client = await getMobileClient(request);
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await readJsonBody(request);
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const countryCode = (clean(body.countryCode, 2) || "BH").toUpperCase();
  const lawyerId = clean(body.lawyerId, 64);
  const date = clean(body.date, 10);
  const start = clean(body.startTime, 8);
  const end = clean(body.endTime, 8);
  const consultationMethod = clean(body.consultationMethod, 40);
  const notes = clean(body.notes, 500);

  if (!/^[0-9a-f-]{36}$/i.test(lawyerId) || !isValidDate(date)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  if (startMinutes == null || endMinutes == null || startMinutes >= endMinutes) {
    return NextResponse.json(
      { ok: false, error: "invalid_time" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let country;
  try {
    country = await requireCountryProduct(countryCode, "lawyers");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  const [lawyer] = await db
    .select({
      id: schema.bahrainLawyers.id,
      nameAr: schema.bahrainLawyers.fullNameAr,
      nameEn: schema.bahrainLawyers.fullNameEn,
      email: schema.bahrainLawyers.email,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.id, lawyerId),
        eq(schema.bahrainLawyers.countryCode, country.code),
        eq(schema.bahrainLawyers.status, "approved"),
        eq(schema.bahrainLawyers.isActive, true),
      ),
    )
    .limit(1);

  if (!lawyer) {
    return NextResponse.json(
      { ok: false, error: "lawyer_not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const method = await findConsultationMethod(country, consultationMethod);
  if (!method) {
    return NextResponse.json(
      { ok: false, error: "invalid_consultation_method" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const lawyerName = lawyer.nameAr || lawyer.nameEn || "";
  const assignedToEmail = lawyer.email || defaultAssignedEmail();

  let bookingId: string;
  try {
    const rows = await sqlClient<{ id: string }[]>`
      INSERT INTO public.bahrain_booking_requests (
        country_code, lang, service, consultation_type, consultation_method,
        consultation_price, amount_bd, duration_minutes, appointment_date,
        appointment_time, assignment_mode, selected_lawyer_id,
        selected_lawyer_name, assigned_to_email, customer_name, customer_phone,
        customer_email, customer_message, client_account_id, payment_status,
        admin_status, request_payload
      ) VALUES (
        ${country.code}, 'ar', ${method.name.en}, ${method.name.en},
        ${method.code}, ${`${method.price} BD`}, ${String(method.price)},
        ${method.durationMinutes}, ${date}, ${start}, 'lawyer',
        ${lawyer.id}::uuid, ${lawyerName}, ${assignedToEmail}, ${client.fullName},
        ${client.phone}, ${client.email}, ${notes || null}, ${client.id}::uuid,
        'not_required', 'approved',
        ${JSON.stringify({ source: "mobile_app", method: "in_app_slot", clientId: client.id })}::jsonb
      )
      RETURNING id
    `;
    bookingId = rows[0].id;
  } catch (error) {
    console.error("[mobile/client-appointments] booking insert failed", error);
    return NextResponse.json(
      { ok: false, error: "booking_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    await bookAppointmentSlot(sqlClient, {
      countryCode: country.code,
      lawyerId: lawyer.id,
      bookingId,
      date,
      start,
      end,
    });
  } catch (error) {
    // The booking row is useless without a slot; drop it so a retry starts clean.
    await sqlClient`DELETE FROM public.bahrain_booking_requests WHERE id = ${bookingId}::uuid`;

    if (error instanceof BookingSlotErrorException) {
      const status = error.code === "slot_taken" ? 409 : 409;
      return NextResponse.json(
        { ok: false, error: error.code },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[mobile/client-appointments] slot reservation failed", error);
    return NextResponse.json(
      { ok: false, error: "booking_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      appointment: {
        id: bookingId,
        lawyerId: lawyer.id,
        lawyerName,
        date,
        startTime: start,
        endTime: end,
        status: "booked",
        adminStatus: "approved",
        service: method.name.en,
        durationMinutes: method.durationMinutes,
      },
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
