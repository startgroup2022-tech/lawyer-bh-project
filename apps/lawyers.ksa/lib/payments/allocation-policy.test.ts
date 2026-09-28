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
      }),
    ).toBe("platform_only");
  });

  it("uses provider allocation when a lawyer is selected", () => {
    expect(
      getBookingAllocationMode({
        assignmentMode: "lawyer",
        providerId: "018f47de-8f4e-7dd1-9f41-f0f56365e902",
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
