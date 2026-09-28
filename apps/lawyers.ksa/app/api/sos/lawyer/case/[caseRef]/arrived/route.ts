import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";
import { haversineKm } from "@/lib/sos/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Maximum distance in metres between advocate's reported GPS and the
 *  request location for the arrival to count. Tightening this reduces
 *  fraud (advocate can't claim arrival from elsewhere) at the cost of
 *  GPS accuracy noise. 300 m is a pragmatic sweet spot for street
 *  level matching with consumer-grade GPS. */
const ARRIVAL_GEOFENCE_METRES = 300;

interface Body {
  /** Advocate's GPS at the moment they're claiming arrival. */
  location: { lat: number; lng: number; accuracy?: number };
}

/** Geofenced arrival validation. The advocate must be the assigned
 *  advocate, the case must be `mobilizing`, and the advocate's GPS
 *  must be within ARRIVAL_GEOFENCE_METRES of the request location.
 *  Otherwise we reject with 403 — protecting the "earned fee" clause
 *  in the SOS Service Agreement which only triggers on real arrival. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const auth = await requireAdvocate();
  if (!auth.ok) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { caseRef } = await params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (
    !body.location ||
    !Number.isFinite(body.location.lat) ||
    !Number.isFinite(body.location.lng)
  ) {
    return NextResponse.json({ error: "missing_location" }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: schema.emergencyRequests.id,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      assignedLawyerId: schema.emergencyRequests.assignedLawyerId,
      location: schema.emergencyRequests.location,
    })
    .from(schema.emergencyRequests)
    .where(
      and(
        eq(schema.emergencyRequests.caseRef, caseRef),
        eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
      ),
    )
    .limit(1);
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.assignedLawyerId !== auth.advocate.id) {
    return NextResponse.json({ error: "not_your_case" }, { status: 403 });
  }
  if (row.serviceStatus !== "mobilizing") {
    return NextResponse.json(
      { error: "invalid_transition", from: row.serviceStatus },
      { status: 409 },
    );
  }
  if (!row.location) {
    return NextResponse.json(
      { error: "request_has_no_location" },
      { status: 409 },
    );
  }

  const distanceKm = haversineKm(row.location, body.location);
  const distanceMeters = distanceKm * 1000;
  if (distanceMeters > ARRIVAL_GEOFENCE_METRES) {
    return NextResponse.json(
      {
        error: "geofence_failed",
        distanceMeters: Math.round(distanceMeters),
        requiredMeters: ARRIVAL_GEOFENCE_METRES,
      },
      { status: 403 },
    );
  }

  await db
    .update(schema.emergencyRequests)
    .set({
      serviceStatus: "arrived",
      arrivalTimestamp: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.emergencyRequests.id, row.id),
        eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
        eq(schema.emergencyRequests.serviceStatus, "mobilizing"),
      ),
    );

  return NextResponse.json({
    caseRef,
    status: "arrived",
    distanceMeters: Math.round(distanceMeters),
  });
}
