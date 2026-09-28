import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getCurrentAdvocate } from "@/lib/sos/lawyerAuth";
import { haversineKm } from "@/lib/sos/geo";
import { getCaseTypeBySlug } from "@/lib/sos/caseTypes";
import Dashboard from "./Dashboard";

export const dynamic = "force-dynamic";

export default async function LawyerDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const advocate = await getCurrentAdvocate();
  if (!advocate) redirect(`/${locale}/sos/lawyer/login`);

  // Pull cases the advocate is already assigned to (any status), and
  // pending cases that are unassigned (potential pickups). Filter the
  // pickups by radius client-side after the query so we don't need a
  // PostGIS extension just for the haversine.
  const myActive = await db
    .select({
      id: schema.emergencyRequests.id,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      contactName: schema.emergencyRequests.contactName,
      contactPhone: schema.emergencyRequests.contactPhone,
      description: schema.emergencyRequests.description,
      location: schema.emergencyRequests.location,
      baseFee: schema.emergencyRequests.baseFee,
      paymentStatus: schema.emergencyRequests.paymentStatus,
      serviceStatus: schema.emergencyRequests.serviceStatus,
      responseTimestamp: schema.emergencyRequests.responseTimestamp,
      arrivalTimestamp: schema.emergencyRequests.arrivalTimestamp,
      completedTimestamp: schema.emergencyRequests.completedTimestamp,
      createdAt: schema.emergencyRequests.createdAt,
    })
    .from(schema.emergencyRequests)
    .where(
      and(
        eq(schema.emergencyRequests.assignedLawyerId, advocate.id),
        eq(schema.emergencyRequests.countryCode, advocate.countryCode),
      ),
    )
    .orderBy(desc(schema.emergencyRequests.createdAt))
    .limit(50);

  const pickupsRaw = await db
    .select({
      id: schema.emergencyRequests.id,
      caseRef: schema.emergencyRequests.caseRef,
      caseType: schema.emergencyRequests.caseType,
      description: schema.emergencyRequests.description,
      location: schema.emergencyRequests.location,
      baseFee: schema.emergencyRequests.baseFee,
      createdAt: schema.emergencyRequests.createdAt,
    })
    .from(schema.emergencyRequests)
    .where(
      and(
        eq(schema.emergencyRequests.serviceStatus, "pending"),
        eq(schema.emergencyRequests.countryCode, advocate.countryCode),
        isNull(schema.emergencyRequests.assignedLawyerId),
      ),
    )
    .orderBy(desc(schema.emergencyRequests.createdAt))
    .limit(50);

  const pickups = pickupsRaw
    .map((p) => {
      const distance =
        p.location && advocate.baseLocation
          ? haversineKm(p.location, advocate.baseLocation)
          : null;
      return { ...p, distanceKm: distance };
    })
    .filter(
      (p) =>
        p.distanceKm == null || p.distanceKm <= advocate.emergencyRadiusKm,
    );

  return (
    <Dashboard
      advocate={{
        id: advocate.id,
        fullName: advocate.fullName,
        registrationNo: advocate.registrationNo,
        email: advocate.email,
        phone: advocate.phone,
        isEmergencyReady: advocate.isEmergencyReady,
        emergencyRadiusKm: advocate.emergencyRadiusKm,
      }}
      myCases={myActive.map((c) => ({
        ...c,
        caseTypeLabel:
          getCaseTypeBySlug(c.caseType)?.label ?? {
            en: c.caseType,
            ar: c.caseType,
          },
        baseFee: Number(c.baseFee),
        createdAtIso: c.createdAt.toISOString(),
        responseTsIso: c.responseTimestamp?.toISOString() ?? null,
        arrivalTsIso: c.arrivalTimestamp?.toISOString() ?? null,
        completedTsIso: c.completedTimestamp?.toISOString() ?? null,
      }))}
      pickups={pickups.map((p) => ({
        ...p,
        caseTypeLabel:
          getCaseTypeBySlug(p.caseType)?.label ?? {
            en: p.caseType,
            ar: p.caseType,
          },
        baseFee: Number(p.baseFee),
        createdAtIso: p.createdAt.toISOString(),
        distanceKm: p.distanceKm,
      }))}
    />
  );
}
