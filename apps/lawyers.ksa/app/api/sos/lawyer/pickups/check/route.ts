import { NextResponse } from "next/server";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";
import { haversineKm } from "@/lib/sos/geo";
import { getOnShiftAdvocateIds } from "@/lib/sos/shifts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Foreground polling endpoint for the lawyer dashboard. The client
 *  passes the most recent caseRef-or-timestamp it has already seen,
 *  and we return any unassigned pending cases newer than that which
 *  fall inside the advocate's radius. The dashboard rings a siren
 *  for each new entry — covers the iOS WebView case where Web Push
 *  isn't supported by Apple.
 *
 *  The advocate must be both authenticated and currently
 *  emergency-ready for this endpoint to surface pickups; otherwise
 *  it returns an empty list (so the polling loop is a no-op when
 *  the advocate has gone offline).
 */
export async function GET(req: Request) {
  const auth = await requireAdvocate();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  // Either the manual toggle is on OR this advocate is in a declared
  // shift right now. Otherwise the polling loop is a no-op.
  let onShift = false;
  if (!auth.advocate.isEmergencyReady) {
    const onShiftIds = await getOnShiftAdvocateIds(auth.advocate.countryCode);
    onShift = onShiftIds.has(auth.advocate.id);
    if (!onShift) {
      return NextResponse.json({
        advocateOnline: false,
        pickups: [],
        now: new Date().toISOString(),
      });
    }
  }

  const url = new URL(req.url);
  const sinceParam = url.searchParams.get("since");
  // First poll: client passes nothing → we still return current
  // pickups so the dashboard initialises its "seen" set without
  // ringing the siren. The client uses the `now` value we return
  // as `since` on the next poll.
  const since = sinceParam ? new Date(sinceParam) : null;

  const baseClause = and(
    eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
    eq(schema.emergencyRequests.serviceStatus, "pending"),
    isNull(schema.emergencyRequests.assignedLawyerId),
  );
  const rowsRaw = await db
    .select({
      id: schema.emergencyRequests.id,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      location: schema.emergencyRequests.location,
      baseFee: schema.emergencyRequests.baseFee,
      createdAt: schema.emergencyRequests.createdAt,
    })
    .from(schema.emergencyRequests)
    .where(
      since && !isNaN(since.getTime())
        ? and(baseClause, gt(schema.emergencyRequests.createdAt, since))
        : baseClause,
    )
    .orderBy(desc(schema.emergencyRequests.createdAt))
    .limit(20);

  const pickups = rowsRaw
    .map((r) => {
      const distance =
        r.location && auth.advocate.baseLocation
          ? haversineKm(r.location, auth.advocate.baseLocation)
          : null;
      return { ...r, distanceKm: distance };
    })
    .filter(
      (p) =>
        p.distanceKm == null ||
        p.distanceKm <= auth.advocate.emergencyRadiusKm,
    );

  return NextResponse.json({
    advocateOnline: true,
    now: new Date().toISOString(),
    pickups: pickups.map((p) => ({
      id: p.id,
      caseRef: p.caseRef,
      caseType: p.caseType,
      baseFee: Number(p.baseFee),
      distanceKm: p.distanceKm != null ? Number(p.distanceKm.toFixed(2)) : null,
      createdAtIso: p.createdAt.toISOString(),
    })),
  });
}
