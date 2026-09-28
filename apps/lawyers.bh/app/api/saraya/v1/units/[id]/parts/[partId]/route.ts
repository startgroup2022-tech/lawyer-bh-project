import { ApiError } from "@/lib/saraya/auth/contracts";
import { handle } from "@/lib/saraya/auth/http";
import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createOfficePartsService } from "@/lib/saraya/property-management/office-parts";
import { officePartsRepository } from "@/lib/saraya/property-management/office-parts-repository";

const service = createOfficePartsService(officePartsRepository);
const propertyIdOf = (request: Request) => {
  const value = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!value) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  return value;
};

export async function DELETE(request: Request, context: { params: Promise<{ id: string; partId: string }> }) {
  return handle(async () => {
    const principal = await requireSarayaPrincipal(request, sessions());
    const { id, partId } = await context.params;
    await service.removeOfficePart(principal, propertyIdOf(request), id, partId);
    return new Response(null, { status: 204 });
  });
}
