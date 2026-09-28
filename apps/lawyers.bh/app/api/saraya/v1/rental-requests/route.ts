import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createRentalHandlers } from "@/lib/saraya/rentals/http";
import { createInvoiceService } from "@/lib/saraya/rentals/invoice-service";
import { invoiceRepository } from "@/lib/saraya/rentals/invoice-repository";
import { rentalRepository } from "@/lib/saraya/rentals/repository";
import { createRentalService } from "@/lib/saraya/rentals/service";
import { createRentalRequestListService } from "@/lib/saraya/rentals/request-list-service";
import { rentalRequestListRepository } from "@/lib/saraya/rentals/request-list-repository";
import { ApiError } from "@/lib/saraya/auth/contracts";
import { handle } from "@/lib/saraya/auth/http";

const rentalService = createRentalService(rentalRepository);
const invoiceService = createInvoiceService(invoiceRepository);
const handlers = createRentalHandlers({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  submit: rentalService.submit,
  decide: rentalService.decide,
  listInvoices: invoiceService.list,
});

export const POST = handlers.submit;

export function GET(request: Request) {
  return handle(async () => {
    const principal = await requireSarayaPrincipal(request, sessions());
    const search = new URL(request.url).searchParams;
    const propertyId = search.get("propertyId")?.trim();
    if (!propertyId) throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
    const rawLimit = search.get("limit");
    const limit = rawLimit === null ? undefined : Number(rawLimit);
    const result = await createRentalRequestListService(rentalRequestListRepository).list(principal, propertyId, {
      ...(search.get("cursor") ? { cursor: search.get("cursor")! } : {}),
      ...(limit === undefined ? {} : { limit }),
    });
    return Response.json(result);
  });
}
