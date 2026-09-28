import { ApiError } from "@/lib/saraya/auth/contracts";
import { handle } from "@/lib/saraya/auth/http";
import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { dashboardRepository } from "@/lib/saraya/dashboard/repository";
import { createDashboardService } from "@/lib/saraya/dashboard/service";

const service = createDashboardService(dashboardRepository);

export function GET(request: Request) {
  return handle(async () => {
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
    return Response.json(await service.load(principal, propertyId));
  });
}
