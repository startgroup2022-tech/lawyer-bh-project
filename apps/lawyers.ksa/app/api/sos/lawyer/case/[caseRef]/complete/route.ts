import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Advocate marks the case complete. Allowed from either `arrived`
 *  (normal happy path — geofence already verified) or `mobilizing`
 *  (advocate finished by phone before physically arriving). Either
 *  way the advocate has to be the assigned advocate. */
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
  if (
    row.serviceStatus !== "arrived" &&
    row.serviceStatus !== "mobilizing"
  ) {
    return NextResponse.json(
      { error: "invalid_transition", from: row.serviceStatus },
      { status: 409 },
    );
  }

  await db
    .update(schema.emergencyRequests)
    .set({
      serviceStatus: "completed",
      completedTimestamp: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.emergencyRequests.id, row.id),
        eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
      ),
    );

  return NextResponse.json({ caseRef, status: "completed" });
}
