// Next.js App Router → tRPC handler. Mounted at /api/trpc/*.
//
// Context is built once per request. We look up both auth surfaces:
//   • Admin cookie → adminUserId (back-office console)
//   • Bearer JWT  → mobileUserId + role (mobile apps)
// A given request can only have one or the other (never both).

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/routers/_app";
import { getAdminSession } from "@/lib/auth/session";
import { verifyAccessJwt } from "@/lib/auth/mobile-jwt";
import type { Context } from "@/server/trpc";

// Dynamic — tRPC handler must run per-request. No build-time pre-render.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function createContext(req: Request): Promise<Context> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  // 1) Mobile bearer wins if present — mobile apps shouldn't also send cookies.
  const authz = req.headers.get("authorization");
  if (authz && authz.toLowerCase().startsWith("bearer ")) {
    const token = authz.slice(7).trim();
    const claims = await verifyAccessJwt(token);
    if (claims) {
      return {
        adminUserId: null,
        mobileUserId: claims.sub,
        mobileRole: claims.role,
        ip,
        userAgent,
      };
    }
    // Invalid bearer falls through to anonymous.
  }

  // 2) Admin cookie path for the back-office console.
  const session = await getAdminSession();
  return {
    adminUserId: session?.adminUserId ?? null,
    mobileUserId: null,
    mobileRole: null,
    ip,
    userAgent,
  };
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError: ({ path, error }) => {
      console.error(`[tRPC] ${path ?? "<no-path>"}:`, error);
    },
  });

export { handler as GET, handler as POST };
