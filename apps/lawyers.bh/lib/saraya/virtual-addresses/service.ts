import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type { VirtualAddress } from "./contracts";

export interface VirtualAddressRepository {
  list(propertyId: string): Promise<VirtualAddress[]>;
  update(input: VirtualAddressUpdate & {
    propertyId: string;
    id: string;
    actorUserId: string;
  }): Promise<VirtualAddress>;
}

export interface VirtualAddressUpdate {
  status: VirtualAddress["status"];
  tenantOrganizationId?: string | null;
  businessNameAr?: string | null;
  businessNameEn?: string | null;
  monthlyFee?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

const allowedRoles = new Set(["super_admin", "property_manager", "accountant"]);

export function createVirtualAddressService(
  repository: VirtualAddressRepository,
) {
  return {
    async list(principal: SarayaPrincipal, propertyId: string) {
      const membership = principal.memberships.find(
        (candidate) => candidate.propertyId === propertyId,
      );
      if (!membership) {
        throw new ApiError(
          403,
          "PROPERTY_ACCESS_DENIED",
          "لا تملك صلاحية لهذا العقار",
          "Property access denied",
        );
      }
      if (!allowedRoles.has(membership.role)) {
        throw new ApiError(
          403,
          "VIRTUAL_ADDRESS_ACCESS_DENIED",
          "ليست لديك صلاحية عرض العناوين الافتراضية",
          "Virtual-address access denied",
        );
      }
      return repository.list(propertyId);
    },
    async update(
      principal: SarayaPrincipal,
      propertyId: string,
      id: string,
      input: VirtualAddressUpdate,
    ) {
      const membership = principal.memberships.find(
        (candidate) => candidate.propertyId === propertyId,
      );
      if (!membership) {
        throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      }
      if (!["super_admin", "property_manager"].includes(membership.role)) {
        throw new ApiError(403, "VIRTUAL_ADDRESS_EDIT_DENIED", "ليست لديك صلاحية تعديل العناوين الافتراضية", "Virtual-address edit access denied");
      }
      if (!id.trim()) {
        throw new ApiError(422, "VALIDATION_ERROR", "العنوان مطلوب", "Address is required");
      }
      const amount = input.monthlyFee == null ? null : Number(input.monthlyFee);
      if (amount != null && (!Number.isFinite(amount) || amount < 0)) {
        throw new ApiError(422, "VALIDATION_ERROR", "قيمة الرسوم غير صالحة", "Monthly fee is invalid");
      }
      return repository.update({ ...input, propertyId, id, actorUserId: principal.userId });
    },
  };
}
