import { createTRPCRouter } from "../trpc";
import { casesRouter } from "./cases";
import { lawyersRouter } from "./lawyers";
import { payoutsRouter } from "./payouts";

// Note: mobile-facing endpoints live in `app/api/mobile/*` as plain
// Next.js route handlers, not under this tRPC tree. Reason: mobile is
// in a separate package without admin's runtime deps, so cross-package
// type sharing for tRPC isn't worth the build setup yet. The shared
// business logic lives in `lib/twilio.ts` + `lib/auth/mobile-jwt.ts`
// and is called from both transports.

export const appRouter = createTRPCRouter({
  cases: casesRouter,
  lawyers: lawyersRouter,
  payouts: payoutsRouter,
});

export type AppRouter = typeof appRouter;
