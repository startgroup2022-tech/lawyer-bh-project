import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type {
  ClientOnboardingOptions,
  OnboardingPropertyOption,
  OnboardingUnitOption,
  OnboardingVirtualAddressOption,
  OwnerOnboardingInput,
  OwnerOnboardingResult,
  TenantOnboardingInput,
  TenantOnboardingResult,
} from "./contracts";

export interface ClientOnboardingRepository {
  listProperties(propertyIds: string[]): Promise<OnboardingPropertyOption[]>;
  listAvailableUnits(propertyId: string): Promise<OnboardingUnitOption[]>;
  listAvailableVirtualAddresses(propertyId: string): Promise<OnboardingVirtualAddressOption[]>;
  createTenantOnboarding(
    input: TenantOnboardingInput & { actorUserId: string },
  ): Promise<TenantOnboardingResult>;
  createOwnerOnboarding(
    input: OwnerOnboardingInput & { actorUserId: string },
  ): Promise<OwnerOnboardingResult>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const moneyPattern = /^\d+(?:\.\d{1,3})?$/;
const managementRoles = new Set(["super_admin", "property_manager"]);

function error(code: string, messageAr: string, messageEn: string, field?: string) {
  return new ApiError(
    422,
    code,
    messageAr,
    messageEn,
    field ? { [field]: [code] } : undefined,
  );
}

function authorizedPropertyIds(principal: SarayaPrincipal) {
  return principal.memberships
    .filter((membership) => managementRoles.has(membership.role))
    .map((membership) => membership.propertyId);
}

function requireProperty(principal: SarayaPrincipal, propertyId: string) {
  if (!uuidPattern.test(propertyId)) {
    throw error("INVALID_PROPERTY", "العقار غير صالح", "Property is invalid", "propertyId");
  }
  if (!authorizedPropertyIds(principal).includes(propertyId)) {
    throw new ApiError(
      403,
      "PROPERTY_ACCESS_DENIED",
      "لا تملك صلاحية لهذا العقار",
      "Property access denied",
    );
  }
}

function text(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw error("REQUIRED", "هذا الحقل مطلوب", "This field is required", field);
  }
  return normalized;
}

function unique(values: string[], code: string, field: string) {
  if (new Set(values).size !== values.length) {
    throw error(code, "لا يمكن تكرار الاختيار", "Selections cannot be duplicated", field);
  }
}

function validDateRange(startDate: string, endDate: string, field: string) {
  if (!datePattern.test(startDate) || !datePattern.test(endDate) || endDate < startDate) {
    throw error("INVALID_DATE_RANGE", "الفترة الزمنية غير صالحة", "Date range is invalid", field);
  }
}

function validMoney(value: string, field: string, allowZero: boolean) {
  if (!moneyPattern.test(value) || !Number.isFinite(Number(value)) || (allowZero ? Number(value) < 0 : Number(value) <= 0)) {
    throw error("INVALID_AMOUNT", "المبلغ غير صالح", "Amount is invalid", field);
  }
}

export function createClientOnboardingService(repository: ClientOnboardingRepository) {
  return {
    async options(
      principal: SarayaPrincipal,
      propertyId?: string,
    ): Promise<ClientOnboardingOptions> {
      const propertyIds = authorizedPropertyIds(principal);
      const properties = await repository.listProperties(propertyIds);
      if (!propertyId) return { properties };
      requireProperty(principal, propertyId);
      const [units, virtualAddresses] = await Promise.all([
        repository.listAvailableUnits(propertyId),
        repository.listAvailableVirtualAddresses(propertyId),
      ]);
      return { properties, units, virtualAddresses };
    },

    async createTenant(principal: SarayaPrincipal, input: TenantOnboardingInput) {
      requireProperty(principal, input.propertyId);
      const units = input.units ?? [];
      const virtualAddresses = input.virtualAddresses ?? [];
      if (units.length === 0 && virtualAddresses.length === 0) {
        throw error(
          "ONBOARDING_ASSET_REQUIRED",
          "اختر وحدة أو عنوانًا افتراضيًا واحدًا على الأقل",
          "Select at least one unit or virtual address",
          "assets",
        );
      }
      unique(
        [...units.map((item) => item.unitId), ...virtualAddresses.map((item) => item.virtualAddressId)],
        "DUPLICATE_ONBOARDING_ASSET",
        "assets",
      );
      for (const [index, unit] of units.entries()) {
        if (!uuidPattern.test(unit.unitId)) throw error("INVALID_UNIT", "الوحدة غير صالحة", "Unit is invalid", `units.${index}.unitId`);
        validDateRange(unit.startDate, unit.endDate, `units.${index}.endDate`);
        validMoney(unit.rentAmount, `units.${index}.rentAmount`, false);
        validMoney(unit.depositAmount, `units.${index}.depositAmount`, true);
        if (!["monthly", "quarterly", "annual"].includes(unit.frequency)) throw error("INVALID_FREQUENCY", "دورية الدفع غير صالحة", "Payment frequency is invalid", `units.${index}.frequency`);
        if (!Number.isInteger(unit.dueDay) || unit.dueDay < 1 || unit.dueDay > 31) throw error("INVALID_DUE_DAY", "يوم الاستحقاق غير صالح", "Due day is invalid", `units.${index}.dueDay`);
        if (!Number.isInteger(unit.graceDays) || unit.graceDays < 0 || unit.graceDays > 365) throw error("INVALID_GRACE_DAYS", "أيام السماح غير صالحة", "Grace days are invalid", `units.${index}.graceDays`);
      }
      for (const [index, address] of virtualAddresses.entries()) {
        if (!uuidPattern.test(address.virtualAddressId)) throw error("INVALID_VIRTUAL_ADDRESS", "العنوان الافتراضي غير صالح", "Virtual address is invalid", `virtualAddresses.${index}.virtualAddressId`);
        validDateRange(address.startDate, address.endDate, `virtualAddresses.${index}.endDate`);
        validMoney(address.monthlyFee, `virtualAddresses.${index}.monthlyFee`, true);
      }
      return repository.createTenantOnboarding({
        ...input,
        nameAr: text(input.nameAr, "nameAr"),
        nameEn: text(input.nameEn, "nameEn"),
        actorUserId: principal.userId,
      });
    },

    async createOwner(principal: SarayaPrincipal, input: OwnerOnboardingInput) {
      if (!input.propertyIds.length) throw error("PROPERTY_REQUIRED", "اختر عقارًا واحدًا على الأقل", "Select at least one property", "propertyIds");
      unique(input.propertyIds, "DUPLICATE_PROPERTY", "propertyIds");
      for (const propertyId of input.propertyIds) requireProperty(principal, propertyId);
      return repository.createOwnerOnboarding({
        ...input,
        nameAr: text(input.nameAr, "nameAr"),
        nameEn: text(input.nameEn, "nameEn"),
        actorUserId: principal.userId,
      });
    },
  };
}
