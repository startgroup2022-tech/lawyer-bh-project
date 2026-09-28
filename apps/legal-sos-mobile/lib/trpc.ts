// tRPC client for the Legal SOS mobile app.
//
// Talks to the admin app's tRPC router (admin and mobile share one
// backend — see legal-sos-admin/server/routers/_app.ts). When the
// mobile-specific procedures land they'll live in a `mobile` namespace
// on that same router.
//
// Auth: every request attaches the access JWT from SecureStore. If the
// server returns 401 the global error handler in QueryClient triggers
// a refresh-token exchange, and on second 401 signs the user out.

import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { QueryClient } from "@tanstack/react-query";
import { env } from "../constants/env";
import { getSessionToken } from "./secureStore";

// Placeholder router shape — the real router lives in the admin app
// at apps/legal-sos-admin/server/routers/_app.ts. We build a tiny
// throwaway router here just so createTRPCReact gets a valid type to
// derive its hooks from. None of these procedures actually exist on
// the wire — they're typing-only.
//
// TODO(phase-A): replace this with the real AppRouter type import:
//   import type { AppRouter } from "../../legal-sos-admin/server/routers/_app";
//   export const trpc = createTRPCReact<AppRouter>();
const _t = initTRPC.create({ transformer: superjson });
const _placeholderRouter = _t.router({
  _scaffold: _t.procedure.query(() => "ok" as const),
});
type PlaceholderRouter = typeof _placeholderRouter;
export const trpc = createTRPCReact<PlaceholderRouter>();

export function makeTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${env.apiUrl.replace(/\/$/, "")}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        async fetch(input, init) {
          // RN fetch has no AbortSignal.timeout shorthand — wrap with our own.
          const ac = new AbortController();
          const t = setTimeout(() => ac.abort(), 20_000);
          try {
            const res = await fetch(input as RequestInfo, {
              ...init,
              signal: ac.signal,
            });
            return res;
          } finally {
            clearTimeout(t);
          }
        },
      }),
    ],
  });
}

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // SOS app: most data is short-lived (case status, lawyer ETA),
        // so we refetch aggressively on focus and stale early.
        staleTime: 5_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error) => {
          // Don't retry on auth errors.
          const status = (error as { data?: { httpStatus?: number } })?.data
            ?.httpStatus;
          if (status === 401 || status === 403) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
