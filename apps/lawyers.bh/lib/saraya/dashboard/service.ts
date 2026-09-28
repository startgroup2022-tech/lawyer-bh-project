import { authorize } from "../access/authorize";
import type { SarayaPrincipal } from "../auth/contracts";

export interface DashboardCounts {
  occupiedUnits: number;
  vacantUnits: number;
  tenantCount: number;
  pendingRequests: number;
  dueAmount: string;
  paidAmount: string;
  overdueAmount: string;
  currencyCode: string;
}

export interface DashboardRepository {
  summarize(
    propertyId: string,
    scope: { ownerId?: string },
  ): Promise<DashboardCounts>;
}

export function createDashboardService(repository: DashboardRepository) {
  return {
    async load(principal: SarayaPrincipal, propertyId: string) {
      authorize(principal, { propertyId, permission: "units:read" });
      const membership = principal.memberships.find(
        (item) => item.propertyId === propertyId,
      )!;
      const counts = await repository.summarize(propertyId, {
        ...(membership.role === "owner" && membership.ownerId
          ? { ownerId: membership.ownerId }
          : {}),
      });
      return {
        propertyId,
        role: membership.role,
        ...counts,
      };
    },
  };
}
