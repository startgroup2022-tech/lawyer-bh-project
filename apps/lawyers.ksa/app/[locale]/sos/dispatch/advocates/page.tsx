import { setRequestLocale } from "next-intl/server";
import { desc, eq, and, sql, count, avg, isNotNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import AdvocateRoster from "./AdvocateRoster";

// Auth is enforced by proxy.ts middleware (DISPATCH_USERNAME / DISPATCH_PASSWORD).
export const dynamic = "force-dynamic";

export default async function DispatchAdvocatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Pull the advocate roster joined with aggregate stats from
  // emergency_requests (completed count + average rating). Drizzle's
  // SQL helpers keep this readable without dropping to raw SQL.
  const advocates = await db
    .select({
      id: schema.saudiLawyers.id,
      fullName: schema.saudiLawyers.fullNameAr,
      registrationNo: schema.saudiLawyers.registrationNo,
      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,
      isActive: schema.saudiLawyers.isActive,
      isEmergencyReady: schema.saudiLawyers.isEmergencyReady,
      emergencyRadiusKm: schema.saudiLawyers.emergencyRadiusKm,
      baseLocation: schema.saudiLawyers.baseLocation,
      consentId: schema.saudiLawyers.consentId,
      createdAt: schema.saudiLawyers.createdAt,
    })
    .from(schema.saudiLawyers)
    .orderBy(desc(schema.saudiLawyers.createdAt));

  // Per-advocate stats. Could be done in a single GROUP BY query,
  // but the roster size is small enough that one round-trip per
  // advocate stays fast and keeps the SQL simple.
  const stats = await db
    .select({
      advocateId: schema.emergencyRequests.assignedLawyerId,
      completed: count(
        sql`CASE WHEN ${schema.emergencyRequests.serviceStatus} = 'completed' THEN 1 END`,
      ).as("completed"),
      total: count().as("total"),
      avgRating: avg(schema.emergencyRequests.ratingStars).as("avg_rating"),
    })
    .from(schema.emergencyRequests)
    .where(isNotNull(schema.emergencyRequests.assignedLawyerId))
    .groupBy(schema.emergencyRequests.assignedLawyerId);

  const statsById = new Map<
    string,
    { completed: number; total: number; avgRating: number | null }
  >();
  for (const s of stats) {
    if (!s.advocateId) continue;
    statsById.set(s.advocateId, {
      completed: Number(s.completed),
      total: Number(s.total),
      avgRating: s.avgRating ? Number(s.avgRating) : null,
    });
  }

  return (
    <AdvocateRoster
      advocates={advocates.map((a) => ({
        ...a,
        createdAtIso: a.createdAt.toISOString(),
        stats: statsById.get(a.id) ?? {
          completed: 0,
          total: 0,
          avgRating: null,
        },
      }))}
    />
  );
}
