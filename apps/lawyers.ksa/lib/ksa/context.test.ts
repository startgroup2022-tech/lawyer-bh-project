import { beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  requireCountryProduct: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({
  sqlClient: Object.assign(vi.fn(), { unsafe: vi.fn() }),
}));
vi.mock("@/lib/countries/product-access", () => ({
  requireCountryProduct: dependencies.requireCountryProduct,
}));

import { assertKsaInputCountry, getKsaContext } from "./context";

describe("KSA context", () => {
  beforeEach(() => {
    dependencies.requireCountryProduct.mockReset().mockResolvedValue({
      code: "SA",
      tablePrefix: "saudi",
      nameAr: "السعودية",
      nameEn: "Saudi Arabia",
      currencyCode: "SAR",
      defaultLocale: "ar",
    });
  });

  it("resolves the Saudi Lawyers product and Saudi table set", async () => {
    const context = await getKsaContext();

    expect(context.country).toMatchObject({ code: "SA", currencyCode: "SAR" });
    expect(context.tables).toMatchObject({
      lawyers: "saudi_lawyers",
      booking_requests: "saudi_booking_requests",
      emergency_requests: "saudi_emergency_requests",
    });
    expect(dependencies.requireCountryProduct).toHaveBeenCalledWith("SA", "lawyers");
  });

  it("rejects a Bahrain country supplied by a public caller", () => {
    expect(() => assertKsaInputCountry("BH")).toThrowError("KSA_COUNTRY_REQUIRED");
  });

  it("rejects a country record with the wrong prefix", async () => {
    dependencies.requireCountryProduct.mockResolvedValueOnce({
      code: "SA",
      tablePrefix: "bahrain",
      nameAr: "السعودية",
      nameEn: "Saudi Arabia",
      currencyCode: "SAR",
      defaultLocale: "ar",
    });

    await expect(getKsaContext()).rejects.toThrowError("KSA_COUNTRY_NOT_PROVISIONED");
  });

  it("maps a disabled Lawyers product to the KSA domain error", async () => {
    dependencies.requireCountryProduct.mockRejectedValueOnce(
      Object.assign(new Error("COUNTRY_PRODUCT_DISABLED"), {
        code: "COUNTRY_PRODUCT_DISABLED",
      }),
    );

    await expect(getKsaContext()).rejects.toThrowError(
      "KSA_LAWYERS_PLATFORM_DISABLED",
    );
  });
});
