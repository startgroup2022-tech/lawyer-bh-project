import { describe, expect, it, vi } from "vitest";

import {
  RegistrationRoutingError,
  resolveRegistrationCountry,
  resolveRegistrationDestination,
} from "./legalsos-registration";

const bahrain = {
  code: "BH",
  tablePrefix: "bahrain",
};

const saudi = {
  code: "SA",
  tablePrefix: "saudi",
};

const turkey = {
  code: "TR",
  tablePrefix: "turkey",
};

describe("LegalSOS lawyer registration routing", () => {
  it("routes Bahrain and Saudi Arabia to separate lawyer tables", () => {
    expect(resolveRegistrationDestination(bahrain)).toBe("bahrain_lawyers");
    expect(resolveRegistrationDestination(saudi)).toBe("saudi_lawyers");
  });

  it("routes another trusted registration country to its own lawyer table", () => {
    expect(resolveRegistrationDestination(turkey)).toBe("turkey_lawyers");
  });

  it("rejects a country prefix that could cross country tables", () => {
    expect(() =>
      resolveRegistrationDestination({ code: "SA", tablePrefix: "bahrain" }),
    ).toThrowError("country_table_mismatch");
  });

  it("rejects an unavailable country", async () => {
    const formData = new FormData();
    formData.set("countryCode", "SA");

    await expect(
      resolveRegistrationCountry({
        formData,
        channel: "legalsos-web",
        loadCountry: vi.fn(async () => null),
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<RegistrationRoutingError>>({
        code: "COUNTRY_UNAVAILABLE",
      }),
    );
  });

  it("ignores client supplied table routing fields", async () => {
    const formData = new FormData();
    formData.set("countryCode", "SA");
    formData.set("table", "bahrain_lawyers");
    formData.set("tableName", "bahrain_lawyers");
    formData.set("tablePrefix", "bahrain");
    const loadCountry = vi.fn(async () => saudi);

    await expect(
      resolveRegistrationCountry({
        formData,
        channel: "legalsos-mobile",
        loadCountry,
      }),
    ).resolves.toEqual({
      country: saudi,
      lawyersTable: "saudi_lawyers",
    });
    expect(loadCountry).toHaveBeenCalledWith("SA");
  });

  it("keeps the public Lawyers.bh registration Bahrain-only", async () => {
    const formData = new FormData();
    formData.set("countryCode", "SA");
    const loadCountry = vi.fn(async () => bahrain);

    await expect(
      resolveRegistrationCountry({
        formData,
        channel: "lawyers-bh-web",
        loadCountry,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<RegistrationRoutingError>>({
        code: "WEBSITE_BAHRAIN_ONLY",
      }),
    );
    expect(loadCountry).not.toHaveBeenCalled();
  });
});
