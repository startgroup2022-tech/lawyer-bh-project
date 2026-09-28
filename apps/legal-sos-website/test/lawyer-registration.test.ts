import { describe, expect, it } from "vitest";

import {
  countryRegistrationProfile,
  lawyerRegistrationError,
  validateCountryRegistration,
} from "@/lib/lawyer-registration";

describe("country-aware lawyer registration", () => {
  it.each([
    ["BH", "+973", "BH"],
    ["SA", "+966", "SA"],
  ])("uses the %s phone and IBAN prefixes", (countryCode, dialCode, ibanPrefix) => {
    expect(countryRegistrationProfile(countryCode)).toEqual({ dialCode, ibanPrefix });
  });

  it("validates the selected country's phone and IBAN", () => {
    expect(validateCountryRegistration("SA", "+966500000000", "SA0380000000608010167519")).toBeNull();
    expect(validateCountryRegistration("SA", "+97330000000", "SA0380000000608010167519")).toBe("INVALID_PHONE");
    expect(validateCountryRegistration("SA", "+966500000000", "BH67BMAG00001299123456")).toBe("INVALID_IBAN");
  });

  it.each(["COUNTRY_UNAVAILABLE", "DUPLICATE_EMAIL", "DUPLICATE_LICENSE", "INVALID_PHONE", "INVALID_IBAN", "INVALID_DOCUMENT", "AGREEMENT_UNAVAILABLE", "AGREEMENT_STALE", "SERVICE_UNAVAILABLE"] as const)(
    "provides localized copy for %s",
    (code) => {
      for (const locale of ["ar", "en", "tr"] as const) {
        expect(lawyerRegistrationError(code, locale).length).toBeGreaterThan(4);
      }
    },
  );
});
