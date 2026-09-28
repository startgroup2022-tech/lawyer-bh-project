import { and, eq } from "drizzle-orm";

import * as schema from "@/lib/db/schema";

export type TapProviderReadinessSnapshot = {
  providerStatus: string | null;
  providerIsActive: boolean;
  environment: "test" | "live" | null;
  expectedEnvironment: "test" | "live";
  onboardingStage: string | null;
  payoutEnabled: boolean;
};

export function isTapProviderReady(
  snapshot: TapProviderReadinessSnapshot,
): boolean {
  return (
    snapshot.providerStatus === "approved" &&
    snapshot.providerIsActive &&
    snapshot.environment === snapshot.expectedEnvironment &&
    snapshot.onboardingStage === "active" &&
    snapshot.payoutEnabled
  );
}

export function tapProviderReadinessCondition(
  environment: "test" | "live",
) {
  return and(
    eq(schema.saudiLawyers.status, "approved"),
    eq(schema.saudiLawyers.isActive, true),
    eq(schema.tapRetailerOnboarding.environment, environment),
    eq(schema.tapRetailerOnboarding.stage, "active"),
    eq(schema.tapRetailerOnboarding.payoutEnabled, true),
  );
}
