import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createRentalHandlers } from "@/lib/saraya/rentals/http";
import { createInvoiceService } from "@/lib/saraya/rentals/invoice-service";
import { invoiceRepository } from "@/lib/saraya/rentals/invoice-repository";
import { rentalRepository } from "@/lib/saraya/rentals/repository";
import { createRentalService } from "@/lib/saraya/rentals/service";

const rentalService = createRentalService(rentalRepository);
const handlers = createRentalHandlers({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  submit: rentalService.submit,
  decide: rentalService.decide,
  listInvoices: createInvoiceService(invoiceRepository).list,
});

export async function POST(request: Request, context: { params: Promise<{ requestId: string }> }) {
  return handlers.decide(request, (await context.params).requestId);
}
