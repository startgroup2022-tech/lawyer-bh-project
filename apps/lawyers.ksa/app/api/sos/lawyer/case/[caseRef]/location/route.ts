import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocate } from "@/lib/sos/lawyerAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  location: { lat: number; lng: number; accuracy?: number };
}

/** Advocate streams their current GPS while a case is in `mobilizing`
 *  status. The client confirmation page polls /api/sos/status to render
 *  a live ETA. Updates are accepted only on cases assigned to the
 *  authenticated advocate, and only while the case is mobilizing
 *  (no point continuing to track post-arrival). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const auth = await requireAdvocate();
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
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
    return NextResponse.json({ error: "invalid_location" }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: schema.emergencyRequests.id,
      assignedLawyerId: schema.emergencyRequests.assignedLawyerId,
      serviceStatus: schema.emergencyRequests.serviceStatus,
    })
    .from(schema.emergencyRequests)
    .where(
      and(
        eq(schema.emergencyRequests.caseRef, caseRef),
        eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
      ),
    )
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (row.assignedLawyerId !== auth.advocate.id) {
    return NextResponse.json({ error: "not_your_case" }, { status: 403 });
  }
  if (row.serviceStatus !== "mobilizing") {
    return NextResponse.json(
      { error: "not_mobilizing", status: row.serviceStatus },
      { status: 409 },
    );
  }

  await db
    .update(schema.emergencyRequests)
    .set({
      lastAdvocateLocation: {
        lat: body.location.lat,
        lng: body.location.lng,
        accuracy: body.location.accuracy,
        reportedAt: new Date().toISOString(),
      },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.emergencyRequests.id, row.id),
        eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
      ),
    );

  return NextResponse.json({ caseRef, status: "ok" });
}
