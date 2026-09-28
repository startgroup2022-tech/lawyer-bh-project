import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Singleton Drizzle client. Next.js can re-execute modules during
// hot-reload, so we cache the underlying postgres-js connection on
// `globalThis` to avoid leaking connections between reloads.
declare global {
  // eslint-disable-next-line no-var
  var __lawyersBhPg: ReturnType<typeof postgres> | undefined;
}

function buildConnection() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Run `pnpm db:up` to start the local " +
        "Postgres container and ensure .env.local is populated " +
        "(see .env.example).",
    );
  }
  // postgres-js: small idle pool keeps Vercel cold-start friendly while
  // still allowing local connection reuse during development.
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}

const sql = globalThis.__lawyersBhPg ?? buildConnection();
if (process.env.NODE_ENV !== "production") {
  globalThis.__lawyersBhPg = sql;
}

export const sqlClient = sql;
export const db = drizzle(sql, { schema });
export type Db = typeof db;
export { schema };
