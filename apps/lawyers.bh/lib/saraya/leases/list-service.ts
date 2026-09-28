import { ApiError, type SarayaPrincipal } from "../auth/contracts";

export interface LeaseListScope {
  propertyId: string;
  ownerId?: string;
  tenantId?: string;
}

export interface LeaseListRepository {
  list(scope: LeaseListScope): Promise<unknown[]>;
}

export function createLeaseListService(repository: LeaseListRepository) {
  return {
    async list(principal: SarayaPrincipal, propertyId: string) {
      const membership = principal.memberships.find(
        (item) => item.propertyId === propertyId,
      );
      if (!membership) {
        throw new ApiError(
          403,
          "PROPERTY_ACCESS_DENIED",
          "لا تملك صلاحية لهذا العقار",
          "Property access denied",
        );
      }
      if (
        membership.role === "super_admin" ||
        membership.role === "property_manager"
      ) {
        return repository.list({ propertyId });
      }
      if (membership.role === "owner" && membership.ownerId) {
        return repository.list({ propertyId, ownerId: membership.ownerId });
      }
      if (membership.role === "tenant" && membership.tenantId) {
        return repository.list({ propertyId, tenantId: membership.tenantId });
      }
      throw new ApiError(
        403,
        "LEASE_ACCESS_DENIED",
        "ليست لديك صلاحية عرض العقود",
        "Lease access denied",
      );
    },
  };
}
