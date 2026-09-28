import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle, jsonBody, text } from "../auth/http";
import type { InvoiceCreateInput } from "./invoice-service";

interface InvoiceHandlerDependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  list(principal: SarayaPrincipal, propertyId?: string): Promise<unknown[]>;
  listTargets(principal: SarayaPrincipal, propertyId: string): Promise<unknown[]>;
  create(principal: SarayaPrincipal, input: InvoiceCreateInput): Promise<unknown>;
}

export function createInvoiceHandlers(dependencies: InvoiceHandlerDependencies) {
  return {
    list(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const url = new URL(request.url);
        const propertyId = url.searchParams.get("propertyId")?.trim() || undefined;
        if (url.searchParams.get("targets") === "true") {
          if (!propertyId) throw new ApiError(422, "PROPERTY_REQUIRED", "اختر العقار", "Select a property");
          return Response.json({ items: await dependencies.listTargets(principal, propertyId) });
        }
        return Response.json({ items: await dependencies.list(principal, propertyId) });
      });
    },
    create(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await jsonBody(request);
        const status = text(body, "status");
        if (status !== "draft" && status !== "due") {
          throw new ApiError(422, "INVALID_INVOICE", "حالة الفاتورة غير صحيحة", "Invalid invoice status");
        }
        const input: InvoiceCreateInput = {
          propertyId: text(body, "propertyId"),
          rentalRequestId: text(body, "rentalRequestId"),
          description: text(body, "description"),
          amount: text(body, "amount"),
          issueDate: text(body, "issueDate"),
          dueDate: text(body, "dueDate"),
          status,
        };
        return Response.json(await dependencies.create(principal, input), { status: 201 });
      });
    },
  };
}
