import { defineConfig } from "drizzle-kit";

// Drizzle Kit runs migrations over a DIRECT (unpooled) connection. Neon's
// pooled DATABASE_URL (PgBouncer transaction mode) can't hold the
// session-level advisory lock drizzle-kit acquires before migrating, so
// `drizzle-kit migrate` fails through the pooler. Prefer DATABASE_URL_UNPOOLED
// when present; the app runtime still uses the pooled DATABASE_URL via
// lib/db/client.ts. Local dev falls back to the docker-compose Postgres on :5433.
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  "postgres://lawyers:lawyers_dev_password@localhost:5433/lawyers_bh";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
