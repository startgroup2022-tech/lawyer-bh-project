import { ApiError, type SarayaPrincipal } from "../auth/contracts";

export interface MaintenanceListScope {
  propertyId: string;
  ownerId?: string;
  tenantId?: string;
}

export interface MaintenanceRepository {
  list(scope: MaintenanceListScope): Promise<unknown[]>;
  create(input: MaintenanceMutation & { propertyId: string; reportedByUserId: string }): Promise<unknown>;
  update(input: MaintenanceMutation & { propertyId: string; id: string; actorUserId: string }): Promise<unknown>;
}

export interface MaintenanceMutation {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status?: "open" | "assigned" | "in_progress" | "awaiting_parts" | "resolved" | "closed" | "cancelled";
  expenseAmount?: string;
}

export function createMaintenanceService(repository: MaintenanceRepository) {
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
        membership.role === "property_manager" ||
        membership.role === "maintenance"
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
        "MAINTENANCE_ACCESS_DENIED",
        "ليست لديك صلاحية عرض طلبات الصيانة",
        "Maintenance access denied",
      );
    },
    async create(principal: SarayaPrincipal, propertyId: string, input: MaintenanceMutation) {
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      if (!["super_admin", "property_manager", "maintenance"].includes(membership.role)) {
        throw new ApiError(403, "MAINTENANCE_EDIT_DENIED", "ليست لديك صلاحية إنشاء بلاغ صيانة", "Maintenance edit denied");
      }
      validate(input);
      return repository.create({ ...input, propertyId, reportedByUserId: principal.userId });
    },
    async update(principal: SarayaPrincipal, propertyId: string, id: string, input: MaintenanceMutation) {
      const membership = principal.memberships.find((item) => item.propertyId === propertyId);
      if (!membership) throw new ApiError(403, "PROPERTY_ACCESS_DENIED", "لا تملك صلاحية لهذا العقار", "Property access denied");
      if (!["super_admin", "property_manager", "maintenance"].includes(membership.role)) {
        throw new ApiError(403, "MAINTENANCE_EDIT_DENIED", "ليست لديك صلاحية تعديل بلاغ الصيانة", "Maintenance edit denied");
      }
      validate(input);
      return repository.update({ ...input, propertyId, id, actorUserId: principal.userId });
    },
  };
}

function validate(input: MaintenanceMutation) {
  if (!input.title.trim() || !input.description.trim()) {
    throw new ApiError(422, "VALIDATION_ERROR", "تحقق من بيانات البلاغ", "Check ticket details");
  }
  const expense = Number(input.expenseAmount ?? "0");
  if (!Number.isFinite(expense) || expense < 0) {
    throw new ApiError(422, "VALIDATION_ERROR", "قيمة المصروفات غير صالحة", "Expense amount is invalid");
  }
}
