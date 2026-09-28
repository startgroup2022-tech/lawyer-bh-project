import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocateRequest } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only the assigned advocate can complete an in-progress service. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const auth = await requireAdvocateRequest(_req);
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
    row.serviceStatus !== "in_progress"
  ) {
    return NextResponse.json(
      { error: "invalid_transition", from: row.serviceStatus },
      { status: 409 },
    );
  }

  const [completed] = await db
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
        eq(schema.emergencyRequests.assignedLawyerId, auth.advocate.id),
        eq(schema.emergencyRequests.serviceStatus, "in_progress"),
      ),
    ).returning({id:schema.emergencyRequests.id});
  if (!completed) return NextResponse.json({error:'invalid_transition'},{status:409});

  return NextResponse.json({ caseRef, status: "completed" });
}
