import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import postgres from "postgres";

const REQUIRED_COUNTRIES = [
  { code: "BH", tablePrefix: "bahrain" },
  { code: "SA", tablePrefix: "saudi" },
];

const READINESS_CHECKS = [
  ["isActive", "COUNTRY_INACTIVE"],
  ["tablesProvisioned", "TABLES_UNPROVISIONED"],
  ["appEnabled", "APP_CHANNEL_DISABLED"],
  ["websiteEnabled", "WEBSITE_CHANNEL_DISABLED"],
  ["lawyerTableExists", "LAWYER_TABLE_MISSING"],
];

export function evaluateReadiness(countries) {
  for (const requiredCountry of REQUIRED_COUNTRIES) {
    const country = countries.find(({ code }) => code === requiredCountry.code);

    if (!country) {
      return {
        ok: false,
        code: "COUNTRY_MISSING",
        country: requiredCountry.code,
      };
    }

    const expectedTable = `${requiredCountry.tablePrefix}_lawyers`;
    const actualTable = `${country.tablePrefix}_lawyers`;

    if (actualTable !== expectedTable) {
      return {
        ok: false,
        code: "COUNTRY_TABLE_MISMATCH",
        country: requiredCountry.code,
        expectedTable,
        actualTable,
      };
    }

    for (const [field, reason] of READINESS_CHECKS) {
      if (!country[field]) {
        return {
          ok: false,
          code: "COUNTRY_NOT_READY",
          country: requiredCountry.code,
          reason,
        };
      }
    }
  }

  return {
    ok: true,
    countries: REQUIRED_COUNTRIES.map(({ code }) => code),
  };
}

export function describeDatabaseError(error) {
  if (
    error?.code === "53000" ||
    String(error?.message ?? "").toLowerCase().includes("exceeded the quota")
  ) {
    return { ok: false, code: "DATABASE_QUOTA_EXCEEDED" };
  }

  return { ok: false, code: "DATABASE_UNAVAILABLE" };
}

async function loadCountryReadiness(databaseUrl) {
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 10,
    idle_timeout: 2,
  });

  try {
    const countries = await sql`
      select
        c.code,
        c.table_prefix,
        c.is_active,
        c.tables_provisioned,
        coalesce(s.app_enabled, false) as app_enabled,
        coalesce(s.website_enabled, false) as website_enabled
      from countries c
      left join country_channel_settings s on s.code = c.code
      where c.code in ('BH', 'SA')
      order by c.code
    `;

    const readiness = [];
    for (const country of countries) {
      const tableName = `${country.table_prefix}_lawyers`;
      const [table] = await sql`
        select to_regclass(${`public.${tableName}`}) is not null as exists
      `;

      readiness.push({
        code: country.code,
        tablePrefix: country.table_prefix,
        isActive: country.is_active,
        tablesProvisioned: country.tables_provisioned,
        appEnabled: country.app_enabled,
        websiteEnabled: country.website_enabled,
        lawyerTableExists: table.exists,
      });
    }

    return readiness;
  } finally {
    await sql.end({ timeout: 2 }).catch(() => undefined);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(JSON.stringify({ ok: false, code: "DATABASE_URL_MISSING" }));
    process.exitCode = 1;
    return;
  }

  try {
    const result = evaluateReadiness(await loadCountryReadiness(databaseUrl));
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify(describeDatabaseError(error), null, 2));
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectExecution) await main();
