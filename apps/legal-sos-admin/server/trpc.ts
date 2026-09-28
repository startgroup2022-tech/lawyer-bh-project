// tRPC server primitives. Every router built on top of these gets
// typed end-to-end from the database to the React component.

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { MobileRole } from "@/lib/auth/mobile-jwt";

export interface Context {
  /** Admin operator id when the request carries a valid admin cookie. */
  adminUserId: string | null;
  /** Mobile user id when the request carries a valid Bearer JWT. */
  mobileUserId: string | null;
  mobileRole: MobileRole | null;
  /** Request headers — used by procedures that need IP / UA for audit. */
  ip: string | null;
  userAgent: string | null;
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError ? error.cause.flatten() : null,
    },
  }),
});

export const createTRPCRouter = t.router;

/** Open to anyone. Used for routes the mobile app can hit without a session. */
export const publicProcedure = t.procedure;

/** Requires a signed-in admin operator. */
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.adminUserId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Admin session required.",
    });
  }
  return next({ ctx: { ...ctx, adminUserId: ctx.adminUserId } });
});

/** Requires a signed-in mobile user (any role). */
export const mobileProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.mobileUserId || !ctx.mobileRole) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Mobile session required.",
    });
  }
  return next({
    ctx: { ...ctx, mobileUserId: ctx.mobileUserId, mobileRole: ctx.mobileRole },
  });
});

/** Requires a signed-in mobile user with the lawyer role. */
export const lawyerProcedure = mobileProcedure.use(({ ctx, next }) => {
  if (ctx.mobileRole !== "lawyer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Lawyer role required.",
    });
  }
  return next({ ctx });
});

/** Requires a signed-in mobile user with the client role. */
export const clientProcedure = mobileProcedure.use(({ ctx, next }) => {
  if (ctx.mobileRole !== "client") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Client role required.",
    });
  }
  return next({ ctx });
});
