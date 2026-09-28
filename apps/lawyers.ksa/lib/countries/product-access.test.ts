import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  query: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  sqlClient: Object.assign(database.query, { unsafe: vi.fn() }),
}));

import {
  CountryProductAccessError,
  mapCountryProductAccessError,
  requireCountryProduct,
} from "./product-access";

describe("requireCountryProduct", () => {
  beforeEach(() => {
    database.rows = [];
    database.query.mockReset().mockImplementation(async () => database.rows);
  });

  it("rejects an inactive or unprovisioned country", async () => {
    await expect(requireCountryProduct("SA", "lawyers")).rejects.toMatchObject({
      code: "COUNTRY_NOT_ACTIVE",
    });
  });

  it("rejects Saudi Lawyers when only LegalSOS is enabled", async () => {
    database.rows = [{
      code: "SA",
      table_prefix: "saudi",
      name_ar: "السعودية",
      name_en: "Saudi Arabia",
      currency_code: "SAR",
      default_locale: "ar",
      is_active: true,
      tables_provisioned: true,
      lawyers_platform_enabled: false,
      legal_sos_enabled: true,
    }];

    await expect(requireCountryProduct("SA", "lawyers")).rejects.toMatchObject({
      code: "COUNTRY_PRODUCT_DISABLED",
      countryCode: "SA",
      product: "lawyers",
    });
    await expect(requireCountryProduct("SA", "legal_sos")).resolves.toMatchObject({
      code: "SA",
      tablePrefix: "saudi",
      currencyCode: "SAR",
    });
  });

  it("maps product errors without exposing internal database errors", () => {
    expect(
      mapCountryProductAccessError(
        new CountryProductAccessError(
          "COUNTRY_PRODUCT_DISABLED",
          "SA",
          "lawyers",
        ),
      ),
    ).toEqual({
      status: 403,
      body: { error: "COUNTRY_PRODUCT_DISABLED" },
    });
    expect(mapCountryProductAccessError(new Error("database unavailable"))).toBeNull();
  });

  it("rejects an unsupported product before querying the database", async () => {
    await expect(
      requireCountryProduct("SA", "mobile" as never),
    ).rejects.toMatchObject({ code: "COUNTRY_PRODUCT_INVALID" });
    expect(database.query).not.toHaveBeenCalled();
  });
});
