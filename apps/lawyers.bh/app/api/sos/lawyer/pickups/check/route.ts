import { NextResponse } from "next/server";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocateRequest } from "@/lib/sos/lawyerAuth";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

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
  const auth = await requireAdvocateRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  if (auth.advocate.isReviewAccount) {
    return NextResponse.json({
      advocateOnline: false,
      pickups: [],
      activeCases: [],
      completedCases: [],
      now: new Date().toISOString(),
    });
  }

  let productAccessError: string | null = null;
  try {
    await requireCountryProduct(auth.advocate.countryCode, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (!mapped) throw error;
    productAccessError = mapped.body.error;
  }

  const caseFields = {
      id: schema.emergencyRequests.id,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      workflowType: sql<string>`COALESCE((SELECT workflow_type FROM bahrain_emergency_case_types t WHERE (t.id::text=${schema.emergencyRequests.mobilePaymentCaseId} OR (${schema.emergencyRequests.mobilePaymentCaseId} IS NULL AND t.slug=${schema.emergencyRequests.caseType}::text)) AND t.country_code=${schema.emergencyRequests.countryCode} LIMIT 1),'emergency_dispatch')`,
      contactName: schema.emergencyRequests.contactName,
      location: schema.emergencyRequests.location,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      createdAt: schema.emergencyRequests.createdAt,
      completedAt: schema.emergencyRequests.completedTimestamp,
      description: schema.emergencyRequests.description,
    };
  const activeCases = await db
    .select(caseFields)
    .from(schema.emergencyRequests)
    .where(
      and(
        eq(schema.emergencyRequests.assignedLawyerId, auth.advocate.id),
        eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
        inArray(schema.emergencyRequests.serviceStatus, [
          "mobilizing",
          "arrived",
          "in_progress",
        ]),
        eq(schema.emergencyRequests.paymentStatus, "success"),
        eq(schema.emergencyRequests.tapStatus, "CAPTURED"),
      ),
    )
    .orderBy(desc(schema.emergencyRequests.createdAt))
    .limit(20);

  // History belongs to the authenticated lawyer regardless of current availability.
  const completedCases = await db.select(caseFields)
    .from(schema.emergencyRequests)
    .where(and(
      eq(schema.emergencyRequests.assignedLawyerId, auth.advocate.id),
      eq(schema.emergencyRequests.countryCode, auth.advocate.countryCode),
      eq(schema.emergencyRequests.serviceStatus, 'completed'),
    ))
    .orderBy(desc(sql`COALESCE(${schema.emergencyRequests.completedTimestamp}, ${schema.emergencyRequests.createdAt})`), desc(schema.emergencyRequests.id))
    .limit(50);
  const completedCasePayload = completedCases.map(({ createdAt, completedAt, ...item }) => ({
    ...item,
    createdAtIso: createdAt.toISOString(),
    completedAtIso: completedAt?.toISOString() ?? null,
  }));

  const activeCasePayload = activeCases.map((activeCase) => ({
    id: activeCase.id,
    caseRef: activeCase.caseRef,
    caseType: activeCase.caseType,
    workflowType: activeCase.workflowType,
    contactName: activeCase.contactName,
    location: activeCase.location,
    serviceStatus: activeCase.serviceStatus,
    createdAtIso: activeCase.createdAt.toISOString(),
  }));

  if (productAccessError) {
    return NextResponse.json({
      error: productAccessError,
      advocateOnline: false,
      pickups: [],
      activeCases: activeCasePayload,
      completedCases: completedCasePayload,
      now: new Date().toISOString(),
    });
  }

  if (activeCases.length > 0 || !auth.advocate.isEmergencyReady || !auth.advocate.locationSharingEnabled) {
    return NextResponse.json({
      advocateOnline: false,
      pickups: [],
      activeCases: activeCasePayload,
      completedCases: completedCasePayload,
      now: new Date().toISOString(),
    });
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
    eq(schema.emergencyRequests.paymentStatus, "success"),
    eq(schema.emergencyRequests.tapStatus, "CAPTURED"),
    isNull(schema.emergencyRequests.assignedLawyerId),
    eq(schema.emergencyRequests.candidateLawyerId, auth.advocate.id),
    isNotNull(schema.emergencyRequests.customerApprovedAt),
    gt(schema.emergencyRequests.lawyerResponseDeadline, new Date()),
  );
  const rowsRaw = await db
    .select({
      id: schema.emergencyRequests.id,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      location: schema.emergencyRequests.location,
      baseFeeBhd: schema.emergencyRequests.baseFeeBhd,
      createdAt: schema.emergencyRequests.createdAt,
      lawyerResponseDeadline:
        schema.emergencyRequests.lawyerResponseDeadline,
    })
    .from(schema.emergencyRequests)
    .where(
      since && !isNaN(since.getTime())
        ? and(baseClause, gt(schema.emergencyRequests.createdAt, since))
        : baseClause,
    )
    .orderBy(desc(schema.emergencyRequests.createdAt))
    .limit(20);

  const pickups = rowsRaw;

  return NextResponse.json({
    advocateOnline: true,
    now: new Date().toISOString(),
    activeCases: activeCasePayload,
    completedCases: completedCasePayload,
    pickups: pickups.map((p) => ({
      id: p.id,
      caseRef: p.caseRef,
      caseType: p.caseType,
      baseFeeBhd: Number(p.baseFeeBhd),
      createdAtIso: p.createdAt.toISOString(),
      lawyerResponseDeadlineIso:
        p.lawyerResponseDeadline?.toISOString() ?? null,
    })),
  });
}
