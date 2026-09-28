// Drizzle DB client. Uses postgres-js — works with any Postgres URL,
// including Neon (production) and a local Postgres for dev. We keep a
// single connection pool per Node process (cached on globalThis so it
// survives Next.js hot reloads).

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // Build-time: drizzle-kit migrate reads DATABASE_URL separately and will
  // crash with a clearer error than throwing here. Runtime: we want a
  // clear failure too.
  console.warn(
    "[legal-sos-admin] DATABASE_URL is not set. Set it in .env.local for dev or in Vercel env for prod.",
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __legalSosAdminPg: ReturnType<typeof postgres> | undefined;
}

const sql =
  global.__legalSosAdminPg ??
  postgres(databaseUrl ?? "postgres://invalid", {
    max: 5,
    // Neon requires SSL; local dev typically doesn't.
    ssl: databaseUrl?.includes(".neon.tech") ? "require" : undefined,
    onnotice: () => {}, // silence
  });

if (process.env.NODE_ENV !== "production") {
  global.__legalSosAdminPg = sql;
}

export const db = drizzle(sql, { schema });
export { schema };
