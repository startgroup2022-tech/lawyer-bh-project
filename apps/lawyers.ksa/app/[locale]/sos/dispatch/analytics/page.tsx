import { setRequestLocale } from "next-intl/server";
import { sql, eq, gte, isNotNull, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getCaseTypeBySlug, type SosCaseSlug } from "@/lib/sos/caseTypes";
import AnalyticsView from "./AnalyticsView";

// Auth is enforced by proxy.ts middleware (DISPATCH_USERNAME / DISPATCH_PASSWORD).
export const dynamic = "force-dynamic";

interface DailyBucket {
  day: string;
  count: number;
}

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // ── Headline KPIs ────────────────────────────────────────────────
  const totalsRow = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed')::int`,
      cancelled: sql<number>`count(*) filter (where ${schema.emergencyRequests.serviceStatus} = 'cancelled')::int`,
      revenueBhd: sql<number>`coalesce(sum(${schema.emergencyRequests.baseFee}) filter (where ${schema.emergencyRequests.paymentStatus} = 'success'), 0)::numeric`,
      avgRespSec: sql<number>`coalesce(avg(extract(epoch from (${schema.emergencyRequests.responseTimestamp} - ${schema.emergencyRequests.createdAt}))) filter (where ${schema.emergencyRequests.responseTimestamp} is not null), 0)::int`,
      avgArriveSec: sql<number>`coalesce(avg(extract(epoch from (${schema.emergencyRequests.arrivalTimestamp} - ${schema.emergencyRequests.responseTimestamp}))) filter (where ${schema.emergencyRequests.arrivalTimestamp} is not null), 0)::int`,
      avgCompleteSec: sql<number>`coalesce(avg(extract(epoch from (${schema.emergencyRequests.completedTimestamp} - ${schema.emergencyRequests.arrivalTimestamp}))) filter (where ${schema.emergencyRequests.completedTimestamp} is not null), 0)::int`,
      avgRating: sql<number>`coalesce(avg(${schema.emergencyRequests.ratingStars}), 0)::numeric`,
    })
    .from(schema.emergencyRequests);
  const totals = totalsRow[0];

  // ── Status breakdown ─────────────────────────────────────────────
  const statusBreakdown = await db
    .select({
      status: schema.emergencyRequests.serviceStatus,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.emergencyRequests)
    .groupBy(schema.emergencyRequests.serviceStatus);

  // ── Cases per day for the last 30 days ───────────────────────────
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 29);
  since.setUTCHours(0, 0, 0, 0);
  const dailyRaw = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${schema.emergencyRequests.createdAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.emergencyRequests)
    .where(gte(schema.emergencyRequests.createdAt, since))
    .groupBy(sql`date_trunc('day', ${schema.emergencyRequests.createdAt})`)
    .orderBy(sql`date_trunc('day', ${schema.emergencyRequests.createdAt})`);

  // Fill in zero days so the chart shows a continuous 30-day timeline
  // even when nothing happened on a given day.
  const dailyMap = new Map<string, number>();
  for (const r of dailyRaw) dailyMap.set(r.day, Number(r.count));
  const daily: DailyBucket[] = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ day: key, count: dailyMap.get(key) ?? 0 });
  }

  // ── Cases by type ────────────────────────────────────────────────
  const byTypeRows = await db
    .select({
      caseType: schema.emergencyRequests.caseType,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.emergencyRequests)
    .groupBy(schema.emergencyRequests.caseType)
    .orderBy(desc(sql`count(*)`));

  const byType = byTypeRows.map((r) => ({
    slug: r.caseType as SosCaseSlug,
    label: getCaseTypeBySlug(r.caseType)?.label ?? {
      en: r.caseType,
      ar: r.caseType,
    },
    count: Number(r.count),
  }));

  // ── Heatmap points (case locations) ──────────────────────────────
  const locationRows = await db
    .select({
      location: schema.emergencyRequests.location,
    })
    .from(schema.emergencyRequests);

  // Bucket by 0.005° lat/lng grid (~500 m at this latitude) so dense
  // street-level clusters get rendered as one bigger circle instead
  // of overplotted dots.
  const heatmapBuckets = new Map<string, { lat: number; lng: number; count: number }>();
  for (const r of locationRows) {
    const loc = r.location;
    if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number") continue;
    const bucketLat = Math.round(loc.lat * 200) / 200;
    const bucketLng = Math.round(loc.lng * 200) / 200;
    const key = `${bucketLat},${bucketLng}`;
    const existing = heatmapBuckets.get(key);
    if (existing) {
      existing.count++;
    } else {
      heatmapBuckets.set(key, {
        lat: bucketLat,
        lng: bucketLng,
        count: 1,
      });
    }
  }
  const heatmapPoints = Array.from(heatmapBuckets.values()).map((b) => ({
    lat: b.lat,
    lng: b.lng,
    weight: b.count,
  }));

  // ── Top advocates by completed cases ─────────────────────────────
  const topAdvocates = await db
    .select({
      advocateId: schema.emergencyRequests.assignedLawyerId,
      fullName: schema.saudiLawyers.fullNameAr,
      registrationNo: schema.saudiLawyers.registrationNo,
      completed: sql<number>`count(*) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed')::int`,
      total: sql<number>`count(*)::int`,
      avgRating: sql<number>`coalesce(avg(${schema.emergencyRequests.ratingStars}), 0)::numeric`,
    })
    .from(schema.emergencyRequests)
    .innerJoin(
      schema.saudiLawyers,
      eq(schema.emergencyRequests.assignedLawyerId, schema.saudiLawyers.id),
    )
    .where(isNotNull(schema.emergencyRequests.assignedLawyerId))
    .groupBy(
      schema.emergencyRequests.assignedLawyerId,
      schema.saudiLawyers.fullNameAr,
      schema.saudiLawyers.registrationNo,
    )
    .orderBy(desc(sql`count(*) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed')`))
    .limit(5);

  return (
    <AnalyticsView
      kpis={{
        total: Number(totals.total),
        completed: Number(totals.completed),
        cancelled: Number(totals.cancelled),
        revenueBhd: Number(totals.revenueBhd),
        avgRespSec: Number(totals.avgRespSec),
        avgArriveSec: Number(totals.avgArriveSec),
        avgCompleteSec: Number(totals.avgCompleteSec),
        avgRating: Number(totals.avgRating),
      }}
      statusBreakdown={statusBreakdown.map((s) => ({
        status: s.status,
        count: Number(s.count),
      }))}
      daily={daily}
      byType={byType}
      topAdvocates={topAdvocates.map((a) => ({
        advocateId: a.advocateId ?? "",
        fullName: a.fullName,
        registrationNo: a.registrationNo,
        completed: Number(a.completed),
        total: Number(a.total),
        avgRating: Number(a.avgRating),
      }))}
      heatmapPoints={heatmapPoints}
    />
  );
}
