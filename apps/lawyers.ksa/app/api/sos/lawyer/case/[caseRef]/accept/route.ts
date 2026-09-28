import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";
import { haversineKm } from "@/lib/sos/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lets a logged-in advocate self-accept a pending case. Either the
 *  case must be unassigned (so they're picking it up from the queue)
 *  or already assigned to them by dispatch. The case must also be
 *  inside their emergency radius — server enforces this even though
 *  the dashboard already filters by it. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const auth = await requireAdvocate();
  if (!auth.ok) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { caseRef } = await params;

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

  if (row.serviceStatus !== "pending") {
    return NextResponse.json(
      { error: "invalid_transition", from: row.serviceStatus },
      { status: 409 },
    );
  }
  if (row.assignedLawyerId && row.assignedLawyerId !== auth.advocate.id) {
    return NextResponse.json(
      { error: "already_assigned" },
      { status: 409 },
    );
  }

  // Geographic eligibility: case must be within the advocate's radius.
  if (row.location && auth.advocate.baseLocation) {
    const distance = haversineKm(row.location, auth.advocate.baseLocation);
    if (distance > auth.advocate.emergencyRadiusKm) {
      return NextResponse.json(
        { error: "out_of_range", distanceKm: distance },
        { status: 403 },
      );
    }
  }

  await db
    .update(schema.emergencyRequests)
    .set({
      assignedLawyerId: auth.advocate.id,
      serviceStatus: "mobilizing",
      responseTimestamp: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.emergencyRequests.id, row.id),
        eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
        eq(schema.emergencyRequests.serviceStatus, "pending"),
      ),
    );

  return NextResponse.json({ caseRef, status: "mobilizing" });
}
