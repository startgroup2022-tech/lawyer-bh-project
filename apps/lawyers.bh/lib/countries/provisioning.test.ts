import { describe, expect, it } from "vitest";

import { parseCountryProvisionInput } from "./provisioning-input";

describe("country database provisioning input", () => {
  it("normalizes the country metadata used by the provisioning trigger", () => {
    expect(
      parseCountryProvisionInput({
        code: "sa",
        phoneCode: " +966 ",
        currencyCode: "sar",
        defaultLocale: "ar",
      }),
    ).toEqual({
      code: "SA",
      phoneCode: "+966",
      currencyCode: "SAR",
      defaultLocale: "ar",
    });
  });

  it.each([
    [{ code: "ZZ", phoneCode: "+1", currencyCode: "USD", defaultLocale: "en" }],
    [{ code: "SA", phoneCode: "966", currencyCode: "SAR", defaultLocale: "ar" }],
    [{ code: "SA", phoneCode: "+966", currencyCode: "RIYAL", defaultLocale: "ar" }],
    [{ code: "SA", phoneCode: "+966", currencyCode: "SAR", defaultLocale: "fr" }],
  ])("rejects invalid or unsupported metadata", (input) => {
    expect(() => parseCountryProvisionInput(input)).toThrow();
  });
});
