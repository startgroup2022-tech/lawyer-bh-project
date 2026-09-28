import { requireSarayaPrincipal } from "@/lib/saraya/auth/request";
import { sessions } from "@/lib/saraya/auth/runtime";
import { createInvoiceHandlers } from "@/lib/saraya/rentals/invoice-http";
import { createInvoiceService } from "@/lib/saraya/rentals/invoice-service";
import { invoiceRepository } from "@/lib/saraya/rentals/invoice-repository";

const invoiceService = createInvoiceService(invoiceRepository);
const handlers = createInvoiceHandlers({
  authenticate: (request) => requireSarayaPrincipal(request, sessions()),
  list: invoiceService.list,
  listTargets: invoiceService.listTargets,
  create: invoiceService.create,
});

export const GET = handlers.list;
export const POST = handlers.create;
