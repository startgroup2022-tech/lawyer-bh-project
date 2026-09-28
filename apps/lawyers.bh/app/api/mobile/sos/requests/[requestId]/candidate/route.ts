import { NextResponse } from "next/server";
import { validateCoordinates } from "@/lib/sos/live-dispatch";
import { findPaidMobileBooking, getOrSelectCandidate } from "@/lib/sos/live-dispatch-store";
import { computeDrivingRoute } from "@/lib/sos/google-routes";
import { bearerToken, authorizeMobileDispatchToken } from "@/lib/sos/mobile-dispatch-auth";
import { mobilePushSender } from "@/lib/sos/mobile-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISPATCH_ERROR_CODES = new Set([
  "dispatch_request_not_found",
  "dispatch_already_assigned",
  "lawyer_response_pending",
]);

function diagnosticError(error: unknown) {
  const value = error && typeof error === "object"
    ? error as Record<string, unknown>
    : {};
  const detail: Record<string, string> = {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown dispatch failure",
  };
  for (const key of ["code", "severity", "position", "file", "routine"] as const) {
    if (typeof value[key] === "string") detail[key] = value[key];
  }
  return detail;
}

export async function POST(request: Request, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  if (!UUID.test(requestId)) return NextResponse.json({ error: "invalid_request_id" }, { status: 400 });
  if (!await authorizeMobileDispatchToken(requestId, bearerToken(request))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }
  let stage = "find_paid_booking";
  try {
    const booking = await findPaidMobileBooking(requestId);
    if (!booking) return NextResponse.json({ error: "paid_request_not_found" }, { status: 404 });
    let coordinates: { lat:number; lng:number } | undefined;
    if (booking.workflowType !== "direct_consultation") {
      try { coordinates = validateCoordinates({ latitude: Number(body.latitude), longitude: Number(body.longitude) }); }
      catch { return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 }); }
    }
    stage = "select_candidate";
    const customerLocation = coordinates ? {
      ...coordinates,
      accuracy: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : undefined,
      address: typeof body.address === "string" ? body.address.slice(0, 300) : undefined,
    } : undefined;
    const result = await getOrSelectCandidate({ booking, customerLocation });
    const routeMetrics = coordinates && result.candidate && result.candidateLocation
      ? await computeDrivingRoute({
          origin: result.candidateLocation,
          destination: coordinates!,
        })
      : null;
    const fallbackDistanceKm = coordinates && result.candidate
      ? result.candidate.distanceKm
      : null;
    const fallbackEtaMinutes = fallbackDistanceKm == null
      ? null
      : Math.max(1, Math.ceil((fallbackDistanceKm / 30) * 60));
    if (result.candidate) {
      try {
        const sender = await mobilePushSender();
        await sender.sendClientPush({
          eventType: "lawyer_found",
          requestId: result.requestId,
          locale: booking.locale === "en" || booking.locale === "tr" ? booking.locale : "ar",
        });
      } catch (pushError) {
        console.warn("[mobile/sos/candidate] push delivery failed", {
          requestId: result.requestId,
          name: pushError instanceof Error ? pushError.name : "UnknownError",
        });
      }
    }
    return NextResponse.json({
      requestId: result.requestId,
      candidate: result.candidate == null ? null : {
        ...result.candidate,
        etaMinutes: routeMetrics?.etaMinutes ?? fallbackEtaMinutes,
        distanceKm: routeMetrics?.distanceKm ?? fallbackDistanceKm,
      },
    }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const code = DISPATCH_ERROR_CODES.has(message) ? message : "dispatch_failed";
    if (code === "dispatch_already_assigned") {
      return NextResponse.json({ error: code }, { status: 409 });
    }
    console.error("[mobile/sos/candidate] failed", {
      requestId,
      stage,
      ...diagnosticError(error),
    });
    return NextResponse.json({ error: code }, { status: code === "lawyer_response_pending" ? 409 : 500 });
  }
}
