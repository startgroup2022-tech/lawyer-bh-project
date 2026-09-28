import { z } from "zod";
import { desc, eq, gte, inArray, sql as drizzleSql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { adminProcedure, createTRPCRouter } from "../trpc";

export const casesRouter = createTRPCRouter({
  /** List cases with optional status filter. Newest first. */
  list: adminProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "pending",
              "mobilizing",
              "arrived",
              "completed",
              "cancelled",
              "disputed",
            ])
            .optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const where = input?.status
        ? eq(schema.cases.serviceStatus, input.status)
        : undefined;
      const rows = await db
        .select()
        .from(schema.cases)
        .where(where)
        .orderBy(desc(schema.cases.createdAt))
        .limit(input?.limit ?? 50);
      return rows;
    }),

  /** Single case lookup by ref. */
  byRef: adminProcedure
    .input(z.object({ caseRef: z.string().min(4) }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(schema.cases)
        .where(eq(schema.cases.caseRef, input.caseRef))
        .limit(1);
      return row ?? null;
    }),

  /** Operations dashboard counters. */
  stats: adminProcedure.query(async () => {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ last24h, revenue24h }] = await db
      .select({
        last24h: drizzleSql<number>`count(*)::int`,
        revenue24h: drizzleSql<number>`coalesce(sum(case when payment_status = 'success' then base_fee_bhd else 0 end), 0)::numeric`,
      })
      .from(schema.cases)
      .where(gte(schema.cases.createdAt, since24h));

    const [{ active }] = await db
      .select({ active: drizzleSql<number>`count(*)::int` })
      .from(schema.cases)
      .where(
        inArray(schema.cases.serviceStatus, [
          "pending",
          "mobilizing",
          "arrived",
        ]),
      );

    return {
      last24h,
      revenue24h: Number(revenue24h) || 0,
      active: active ?? 0,
    };
  }),
});
