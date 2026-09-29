import { NextResponse } from "next/server";

import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { sqlClient } from "@/lib/db/client";
import { replaceAvailability, loadAvailability } from "@/lib/booking/lawyerAvailabilityStore";
import { formatTime, validateAvailabilityPayload } from "@/lib/booking/lawyerAvailability";
import type { AvailabilityWindow } from "@/lib/booking/lawyerAvailability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function crossOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return noStore({ ok: false, error: "forbidden" }, 403);
  }
  return null;
}

function toWireWindow(window: AvailabilityWindow) {
  return {
    weekday: window.weekday,
    start_time: formatTime(window.start),
    end_time: formatTime(window.end),
    slot_duration_minutes: window.slotDurationMinutes,
    consultation_type: window.consultationType,
  };
}

/** The lawyer's own weekly availability grid. */
export async function GET(request: Request) {
  const session = await getMobileLawyerSession(request);
  if (!session) return noStore({ ok: false, error: "unauthorized" }, 401);

  const windows = await loadAvailability(sqlClient, session.lawyerId);
  return noStore({
    ok: true,
    availability: windows.map(toWireWindow),
  });
}

/**
 * Replaces the whole weekly grid. The Flutter availability screen edits the
 * week in memory and PUTs it as one payload, so this is a full replacement.
 */
export async function PUT(request: Request) {
  const blocked = crossOrigin(request);
  if (blocked) return blocked;

  const session = await getMobileLawyerSession(request);
  if (!session) return noStore({ ok: false, error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore({ ok: false, error: "invalid_input" }, 400);
  }

  const raw = body && typeof body === "object" && !Array.isArray(body)
    ? (body as Record<string, unknown>).availability ?? (body as Record<string, unknown>).slots
    : body;

  const validated = validateAvailabilityPayload(raw);
  if (!validated.ok) return noStore({ ok: false, error: validated.error }, 400);

  try {
    const windows = await replaceAvailability(sqlClient, {
      countryCode: session.countryCode,
      lawyerId: session.lawyerId,
      windows: validated.windows,
    });
    return noStore({
      ok: true,
      availability: windows.map(toWireWindow),
    });
  } catch (error) {
    console.error("[mobile/lawyer/availability] save failed", error);
    return noStore({ ok: false, error: "availability_unavailable" }, 503);
  }
}
