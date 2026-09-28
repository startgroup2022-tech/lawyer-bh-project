import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { requireAdvocateRequest } from "@/lib/sos/lawyerAuth";
import { ensureEmergencyAllocation } from "@/lib/sos/emergency-allocation";
import { isServerConfirmedPaid } from "@/lib/sos/lawyer-request-eligibility";
import { mobilePushSender } from "@/lib/sos/mobile-push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Lets a logged-in advocate self-accept a pending case. Either the
 *  case must be unassigned (so they're picking it up from the queue)
 *  or already assigned to them by dispatch. The case must also be
 *  inside their emergency radius — server enforces this even though
 *  the dashboard already filters by it. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseRef: string }> },
) {
  const auth = await requireAdvocateRequest(request);
  if (!auth.ok) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (auth.advocate.isReviewAccount) {
    return NextResponse.json({ error: "review_account_isolated" }, { status: 409 });
  }
  const { caseRef } = await params;

  const [row] = await db
    .select({
      id: schema.emergencyRequests.id,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      assignedLawyerId: schema.emergencyRequests.assignedLawyerId,
      candidateLawyerId: schema.emergencyRequests.candidateLawyerId,
      customerApprovedAt: schema.emergencyRequests.customerApprovedAt,
      lawyerResponseDeadline: schema.emergencyRequests.lawyerResponseDeadline,
      paymentStatus: schema.emergencyRequests.paymentStatus,
      tapStatus: schema.emergencyRequests.tapStatus,
      tapChargeId: schema.emergencyRequests.tapChargeId,
      paymentRef: schema.emergencyRequests.paymentRef,
      baseFeeBhd: schema.emergencyRequests.baseFeeBhd,
      locale: schema.emergencyRequests.locale,
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

  if (!isServerConfirmedPaid(row)) {
    return NextResponse.json({ error: "payment_required" }, { status: 409 });
  }

  if (
    row.serviceStatus === "mobilizing" &&
    row.assignedLawyerId === auth.advocate.id &&
    row.paymentStatus === "success" &&
    (row.tapChargeId || row.paymentRef)
  ) {
    await ensureEmergencyAllocation({
      emergencyRequestId: row.id,
      lawyerId: auth.advocate.id,
      countryCode: auth.advocate.countryCode,
      tapChargeId: row.tapChargeId || row.paymentRef!,
      grossAmount: Number(row.baseFeeBhd),
    });
    return NextResponse.json({ caseRef, status: "mobilizing", repaired: true });
  }

  if (row.serviceStatus !== "pending") {
    return NextResponse.json(
      { error: "invalid_transition", from: row.serviceStatus },
      { status: 409 },
    );
  }
  if (
    row.assignedLawyerId ||
    row.candidateLawyerId !== auth.advocate.id ||
    !row.customerApprovedAt ||
    !row.lawyerResponseDeadline ||
    row.lawyerResponseDeadline.getTime() <= Date.now()
  ) {
    return NextResponse.json(
      { error: "candidate_not_available" },
      { status: 409 },
    );
  }

  let lawyerBusy = false;
  const [accepted] = await db
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
        isNull(schema.emergencyRequests.assignedLawyerId),
        eq(schema.emergencyRequests.candidateLawyerId, auth.advocate.id),
        eq(schema.emergencyRequests.paymentStatus, "success"),
        eq(schema.emergencyRequests.tapStatus, "CAPTURED"),
        gt(schema.emergencyRequests.lawyerResponseDeadline, new Date()),
      ),
    )
    .returning({ id: schema.emergencyRequests.id }).catch((error: unknown) => {
      const failure = error as {code?:string;constraint_name?:string;cause?:{code?:string;constraint_name?:string}};
      const detail = failure.cause ?? failure;
      if (detail.code === '23505' && detail.constraint_name === 'bahrain_emergency_one_active_lawyer') {
        lawyerBusy = true;
        return [];
      }
      throw error;
    });

  if (!accepted) {
    return NextResponse.json({ error: lawyerBusy ? "lawyer_busy" : "candidate_not_available" }, { status: 409 });
  }

  if (row.paymentStatus === "success" && (row.tapChargeId || row.paymentRef)) {
    await ensureEmergencyAllocation({
      emergencyRequestId: row.id,
      lawyerId: auth.advocate.id,
      countryCode: auth.advocate.countryCode,
      tapChargeId: row.tapChargeId || row.paymentRef!,
      grossAmount: Number(row.baseFeeBhd),
    });
  }

  try {
    const sender = await mobilePushSender();
    await sender.sendClientPush({
      eventType: "lawyer_accepted",
      requestId: row.id,
      locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
    });
  } catch (error) {
    console.warn("[sos/lawyer/accept] push delivery failed", {
      requestId: row.id,
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return NextResponse.json({ caseRef, status: "mobilizing" });
}
