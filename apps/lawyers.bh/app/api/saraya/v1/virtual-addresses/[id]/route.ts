import { ApiError } from "@/lib/saraya/auth/contracts";
import { handle, jsonBody } from "@/lib/saraya/auth/http";
import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { virtualAddressRepository } from "@/lib/saraya/virtual-addresses/repository";
import { createVirtualAddressService } from "@/lib/saraya/virtual-addresses/service";

const service = createVirtualAddressService(virtualAddressRepository);
const optional = (body: Record<string, unknown>, key: string) => {
  const value = body[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) =>
  handle(async () => {
    const principal = await requireSarayaPrincipal(request, sessions());
    const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
    if (!propertyId) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
    const body = await jsonBody(request);
    const status = optional(body, "status");
    if (!["available", "reserved", "active", "suspended", "inactive"].includes(status ?? "")) {
      throw new ApiError(422, "VALIDATION_ERROR", "حالة العنوان غير صالحة", "Address status is invalid");
    }
    const { id } = await context.params;
    return Response.json(await service.update(principal, propertyId, id, {
      status: status as "available" | "reserved" | "active" | "suspended" | "inactive",
      tenantOrganizationId: optional(body, "tenantOrganizationId"),
      businessNameAr: optional(body, "businessNameAr"),
      businessNameEn: optional(body, "businessNameEn"),
      monthlyFee: optional(body, "monthlyFee"),
      startDate: optional(body, "startDate"),
      endDate: optional(body, "endDate"),
    }));
  });
