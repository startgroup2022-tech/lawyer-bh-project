import { sqlClient } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { lawyerJson } from "@/lib/booking/mobileLawyerHttp";
import { isValidDate } from "@/lib/booking/lawyerAvailability";
import { listLawyerAppointments } from "@/lib/booking/lawyerAvailabilityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function wire(row: Awaited<ReturnType<typeof listLawyerAppointments>>[number]) {
  return {
    id: row.booking_id,
    slotId: row.slot_id,
    clientName: row.customer_name,
    clientPhone: row.customer_phone,
    clientEmail: row.customer_email,
    date: String(row.appointment_date).slice(0, 10),
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    adminStatus: row.admin_status,
    paymentStatus: row.payment_status,
    service: row.service,
    consultationType: row.consultation_type,
    durationMinutes: row.duration_minutes,
    videoProvider: row.video_provider,
  };
}

/** The signed-in lawyer's appointments, optionally bounded by a date range. */
export async function GET(request: Request) {
  const session = await getMobileLawyerSession(request);
  if (!session) return lawyerJson({ ok: false, error: "unauthorized" }, 401);

  const params = new URL(request.url).searchParams;
  const from = (params.get("from") || "").trim();
  const to = (params.get("to") || "").trim();

  if ((from && !isValidDate(from)) || (to && !isValidDate(to))) {
    return lawyerJson({ ok: false, error: "invalid_date" }, 400);
  }

  try {
    const rows = await listLawyerAppointments(sqlClient, {
      lawyerId: session.lawyerId,
      from: from || undefined,
      to: to || undefined,
    });
    return lawyerJson({ ok: true, appointments: rows.map(wire) });
  } catch (error) {
    console.error("[mobile/lawyer/appointments] list failed", error);
    return lawyerJson({ ok: false, error: "appointments_unavailable" }, 503);
  }
}
