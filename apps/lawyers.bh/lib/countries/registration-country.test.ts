import { describe, expect, it } from "vitest";

import { getRegistrationCountryDefinition } from "./registration-country";

describe("registration country definitions", () => {
  it("normalizes a trusted ISO country code", () => {
    expect(getRegistrationCountryDefinition(" tr ")).toMatchObject({
      code: "TR",
      tablePrefix: "turkey",
      defaultLocale: "tr",
      currencyCode: "TRY",
    });
  });

  it("preserves reserved and existing country table prefixes", () => {
    expect(getRegistrationCountryDefinition("BH")?.tablePrefix).toBe(
      "bahrain",
    );
    expect(getRegistrationCountryDefinition("SA")?.tablePrefix).toBe("saudi");
    expect(getRegistrationCountryDefinition("AE")?.tablePrefix).toBe("uae");
  });

  it("derives a deterministic safe prefix for another catalogue country", () => {
    expect(getRegistrationCountryDefinition("US")).toMatchObject({
      code: "US",
      tablePrefix: "country_us",
      currencyCode: "USD",
      defaultLocale: "en",
    });
  });

  it("rejects invalid and non-catalogue country codes", () => {
    expect(getRegistrationCountryDefinition("USA")).toBeNull();
    expect(getRegistrationCountryDefinition("ZZ")).toBeNull();
    expect(getRegistrationCountryDefinition("bahrain")).toBeNull();
  });
});
