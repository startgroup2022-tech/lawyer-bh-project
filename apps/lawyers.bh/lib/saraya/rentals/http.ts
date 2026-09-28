import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle, jsonBody, text } from "../auth/http";
import type { RentalDecision, RentalSubmitInput } from "./contracts";

interface RentalHandlerDependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  submit(principal: SarayaPrincipal, input: RentalSubmitInput): Promise<unknown>;
  decide(principal: SarayaPrincipal, propertyId: string, requestId: string, decision: RentalDecision): Promise<unknown>;
  listInvoices(principal: SarayaPrincipal, propertyId?: string): Promise<unknown[]>;
}

export function createRentalHandlers(dependencies: RentalHandlerDependencies) {
  return {
    submit(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await jsonBody(request);
        const durationMonths = body.durationMonths;
        if (typeof durationMonths !== "number") {
          throw new ApiError(422, "VALIDATION_ERROR", "تحقق من مدة الإيجار", "Check the lease duration", { durationMonths: ["REQUIRED"] });
        }
        const result = await dependencies.submit(principal, {
          propertyId: text(body, "propertyId"),
          unitId: text(body, "unitId"),
          applicantType: text(body, "applicantType") as RentalSubmitInput["applicantType"],
          applicantNameAr: text(body, "applicantNameAr"),
          applicantNameEn: text(body, "applicantNameEn"),
          ...(typeof body.registrationNumber === "string" ? { registrationNumber: body.registrationNumber } : {}),
          startDate: text(body, "startDate"),
          endDate: text(body, "endDate"),
          durationMonths,
          idDocumentId: text(body, "idDocumentId"),
          idempotencyKey: text(body, "idempotencyKey"),
        });
        return Response.json(result, { status: 201 });
      });
    },

    decide(request: Request, requestId: string) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await jsonBody(request);
        const type = text(body, "decision");
        if (type !== "approve" && type !== "reject") {
          throw new ApiError(422, "INVALID_DECISION", "قرار الطلب غير صحيح", "Invalid rental decision");
        }
        const reason = typeof body.reason === "string" ? body.reason : undefined;
        const decision: RentalDecision = type === "approve"
          ? { type, idempotencyKey: text(body, "idempotencyKey") }
          : { type, idempotencyKey: text(body, "idempotencyKey"), reason };
        return Response.json(await dependencies.decide(principal, text(body, "propertyId"), requestId, decision));
      });
    },

    invoices(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim() || undefined;
        return Response.json({ items: await dependencies.listInvoices(principal, propertyId) });
      });
    },
  };
}
