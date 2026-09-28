import { setRequestLocale } from "next-intl/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getCaseTypeBySlug } from "@/lib/sos/caseTypes";
import DispatchBoard from "./DispatchBoard";

// Auth for this route is enforced by the middleware in proxy.ts which
// requires HTTP basic auth (DISPATCH_USERNAME / DISPATCH_PASSWORD).
// By the time the page renders we know the request is authorised.

export const dynamic = "force-dynamic";

export default async function DispatchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Show every request that isn't already closed; oldest active first.
  const rows = await db
    .select({
      id: schema.emergencyRequests.id,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      contactName: schema.emergencyRequests.contactName,
      contactPhone: schema.emergencyRequests.contactPhone,
      contactIdNumber: schema.emergencyRequests.contactIdNumber,
      description: schema.emergencyRequests.description,
      location: schema.emergencyRequests.location,
      baseFeeBhd: schema.emergencyRequests.baseFeeBhd,
      paymentStatus: schema.emergencyRequests.paymentStatus,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      responseTimestamp: schema.emergencyRequests.responseTimestamp,
      arrivalTimestamp: schema.emergencyRequests.arrivalTimestamp,
      completedTimestamp: schema.emergencyRequests.completedTimestamp,
      ratingStars: schema.emergencyRequests.ratingStars,
      ratingComment: schema.emergencyRequests.ratingComment,
      consentId: schema.emergencyRequests.consentId,
      locale: schema.emergencyRequests.locale,
      createdAt: schema.emergencyRequests.createdAt,
      dispatchActorLog: schema.emergencyRequests.dispatchActorLog,
      internalNotes: schema.emergencyRequests.internalNotes,
      cancellationReason: schema.emergencyRequests.cancellationReason,
      refundStatus: schema.emergencyRequests.refundStatus,
      refundAmountBhd: schema.emergencyRequests.refundAmountBhd,
      refundRef: schema.emergencyRequests.refundRef,
      refundMarkedAt: schema.emergencyRequests.refundMarkedAt,
      refundMarkedBy: schema.emergencyRequests.refundMarkedBy,
    })
    .from(schema.emergencyRequests)
    .orderBy(desc(schema.emergencyRequests.createdAt))
    .limit(200);

  const cases = rows.map((r) => {
    const ct = getCaseTypeBySlug(r.caseType);
    return {
      ...r,
      // Serialise dates so the client component receives plain JSON.
      createdAtIso: r.createdAt.toISOString(),
      responseTsIso: r.responseTimestamp?.toISOString() ?? null,
      arrivalTsIso: r.arrivalTimestamp?.toISOString() ?? null,
      completedTsIso: r.completedTimestamp?.toISOString() ?? null,
      caseTypeLabel: ct?.label ?? { en: r.caseType, ar: r.caseType },
      baseFeeBhd: Number(r.baseFeeBhd),
      dispatchActorLog: r.dispatchActorLog ?? [],
      internalNotes: r.internalNotes ?? [],
      cancellationReason: r.cancellationReason ?? null,
      refundStatus: r.refundStatus,
      refundAmountBhd: r.refundAmountBhd != null ? Number(r.refundAmountBhd) : null,
      refundRef: r.refundRef,
      refundMarkedAtIso: r.refundMarkedAt?.toISOString() ?? null,
      refundMarkedBy: r.refundMarkedBy,
    };
  });

  return <DispatchBoard cases={cases} />;
}
