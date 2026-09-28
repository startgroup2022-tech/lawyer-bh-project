import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => {
  const transactionQuery = vi.fn();
  const sqlClient = Object.assign(vi.fn(), {
    begin: vi.fn(async (callback: (sql: typeof transactionQuery) => unknown) =>
      callback(transactionQuery),
    ),
  });
  return { sqlClient, transactionQuery };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ sqlClient: database.sqlClient }));

import { ensureCountryProvisionedForRegistration } from "./country-tables";

describe("registration country provisioning", () => {
  beforeEach(() => {
    database.transactionQuery.mockReset();
    database.sqlClient.begin.mockClear();
  });

  it("provisions a trusted inactive country and returns its routing metadata", async () => {
    database.transactionQuery.mockResolvedValueOnce([
      {
        code: "US",
        table_prefix: "country_us",
        name_ar: "الولايات المتحدة",
        name_en: "United States",
        currency_code: "USD",
        default_locale: "en",
      },
    ]);

    await expect(
      ensureCountryProvisionedForRegistration(" us "),
    ).resolves.toEqual({
      code: "US",
      tablePrefix: "country_us",
      nameAr: "الولايات المتحدة",
      nameEn: "United States",
      currencyCode: "USD",
      defaultLocale: "en",
    });
    expect(database.sqlClient.begin).toHaveBeenCalledOnce();
    expect(database.transactionQuery).toHaveBeenCalledOnce();
  });

  it("rejects invalid or non-catalogue codes before opening a transaction", async () => {
    await expect(
      ensureCountryProvisionedForRegistration("ZZ"),
    ).resolves.toBeNull();
    expect(database.sqlClient.begin).not.toHaveBeenCalled();
  });

  it("fails closed when provisioning returns no country", async () => {
    database.transactionQuery.mockResolvedValueOnce([]);

    await expect(
      ensureCountryProvisionedForRegistration("US"),
    ).rejects.toThrow("Country provisioning failed");
  });
});

describe("registration country provisioning migration", () => {
  const migration = readFileSync(
    "drizzle/0113_registration_country_provisioning.sql",
    "utf8",
  );

  it("locks provisioning and never activates client services", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("is_active, tables_provisioned");
    expect(migration).toContain("false, false");
    expect(migration).not.toContain("SET is_active = true");
    expect(migration).not.toContain("app_enabled = true");
    expect(migration).not.toContain("website_enabled = true");
  });

  it("provisions once and records completion", () => {
    expect(migration).toContain("public.provision_country_tables");
    expect(migration).toContain("tables_provisioned = true");
    expect(migration).toContain("provisioned_at = COALESCE");
  });
});
