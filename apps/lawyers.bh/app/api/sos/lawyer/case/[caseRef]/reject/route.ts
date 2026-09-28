import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import { requireAdvocateRequest } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const auth = await requireAdvocateRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const { caseRef } = await params;
  const now = new Date();
  const [rejected] = await db
    .update(schema.emergencyRequests)
    .set({ lawyerResponseDeadline: now, updatedAt: now })
    .where(and(
      eq(schema.emergencyRequests.caseRef, caseRef),
      eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
      eq(schema.emergencyRequests.serviceStatus, "pending"),
      isNull(schema.emergencyRequests.assignedLawyerId),
      eq(schema.emergencyRequests.candidateLawyerId, auth.advocate.id),
    ))
    .returning({ id: schema.emergencyRequests.id });
  if (!rejected) {
    return NextResponse.json({ error: "candidate_not_available" }, { status: 409 });
  }
  return NextResponse.json({ caseRef, status: "rejected" });
}
