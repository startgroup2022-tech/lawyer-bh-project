import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";

const candidates = [
  ["POSTGRES_URL_NON_POOLING", process.env.POSTGRES_URL_NON_POOLING],
  ["DATABASE_URL_UNPOOLED", process.env.DATABASE_URL_UNPOOLED],
  ["DATABASE_URL", process.env.DATABASE_URL],
  ["POSTGRES_URL", process.env.POSTGRES_URL],
];
const selected = candidates.find(([, candidate]) => {
  try {
    const value = new URL(candidate);
    return (value.protocol === "postgres:" || value.protocol === "postgresql:") && value.hostname;
  } catch {
    return false;
  }
});
if (!selected) throw new Error("No valid PostgreSQL database URL is configured");

const [source, databaseUrl] = selected;
console.log(`Running migrations through ${source}`);
const client = postgres(databaseUrl, { max: 1, prepare: false });
try {
  await migrate(drizzle(client), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
  console.log("Migrations applied successfully");
} catch (error) {
  console.error("Migration failed", {
    name: error?.name,
    code: error?.code,
    databaseCode: error?.cause?.code,
    databaseMessage: error?.cause?.message,
    message: error?.message,
    detail: error?.detail,
    constraint: error?.constraint_name,
  });
  process.exitCode = 1;
} finally {
  await client.end();
}
