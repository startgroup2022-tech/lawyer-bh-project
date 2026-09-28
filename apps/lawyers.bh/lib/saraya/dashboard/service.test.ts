import { describe, expect, it } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createDashboardService, type DashboardRepository } from "./service";

const propertyId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";

const owner: SarayaPrincipal = {
  userId: "33333333-3333-4333-8333-333333333333",
  sessionId: "session",
  propertyIds: [propertyId],
  memberships: [{ propertyId, role: "owner", ownerId }],
};

describe("Saraya dashboard service", () => {
  it("scopes an owner's summary to the authenticated owner", async () => {
    let receivedOwnerId: string | undefined;
    const repository: DashboardRepository = {
      summarize: async (_propertyId, scope) => {
        receivedOwnerId = scope.ownerId;
        return {
          occupiedUnits: 14,
          vacantUnits: 6,
          tenantCount: 11,
          pendingRequests: 3,
          dueAmount: "12800.000",
          paidAmount: "8450.000",
          overdueAmount: "900.000",
          currencyCode: "BHD",
        };
      },
    };

    const result = await createDashboardService(repository).load(owner, propertyId);

    expect(receivedOwnerId).toBe(ownerId);
    expect(result).toEqual({
      propertyId,
      role: "owner",
      occupiedUnits: 14,
      vacantUnits: 6,
      tenantCount: 11,
      pendingRequests: 3,
      dueAmount: "12800.000",
      paidAmount: "8450.000",
      overdueAmount: "900.000",
      currencyCode: "BHD",
    });
  });

  it("rejects a property outside the principal memberships before querying", async () => {
    let queried = false;
    const repository: DashboardRepository = {
      summarize: async () => {
        queried = true;
        return {
          occupiedUnits: 0,
          vacantUnits: 0,
          tenantCount: 0,
          pendingRequests: 0,
          dueAmount: "0.000",
          paidAmount: "0.000",
          overdueAmount: "0.000",
          currencyCode: "BHD",
        };
      },
    };

    await expect(
      createDashboardService(repository).load(
        owner,
        "44444444-4444-4444-8444-444444444444",
      ),
    ).rejects.toMatchObject({ code: "PROPERTY_ACCESS_DENIED" });
    expect(queried).toBe(false);
  });
});
