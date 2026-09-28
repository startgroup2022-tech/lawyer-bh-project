import { ApiError } from "@/lib/saraya/auth/contracts";
import { authorize } from "@/lib/saraya/access/authorize";
import { handle, jsonBody } from "@/lib/saraya/auth/http";
import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createOfficePartsService, type OfficePartInput } from "@/lib/saraya/property-management/office-parts";
import { officePartsRepository } from "@/lib/saraya/property-management/office-parts-repository";

const service = createOfficePartsService(officePartsRepository);
const propertyIdOf = (request: Request) => {
  const value = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!value) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  return value;
};

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const principal = await requireSarayaPrincipal(request, sessions());
    const propertyId = propertyIdOf(request);
    authorize(principal, { propertyId, permission: "units:read" });
    const parentUnitId = (await context.params).id;
    const parent = await officePartsRepository.getUnit(propertyId, parentUnitId);
    if (!parent) {
      throw new ApiError(404, "NOT_FOUND", "المكتب غير موجود", "Office not found");
    }
    return Response.json({ parent, parts: await officePartsRepository.listParts(propertyId, parentUnitId) });
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const principal = await requireSarayaPrincipal(request, sessions());
    const propertyId = propertyIdOf(request);
    const parentUnitId = (await context.params).id;
    const body = await jsonBody(request);
    const result = Array.isArray(body.parts)
      ? await service.divideOffice(principal, propertyId, parentUnitId, { parts: body.parts as OfficePartInput[] })
      : await service.addOfficePart(principal, propertyId, parentUnitId, body as unknown as OfficePartInput);
    return Response.json(result, { status: 201 });
  });
}
