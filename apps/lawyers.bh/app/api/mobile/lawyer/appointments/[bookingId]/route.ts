import { sqlClient } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { lawyerJson, readLawyerJson, rejectCrossOrigin } from "@/lib/booking/mobileLawyerHttp";
import { cancelAppointment } from "@/lib/booking/lawyerAvailabilityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> };

/** Cancels an appointment the lawyer is assigned to. */
export async function DELETE(request: Request, { params }: Context) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const session = await getMobileLawyerSession(request);
  if (!session) return lawyerJson({ ok: false, error: "unauthorized" }, 401);

  const { bookingId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return lawyerJson({ ok: false, error: "invalid_input" }, 400);
  }

  let reason: string | undefined;
  try {
    const body = await readLawyerJson(request);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const raw = (body as Record<string, unknown>).reason;
      reason = typeof raw === "string" ? raw.trim().slice(0, 300) : undefined;
    }
  } catch {
    // Body is optional on cancel.
  }

  try {
    const result = await cancelAppointment(sqlClient, {
      bookingId,
      lawyerId: session.lawyerId,
      reason,
    });

    if (result === "not_found" || result === "not_allowed") {
      return lawyerJson({ ok: false, error: "not_found" }, 404);
    }
    return lawyerJson({ ok: true, status: "cancelled" });
  } catch (error) {
    console.error("[mobile/lawyer/appointments] cancel failed", error);
    return lawyerJson({ ok: false, error: "appointments_unavailable" }, 503);
  }
}
