import { describe, expect, it } from "vitest";

import { canRenewProviderLicense } from "./license-renewal-policy";

describe("canRenewProviderLicense", () => {
  it.each([null, "", "not-a-date", "2026-09-04"])(
    "lets an approved provider recover when the stored expiry is %s",
    (licenseExpiryDate) => {
      expect(
        canRenewProviderLicense({
          status: "approved",
          suspensionType: null,
          licenseExpiryDate,
          today: "2026-09-05",
        }),
      ).toBe(true);
    },
  );

  it("lets a provider suspended for license expiry recover without a stored date", () => {
    expect(
      canRenewProviderLicense({
        status: "suspended",
        suspensionType: "license_expired",
        licenseExpiryDate: null,
        today: "2026-09-05",
      }),
    ).toBe(true);
  });

  it("does not let an unrelated suspension bypass its lock", () => {
    expect(
      canRenewProviderLicense({
        status: "suspended",
        suspensionType: "administrative",
        licenseExpiryDate: null,
        today: "2026-09-05",
      }),
    ).toBe(false);
  });

  it("does not offer renewal while an approved license remains current", () => {
    expect(
      canRenewProviderLicense({
        status: "approved",
        suspensionType: null,
        licenseExpiryDate: "2026-09-06",
        today: "2026-09-05",
      }),
    ).toBe(false);
  });

  it("treats an expiry on the current date as renewable", () => {
    expect(
      canRenewProviderLicense({
        status: "approved",
        suspensionType: null,
        licenseExpiryDate: "2026-09-05",
        today: "2026-09-05",
      }),
    ).toBe(true);
  });
});
