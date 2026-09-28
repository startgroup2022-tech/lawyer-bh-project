import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { handle } from "@/lib/saraya/auth/http";
import { sessions } from "@/lib/saraya/auth/runtime";
import { virtualAddressRepository } from "@/lib/saraya/virtual-addresses/repository";
import { createVirtualAddressService } from "@/lib/saraya/virtual-addresses/service";
import { ApiError } from "@/lib/saraya/auth/contracts";

const service = createVirtualAddressService(virtualAddressRepository);

export const GET = (request: Request) =>
  handle(async () => {
    const principal = await requireSarayaPrincipal(request, sessions());
    const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
    if (!propertyId) {
      throw new ApiError(
        422,
        "PROPERTY_REQUIRED",
        "العقار مطلوب",
        "Property is required",
      );
    }
    return Response.json({ items: await service.list(principal, propertyId) });
  });
