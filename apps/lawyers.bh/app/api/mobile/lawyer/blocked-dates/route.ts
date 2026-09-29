import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";
import { getMobileLawyerSession } from "@/lib/mobile-lawyer-auth";
import { isValidDate, parseTime } from "@/lib/booking/lawyerAvailability";
import {
  createBlockedDate,
  deleteBlockedDate,
  listBlockedDateRows,
} from "@/lib/booking/lawyerAvailabilityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REASON_TYPES = ["vacation", "holiday", "court", "personal", "other"] as const;

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

function toWire(row: {
  id: string;
  blocked_date: string;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason_type: string;
  reason: string | null;
}) {
  return {
    id: row.id,
    date: String(row.blocked_date).slice(0, 10),
    allDay: row.all_day === true,
    startTime: row.all_day ? null : row.start_time,
    endTime: row.all_day ? null : row.end_time,
    reasonType: row.reason_type,
    reason: row.reason,
  };
}

/** The lawyer's blocked dates/periods. */
export async function GET(request: Request) {
  const session = await getMobileLawyerSession(request);
  if (!session) return noStore({ ok: false, error: "unauthorized" }, 401);

  const rows = await listBlockedDateRows(sqlClient, session.lawyerId);
  return noStore({ ok: true, blockedDates: rows.map(toWire) });
}

/** Blocks a date, either the whole day or a time range inside it. */
export async function POST(request: Request) {
  const blockedCrossOrigin = crossOrigin(request);
  if (blockedCrossOrigin) return blockedCrossOrigin;

  const session = await getMobileLawyerSession(request);
  if (!session) return noStore({ ok: false, error: "unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    const parsed = await request.json();
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return noStore({ ok: false, error: "invalid_input" }, 400);
  }

  const date = typeof body.date === "string" ? body.date.trim() : "";
  if (!isValidDate(date)) return noStore({ ok: false, error: "invalid_date" }, 400);

  const allDay = body.allDay !== false;
  const start = typeof body.startTime === "string" ? body.startTime.trim() : null;
  const end = typeof body.endTime === "string" ? body.endTime.trim() : null;

  if (!allDay) {
    const startMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    if (startMinutes == null || endMinutes == null || startMinutes >= endMinutes) {
      return noStore({ ok: false, error: "invalid_time" }, 400);
    }
  }

  const reasonTypeRaw = typeof body.reasonType === "string" ? body.reasonType.trim() : "other";
  const reasonType = (REASON_TYPES as readonly string[]).includes(reasonTypeRaw)
    ? reasonTypeRaw
    : "other";
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : null;

  try {
    const id = await createBlockedDate(sqlClient, {
      countryCode: session.countryCode,
      lawyerId: session.lawyerId,
      date,
      allDay,
      start: allDay ? null : start,
      end: allDay ? null : end,
      reasonType,
      reason: reason || null,
    });
    return noStore({ ok: true, id }, 201);
  } catch (error) {
    console.error("[mobile/lawyer/blocked-dates] create failed", error);
    return noStore({ ok: false, error: "blocked_dates_unavailable" }, 503);
  }
}

/** Removes one of the lawyer's own blocked dates. */
export async function DELETE(request: Request) {
  const blockedCrossOrigin = crossOrigin(request);
  if (blockedCrossOrigin) return blockedCrossOrigin;

  const session = await getMobileLawyerSession(request);
  if (!session) return noStore({ ok: false, error: "unauthorized" }, 401);

  const id = (new URL(request.url).searchParams.get("id") || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return noStore({ ok: false, error: "invalid_input" }, 400);
  }

  try {
    const removed = await deleteBlockedDate(sqlClient, session.lawyerId, id);
    if (!removed) return noStore({ ok: false, error: "not_found" }, 404);
    return noStore({ ok: true });
  } catch (error) {
    console.error("[mobile/lawyer/blocked-dates] delete failed", error);
    return noStore({ ok: false, error: "blocked_dates_unavailable" }, 503);
  }
}
