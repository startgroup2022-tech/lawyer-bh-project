import { setRequestLocale } from "next-intl/server";
import { sql, eq, and, isNotNull, isNull, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getAdvocateCutPercent } from "@/lib/sos/payouts";
import PayoutsView from "./PayoutsView";

// Auth enforced by proxy.ts middleware.
export const dynamic = "force-dynamic";

export default async function PayoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const cutPercent = getAdvocateCutPercent();

  // Per-advocate aggregates: paid completed totals, settled counts,
  // outstanding gross. Pulls every active advocate even when zero —
  // operator can audit at a glance who has yet to handle their first
  // case.
  const rows = await db
    .select({
      advocateId: schema.saudiLawyers.id,
      fullName: schema.saudiLawyers.fullNameAr,
      registrationNo: schema.saudiLawyers.registrationNo,
      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,
      isActive: schema.saudiLawyers.isActive,
      paidCompletedCount: sql<number>`coalesce(count(${schema.emergencyRequests.id}) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed' and ${schema.emergencyRequests.paymentStatus} = 'success'), 0)::int`,
      settledCount: sql<number>`coalesce(count(${schema.emergencyRequests.id}) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed' and ${schema.emergencyRequests.paymentStatus} = 'success' and ${schema.emergencyRequests.settledAt} is not null), 0)::int`,
      outstandingCount: sql<number>`coalesce(count(${schema.emergencyRequests.id}) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed' and ${schema.emergencyRequests.paymentStatus} = 'success' and ${schema.emergencyRequests.settledAt} is null), 0)::int`,
      grossPaidBhd: sql<number>`coalesce(sum(${schema.emergencyRequests.baseFee}) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed' and ${schema.emergencyRequests.paymentStatus} = 'success'), 0)::numeric`,
      outstandingGrossBhd: sql<number>`coalesce(sum(${schema.emergencyRequests.baseFee}) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed' and ${schema.emergencyRequests.paymentStatus} = 'success' and ${schema.emergencyRequests.settledAt} is null), 0)::numeric`,
    })
    .from(schema.saudiLawyers)
    .leftJoin(
      schema.emergencyRequests,
      eq(schema.emergencyRequests.assignedLawyerId, schema.saudiLawyers.id),
    )
    .groupBy(
      schema.saudiLawyers.id,
      schema.saudiLawyers.fullNameAr,
      schema.saudiLawyers.registrationNo,
      schema.saudiLawyers.email,
      schema.saudiLawyers.phone,
      schema.saudiLawyers.isActive,
    )
    .orderBy(desc(sql`coalesce(sum(${schema.emergencyRequests.baseFee}) filter (where ${schema.emergencyRequests.serviceStatus} = 'completed' and ${schema.emergencyRequests.paymentStatus} = 'success'), 0)`));

  const advocates = rows.map((r) => {
    const grossPaid = Number(r.grossPaidBhd);
    const outstandingGross = Number(r.outstandingGrossBhd);
    const advocateCut = round3((grossPaid * cutPercent) / 100);
    const outstandingAdvocateCut = round3(
      (outstandingGross * cutPercent) / 100,
    );
    const platformCut = round3(grossPaid - advocateCut);
    return {
      advocateId: r.advocateId,
      fullName: r.fullName,
      registrationNo: r.registrationNo,
      email: r.email,
      phone: r.phone,
      isActive: r.isActive,
      paidCompletedCount: Number(r.paidCompletedCount),
      settledCount: Number(r.settledCount),
      outstandingCount: Number(r.outstandingCount),
      grossPaidBhd: grossPaid,
      outstandingGrossBhd: outstandingGross,
      advocateCutBhd: advocateCut,
      outstandingAdvocateCutBhd: outstandingAdvocateCut,
      platformCutBhd: platformCut,
    };
  });

  // Platform-wide totals so the operator can sanity-check the table.
  const totals = advocates.reduce(
    (acc, a) => {
      acc.grossPaid += a.grossPaidBhd;
      acc.outstandingGross += a.outstandingGrossBhd;
      acc.advocateCut += a.advocateCutBhd;
      acc.platformCut += a.platformCutBhd;
      acc.outstandingAdvocateCut += a.outstandingAdvocateCutBhd;
      acc.outstandingCount += a.outstandingCount;
      acc.paidCompletedCount += a.paidCompletedCount;
      return acc;
    },
    {
      grossPaid: 0,
      outstandingGross: 0,
      advocateCut: 0,
      platformCut: 0,
      outstandingAdvocateCut: 0,
      outstandingCount: 0,
      paidCompletedCount: 0,
    },
  );

  return (
    <PayoutsView
      cutPercent={cutPercent}
      advocates={advocates}
      totals={{
        grossPaid: round3(totals.grossPaid),
        outstandingGross: round3(totals.outstandingGross),
        advocateCut: round3(totals.advocateCut),
        platformCut: round3(totals.platformCut),
        outstandingAdvocateCut: round3(totals.outstandingAdvocateCut),
        outstandingCount: totals.outstandingCount,
        paidCompletedCount: totals.paidCompletedCount,
      }}
    />
  );
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
