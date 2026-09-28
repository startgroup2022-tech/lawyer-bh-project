import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { adminProcedure, createTRPCRouter } from "../trpc";

export const lawyersRouter = createTRPCRouter({
  list: adminProcedure
    .input(
      z
        .object({
          country: z.enum(["BH", "AE", "SA", "KW", "QA", "OM"]).optional(),
          activeOnly: z.boolean().default(true),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const conditions = [];
      if (input?.activeOnly !== false) conditions.push(eq(schema.lawyers.isActive, true));
      if (input?.country) conditions.push(eq(schema.lawyers.countryCode, input.country));

      const rows = await db
        .select()
        .from(schema.lawyers)
        .where(conditions.length > 0 ? conditions[0] : undefined)
        .orderBy(desc(schema.lawyers.totalCases))
        .limit(200);
      return rows;
    }),

  toggleReady: adminProcedure
    .input(z.object({ id: z.string().uuid(), emergencyReady: z.boolean() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(schema.lawyers)
        .set({ emergencyReady: input.emergencyReady, updatedAt: new Date() })
        .where(eq(schema.lawyers.id, input.id))
        .returning();
      return row ?? null;
    }),
});
