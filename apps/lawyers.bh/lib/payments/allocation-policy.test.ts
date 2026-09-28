import { describe, expect, it } from "vitest";

import {
  getBookingAllocationMode,
  isPlatformOnlyAllocation,
  requiresProviderPayout,
} from "./allocation-policy";

describe("getBookingAllocationMode", () => {
  it("uses platform-only allocation for an office booking without a lawyer", () => {
    expect(
      getBookingAllocationMode({
        assignmentMode: "office",
        providerId: null,
        payoutReady: false,
      }),
    ).toBe("platform_only");
  });

  it("uses delayed allocation when a selected lawyer is not payout-ready", () => {
    expect(
      getBookingAllocationMode({
        assignmentMode: "lawyer",
        providerId: "018f47de-8f4e-7dd1-9f41-f0f56365e902",
        payoutReady: false,
      }),
    ).toBe("delayed");
  });

  it("uses provider allocation when a selected lawyer is payout-ready", () => {
    expect(
      getBookingAllocationMode({
        assignmentMode: "lawyer",
        providerId: "018f47de-8f4e-7dd1-9f41-f0f56365e902",
        payoutReady: true,
      }),
    ).toBe("provider");
  });
});

describe("platform-only account presentation", () => {
  it("does not classify platform revenue as a provider payout", () => {
    expect(
      isPlatformOnlyAllocation({
        splitMode: "platform_only",
        providerId: null,
      }),
    ).toBe(true);
    expect(
      requiresProviderPayout({
        splitMode: "platform_only",
        providerId: null,
      }),
    ).toBe(false);
  });
});
