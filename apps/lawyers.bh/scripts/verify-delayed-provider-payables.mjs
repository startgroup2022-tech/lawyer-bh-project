import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required");

const databaseName = new URL(databaseUrl).pathname.slice(1);
if (!databaseName.endsWith("_test")) {
  throw new Error("Refusing to run outside a database whose name ends with _test");
}

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = (await readFile(
  resolve(appRoot, "drizzle/0037_delayed_provider_payables.sql"),
  "utf8",
)).replace(/^BEGIN;\s*/u, "").replace(/\s*COMMIT;\s*$/u, "");
const verification = await readFile(
  resolve(appRoot, "drizzle/verify_0037_delayed_provider_payables.sql"),
  "utf8",
);

const sql = postgres(databaseUrl, { max: 1 });
const rollbackMarker = new Error("ROLLBACK_VERIFIED_SETTLEMENT_FIXTURE");

try {
  await sql.begin(async (tx) => {
    const suffix = Date.now().toString(36).slice(-8);
    const prefix = `zt${suffix}`;
    const tableName = `${prefix}_payment_allocations`;
    const countryCode = `Z${Math.floor(Math.random() * 10)}`;

    await tx.unsafe(`
      CREATE TABLE public.${tableName} (
        id uuid PRIMARY KEY,
        captured_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await tx`
      INSERT INTO public.countries (
        code, table_prefix, name_ar, name_en, currency_code,
        is_active, tables_provisioned
      ) VALUES (
        ${countryCode}, ${prefix}, 'اختبار', 'Test', 'BHD', false, true
      )
    `;

    await tx.unsafe(migration);
    await tx.unsafe(verification);

    const [columnCount] = await tx`
      SELECT count(*)::int AS count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name IN (
          'provider_name_snapshot', 'provider_iban_snapshot', 'settlement_status',
          'settlement_method', 'settlement_reference', 'settlement_transferred_at',
          'settlement_recorded_at', 'settlement_recorded_by', 'reconciliation_error'
        )
    `;
    if (columnCount.count !== 9) throw new Error("Fixture settlement columns were not created");

    throw rollbackMarker;
  });
} catch (error) {
  if (error !== rollbackMarker) throw error;
} finally {
  await sql.end();
}

console.log("Delayed provider payable migration verified and rolled back");
