import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";
import { getMobileClient, rejectCrossOrigin, readJsonBody } from "@/lib/booking/mobileClient";
import { cancelAppointment } from "@/lib/booking/lawyerAvailabilityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ bookingId: string }> };

/** Cancels one of the signed-in client's own appointments. */
export async function DELETE(request: Request, { params }: Context) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;

  const client = await getMobileClient(request);
  if (!client) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { bookingId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return NextResponse.json(
      { ok: false, error: "invalid_input" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let reason: string | undefined;
  try {
    const body = await readJsonBody(request);
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const raw = (body as Record<string, unknown>).reason;
      reason = typeof raw === "string" ? raw.trim().slice(0, 300) : undefined;
    }
  } catch {
    // A body is optional on cancel; an unreadable one is ignored.
  }

  try {
    const result = await cancelAppointment(sqlClient, {
      bookingId,
      clientAccountId: client.id,
      reason,
    });

    if (result === "not_found" || result === "not_allowed") {
      // A client must not be able to probe another account's bookings, so both
      // "missing" and "not yours" answer 404.
      return NextResponse.json(
        { ok: false, error: "not_found" },
        { status: 404, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { ok: true, status: "cancelled" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[mobile/client-appointments] cancel failed", error);
    return NextResponse.json(
      { ok: false, error: "appointments_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
