import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import {
  createLeaseListService,
  type LeaseListRepository,
} from "./list-service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const ownerId = "33333333-3333-4333-8333-333333333333";
const tenantId = "44444444-4444-4444-8444-444444444444";

function principal(
  role: SarayaPrincipal["memberships"][number]["role"],
): SarayaPrincipal {
  return {
    userId,
    sessionId: "session-1",
    propertyIds: [propertyId],
    memberships: [
      {
        propertyId,
        role,
        ...(role === "owner" ? { ownerId } : {}),
        ...(role === "tenant" ? { tenantId } : {}),
      },
    ],
  };
}

function repository(calls: unknown[]): LeaseListRepository {
  return {
    list: async (scope) => {
      calls.push(scope);
      return [];
    },
  };
}

describe("lease list scope", () => {
  it("lists every property lease for property management", async () => {
    const calls: unknown[] = [];

    await createLeaseListService(repository(calls)).list(
      principal("property_manager"),
      propertyId,
    );

    expect(calls).toEqual([{ propertyId }]);
  });

  it("limits owners and tenants to their own records", async () => {
    const calls: unknown[] = [];
    const service = createLeaseListService(repository(calls));

    await service.list(principal("owner"), propertyId);
    await service.list(principal("tenant"), propertyId);

    expect(calls).toEqual([
      { propertyId, ownerId },
      { propertyId, tenantId },
    ]);
  });
});
