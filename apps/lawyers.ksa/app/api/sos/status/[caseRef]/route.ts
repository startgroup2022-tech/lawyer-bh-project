import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { haversineKm } from "@/lib/sos/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Average city driving speed used to turn distance-as-the-crow-flies
 *  into a rough ETA. We're not Google Maps — we just want a realistic
 *  number for the client's "on the way" status. */
const ETA_AVG_KMH = 35;

/** Public status polling endpoint. The case ref is treated as the
 *  authorisation token in v2 — possession of it is enough to read
 *  status. The confirmation page polls this every 5 seconds while
 *  the case is open. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const { caseRef } = await params;
  const [row] = await db
    .select({
      caseRef: schema.emergencyRequests.caseRef,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      paymentStatus: schema.emergencyRequests.paymentStatus,
      ratingStars: schema.emergencyRequests.ratingStars,
      responseTimestamp: schema.emergencyRequests.responseTimestamp,
      arrivalTimestamp: schema.emergencyRequests.arrivalTimestamp,
      completedTimestamp: schema.emergencyRequests.completedTimestamp,
      location: schema.emergencyRequests.location,
      lastAdvocateLocation: schema.emergencyRequests.lastAdvocateLocation,
      assignedLawyerId: schema.emergencyRequests.assignedLawyerId,
    })
    .from(schema.emergencyRequests)
    .where(eq(schema.emergencyRequests.caseRef, caseRef))
    .limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Compute live ETA only while mobilizing — otherwise the data is
  // stale (advocate already arrived or case is closed).
  let etaMinutes: number | null = null;
  let distanceKm: number | null = null;
  if (
    row.serviceStatus === "mobilizing" &&
    row.location &&
    row.lastAdvocateLocation
  ) {
    distanceKm = haversineKm(row.location, row.lastAdvocateLocation);
    etaMinutes = Math.max(1, Math.round((distanceKm / ETA_AVG_KMH) * 60));
  }

  return NextResponse.json(
    {
      caseRef: row.caseRef,
      serviceStatus: row.serviceStatus,
      paymentStatus: row.paymentStatus,
      hasRating: row.ratingStars != null,
      hasAssignedAdvocate: row.assignedLawyerId != null,
      responseTsIso: row.responseTimestamp?.toISOString() ?? null,
      arrivalTsIso: row.arrivalTimestamp?.toISOString() ?? null,
      completedTsIso: row.completedTimestamp?.toISOString() ?? null,
      // Live tracking — only emitted while the advocate is en route.
      advocateLocation:
        row.serviceStatus === "mobilizing"
          ? row.lastAdvocateLocation
          : null,
      distanceKm: distanceKm != null ? Number(distanceKm.toFixed(2)) : null,
      etaMinutes,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
