import { and, eq, isNull } from "drizzle-orm";

import * as schema from "@/lib/db/schema";

export type ProviderServiceEligibilitySnapshot = {
  status: string | null;
  isActive: boolean;
  suspensionType: string | null;
};

export function isProviderServiceEligible(
  snapshot: ProviderServiceEligibilitySnapshot,
): boolean {
  return (
    snapshot.status === "approved" &&
    snapshot.isActive &&
    snapshot.suspensionType === null
  );
}

export function providerServiceEligibilityCondition() {
  return and(
    eq(schema.bahrainLawyers.status, "approved"),
    eq(schema.bahrainLawyers.isActive, true),
    isNull(schema.bahrainLawyers.suspensionType),
  );
}
