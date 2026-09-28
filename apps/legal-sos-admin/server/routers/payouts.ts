import { sql as drizzleSql, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { adminProcedure, createTRPCRouter } from "../trpc";

const ADVOCATE_CUT_PCT = 0.7; // 70% lawyer cut by default

export const payoutsRouter = createTRPCRouter({
  /** Per-lawyer aggregate of outstanding and settled balances. */
  byLawyer: adminProcedure.query(async () => {
    const rows = await db
      .select({
        lawyerId: schema.lawyers.id,
        lawyerName: schema.lawyers.fullName,
        outstandingBhd: drizzleSql<number>`coalesce(sum(case when ${schema.cases.paymentStatus} = 'success' and ${schema.cases.settledAt} is null then ${schema.cases.baseFeeBhd} * ${ADVOCATE_CUT_PCT} else 0 end), 0)::numeric`,
        pendingCases: drizzleSql<number>`count(case when ${schema.cases.paymentStatus} = 'success' and ${schema.cases.settledAt} is null then 1 end)::int`,
        ytdPaidBhd: drizzleSql<number>`coalesce(sum(case when ${schema.cases.paymentStatus} = 'success' and ${schema.cases.settledAt} is not null then ${schema.cases.baseFeeBhd} * ${ADVOCATE_CUT_PCT} else 0 end), 0)::numeric`,
        lastSettledAt: drizzleSql<Date | null>`max(${schema.cases.settledAt})`,
      })
      .from(schema.lawyers)
      .leftJoin(
        schema.cases,
        eq(schema.cases.assignedLawyerId, schema.lawyers.id),
      )
      .groupBy(schema.lawyers.id, schema.lawyers.fullName);

    return rows.map((r) => ({
      ...r,
      outstandingBhd: Number(r.outstandingBhd) || 0,
      ytdPaidBhd: Number(r.ytdPaidBhd) || 0,
      lastSettledAt: r.lastSettledAt ? new Date(r.lastSettledAt).toISOString() : null,
    }));
  }),

  /** Mark all settled-eligible cases for a lawyer as paid. */
  settle: adminProcedure.mutation(async () => {
    // TODO: implement after operator auth so we have ctx.adminUserId.
    return { ok: true };
  }),
});
