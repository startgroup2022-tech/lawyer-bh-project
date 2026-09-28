import { describe, expect, it } from "vitest";

import { isProviderServiceEligible } from "./service-eligibility";

describe("provider service eligibility", () => {
  const approved = {
    status: "approved",
    isActive: true,
    suspensionType: null,
  };

  it("allows an approved active provider independently of Tap metadata", () => {
    const providerWithPendingTap = {
      ...approved,
      tapReady: false,
    };

    expect(isProviderServiceEligible(providerWithPendingTap)).toBe(true);
  });

  it.each([
    ["pending approval", { ...approved, status: "pending" }],
    ["inactive", { ...approved, isActive: false }],
    ["suspended", { ...approved, suspensionType: "temporary" }],
  ])("rejects a %s provider", (_label, provider) => {
    expect(isProviderServiceEligible(provider)).toBe(false);
  });
});
