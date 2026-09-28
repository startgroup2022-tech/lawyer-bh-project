import { describe, expect, it } from "vitest";

import { isTapProviderReady, type TapProviderReadinessSnapshot } from "./provider-readiness";

const ready = {
  providerStatus: "approved",
  providerIsActive: true,
  environment: "test" as const,
  expectedEnvironment: "test" as const,
  onboardingStage: "active",
  payoutEnabled: true,
};

describe("isTapProviderReady", () => {
  it("accepts an approved active provider whose current Tap retailer can receive payouts", () => {
    expect(isTapProviderReady(ready)).toBe(true);
  });

  it.each<[string, Partial<TapProviderReadinessSnapshot>]>([
    ["unapproved", { providerStatus: "pending" }],
    ["inactive", { providerIsActive: false }],
    ["wrong environment", { environment: "live" }],
    ["KYC pending", { onboardingStage: "tap_kyc_pending" }],
    ["payout disabled", { payoutEnabled: false }],
    ["missing onboarding", { environment: null, onboardingStage: null }],
  ])("rejects %s providers", (_name, overrides) => {
    expect(isTapProviderReady({ ...ready, ...overrides })).toBe(false);
  });
});
