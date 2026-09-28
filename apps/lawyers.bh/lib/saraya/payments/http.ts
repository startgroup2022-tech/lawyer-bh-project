import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle, text } from "../auth/http";
import type { OfflineDecision } from "./contracts";
import { paymentWebhookBodyLimit, readPaymentJson, readPaymentText } from "./body";

interface PaymentHandlersDependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  createOnlineSession(principal: SarayaPrincipal, requestId: string, idempotencyKey: string, returnMode?: "web" | "native"): Promise<unknown>;
  readReturn(principal: SarayaPrincipal, requestId: string): Promise<unknown>;
  confirmTapCharge(chargeId: string, ip: string): Promise<unknown>;
  submitOfflineProof(principal: SarayaPrincipal, demandId: string, documentId: string, reference: string, idempotencyKey: string): Promise<unknown>;
  decideOfflinePayment(principal: SarayaPrincipal, demandId: string, decision: OfflineDecision, idempotencyKey: string): Promise<unknown>;
  uploadOfflineProof?(request: Request, principal: SarayaPrincipal, demandId: string, idempotencyKey: string): Promise<unknown>;
  verifyWebhook(rawBody: string, signature: string | null): Promise<boolean>;
  clientIp(request: Request): string;
}

function idempotencyKey(request: Request, body?: Record<string, unknown>) {
  const header = request.headers.get("idempotency-key")?.trim();
  if (header) return header;
  return body ? text(body, "idempotencyKey") : "";
}

export function createPaymentHandlers(dependencies: PaymentHandlersDependencies) {
  return {
    session(request: Request, requestId: string) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await readPaymentJson(request);
        const key = request.headers.get("idempotency-key")?.trim() || text(body, "idempotencyKey");
        const returnMode = request.headers.get("x-saraya-client") === "native" && body.returnMode === "native" ? "native" : "web";
        return Response.json(await dependencies.createOnlineSession(principal, requestId, key, returnMode), { status: 201 });
      });
    },
    paymentReturn(request: Request, requestId: string) {
      return handle(async () => Response.json(
        await dependencies.readReturn(await dependencies.authenticate(request), requestId),
        { headers: { "cache-control": "private, no-store" } },
      ));
    },
    webhook(request: Request) {
      return handle(async () => {
        const rawBody = await readPaymentText(request, paymentWebhookBodyLimit);
        if (!await dependencies.verifyWebhook(rawBody, request.headers.get("hashstring"))) {
          throw new ApiError(401, "INVALID_PAYMENT_SIGNATURE", "توقيع حدث الدفع غير صالح", "Invalid payment signature");
        }
        let body: Record<string, unknown>;
        try { body = JSON.parse(rawBody) as Record<string, unknown>; } catch { throw new ApiError(400, "INVALID_JSON", "صيغة الطلب غير صالحة", "Invalid JSON body"); }
        const chargeId = typeof body.id === "string" ? body.id : typeof body.tap_id === "string" ? body.tap_id : "";
        if (!chargeId || chargeId.length > 160) throw new ApiError(422, "INVALID_PAYMENT_EVENT", "حدث الدفع غير صالح", "Invalid payment event");
        await dependencies.confirmTapCharge(chargeId, dependencies.clientIp(request));
        return Response.json({ accepted: true });
      });
    },
    offlineProof(request: Request, demandId: string) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const key = request.headers.get("idempotency-key")?.trim() ?? "";
        if (request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
          if (!dependencies.uploadOfflineProof) throw new ApiError(503, "PAYMENT_PROOF_UPLOAD_UNAVAILABLE", "رفع الإثبات غير متاح", "Payment proof upload is unavailable");
          return Response.json(await dependencies.uploadOfflineProof(request, principal, demandId, key), { status: 201 });
        }
        const body = await readPaymentJson(request);
        return Response.json(await dependencies.submitOfflineProof(
          principal,
          demandId,
          text(body, "documentId"),
          text(body, "reference"),
          key || idempotencyKey(request, body),
        ), { status: 201 });
      });
    },
    offlineDecision(request: Request, demandId: string) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await readPaymentJson(request);
        const key = idempotencyKey(request, body);
        const kind = text(body, "decision");
        const decision: OfflineDecision = kind === "approve"
          ? { type: "approve" }
          : kind === "reject"
            ? { type: "reject", failureCode: text(body, "failureCode") }
            : (() => { throw new ApiError(422, "INVALID_PAYMENT_DECISION", "قرار الدفع غير صالح", "Invalid payment decision"); })();
        return Response.json(await dependencies.decideOfflinePayment(principal, demandId, decision, key));
      });
    },
  };
}
