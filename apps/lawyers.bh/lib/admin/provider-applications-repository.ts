import "server-only";

import { sqlClient } from "@/lib/db/client";
import { countryTableName } from "@/lib/db/country-tables";
import { getTapConfig } from "@/lib/tap/config";

type CountryDestination = { code: string; tablePrefix: string };
type ApplicationRow = Record<string, unknown> & { id: string };

function camelCase(key: string) {
  return key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

export function normalizeProviderApplication(row: ApplicationRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [camelCase(key), value]),
  ) as ApplicationRow;
}

type Dependencies = {
  loadCountries: () => Promise<CountryDestination[]>;
  query: (table: string, countryCode: string) => Promise<ApplicationRow[]>;
};

export function createProviderApplicationsRepository(dependencies: Dependencies) {
  async function destinations() {
    const countries = await dependencies.loadCountries();
    return countries.map((country) => ({
      countryCode: country.code,
      table: countryTableName(country.tablePrefix, "lawyers"),
    }));
  }

  return {
    async list() {
      const rows: ApplicationRow[] = [];
      for (const destination of await destinations()) {
        rows.push(...(await dependencies.query(destination.table, destination.countryCode)).map(normalizeProviderApplication));
      }
      return rows.sort((a, b) =>
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
      );
    },

    async destination(id: string, countryCode: string) {
      const destination = (await destinations()).find(
        (item) => item.countryCode === countryCode.trim().toUpperCase(),
      );
      return destination ? { ...destination, id } : null;
    },
  };
}

async function loadActiveConfiguredCountries() {
  const rows = await sqlClient`
    SELECT c.code, c.table_prefix
    FROM countries c
    JOIN country_channel_settings s ON s.code = c.code
    WHERE c.is_active = true
      AND c.tables_provisioned = true
      AND (s.app_enabled = true OR s.website_enabled = true)
      AND c.code IN ('BH', 'SA')
    ORDER BY c.code
  `;
  return rows.map((row) => ({
    code: String(row.code),
    tablePrefix: String(row.table_prefix),
  }));
}

async function queryApplications(table: string, countryCode: string) {
  const environment = getTapConfig().mode;
  return await sqlClient<ApplicationRow[]>`
    SELECT l.*,
      ${countryCode}::text AS country_code,
      t.stage AS tap_stage,
      t.kyc_status AS tap_kyc_status,
      t.payout_enabled AS tap_payout_enabled,
      t.last_attempt_at AS tap_last_attempt_at
    FROM ${sqlClient(table)} l
    LEFT JOIN bahrain_tap_retailer_onboarding t ON t.lawyer_id = l.id AND t.environment = ${environment}
    ORDER BY l.created_at DESC
  `;
}

export const providerApplicationsRepository = createProviderApplicationsRepository({
  loadCountries: loadActiveConfiguredCountries,
  query: queryApplications,
});
