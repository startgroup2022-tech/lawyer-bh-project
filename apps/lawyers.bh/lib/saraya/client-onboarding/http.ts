import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle, jsonBody } from "../auth/http";
import type { OwnerOnboardingInput, TenantOnboardingInput } from "./contracts";

interface Dependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  options(principal: SarayaPrincipal, propertyId?: string): Promise<unknown>;
  createTenant(principal: SarayaPrincipal, input: TenantOnboardingInput): Promise<unknown>;
  createOwner(principal: SarayaPrincipal, input: OwnerOnboardingInput): Promise<unknown>;
}

function invalid(field: string): never {
  throw new ApiError(422, "VALIDATION_ERROR", "تحقق من الحقول المطلوبة", "Check the required fields", { [field]: ["INVALID"] });
}

function array(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) invalid(field);
  return value as Record<string, unknown>[];
}

function stringArray(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) invalid(field);
  return value as string[];
}

function requiredString(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) invalid(field);
  return value.trim();
}

function optionalString(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (value == null) return undefined;
  if (typeof value !== "string") invalid(field);
  return value.trim() || undefined;
}

function integer(body: Record<string, unknown>, field: string) {
  const value = body[field];
  if (!Number.isInteger(value)) invalid(field);
  return value as number;
}

function tenantInput(body: Record<string, unknown>): TenantOnboardingInput {
  const units = array(body, "units").map((item) => ({
    unitId: requiredString(item, "unitId"),
    startDate: requiredString(item, "startDate"),
    endDate: requiredString(item, "endDate"),
    rentAmount: requiredString(item, "rentAmount"),
    depositAmount: requiredString(item, "depositAmount"),
    frequency: requiredString(item, "frequency") as "monthly" | "quarterly" | "annual",
    dueDay: integer(item, "dueDay"),
    graceDays: integer(item, "graceDays"),
  }));
  const virtualAddresses = array(body, "virtualAddresses").map((item) => ({
    virtualAddressId: requiredString(item, "virtualAddressId"),
    businessNameAr: requiredString(item, "businessNameAr"),
    businessNameEn: requiredString(item, "businessNameEn"),
    monthlyFee: requiredString(item, "monthlyFee"),
    startDate: requiredString(item, "startDate"),
    endDate: requiredString(item, "endDate"),
  }));
  const registrationNumber = optionalString(body, "registrationNumber");
  const taxNumber = optionalString(body, "taxNumber");
  return {
    propertyId: requiredString(body, "propertyId"),
    nameAr: requiredString(body, "nameAr"),
    nameEn: requiredString(body, "nameEn"),
    ...(registrationNumber ? { registrationNumber } : {}),
    ...(taxNumber ? { taxNumber } : {}),
    units,
    virtualAddresses,
  };
}

function ownerInput(body: Record<string, unknown>): OwnerOnboardingInput {
  const registrationNumber = optionalString(body, "registrationNumber");
  return {
    propertyIds: stringArray(body, "propertyIds"),
    nameAr: requiredString(body, "nameAr"),
    nameEn: requiredString(body, "nameEn"),
    ...(registrationNumber ? { registrationNumber } : {}),
  };
}

export function createClientOnboardingHandlers(dependencies: Dependencies) {
  return {
    options: (request: Request) => handle(async () => {
      const principal = await dependencies.authenticate(request);
      const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim() || undefined;
      return Response.json(await dependencies.options(principal, propertyId));
    }),
    createTenant: (request: Request) => handle(async () => {
      const principal = await dependencies.authenticate(request);
      return Response.json(await dependencies.createTenant(principal, tenantInput(await jsonBody(request))), { status: 201 });
    }),
    createOwner: (request: Request) => handle(async () => {
      const principal = await dependencies.authenticate(request);
      return Response.json(await dependencies.createOwner(principal, ownerInput(await jsonBody(request))), { status: 201 });
    }),
  };
}
