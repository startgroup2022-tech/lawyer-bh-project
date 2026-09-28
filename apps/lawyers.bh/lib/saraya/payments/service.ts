import { createHash } from "node:crypto";
import type { SarayaRole } from "@/lib/db/saraya-schema";
import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type {
  BeginCheckoutResult,
  CheckoutContext,
  OfflineDecision,
  VerifiedTapCharge,
} from "./contracts";
import { parseBhdMills } from "./bhd";

export interface PaymentRepository {
  beginOnlineCheckout(input: {
    tenantUserId: string;
    requestId: string;
    idempotencyKey: string;
    fingerprint: string;
  }): Promise<BeginCheckoutResult>;
  completeOnlineCheckout(commandId: string, providerReference: string, paymentUrl: string): Promise<{
    demandId: string;
    requestId: string;
    providerReference: string;
    paymentUrl: string;
  }>;
  failOnlineCheckout(commandId: string, failureCode: string): Promise<void>;
  getDemandForProviderVerification(demandId: string): Promise<CheckoutContext | null>;
  reserveTapVerification(chargeId: string, ip: string): Promise<void>;
  markPaid(input: {
    demandId: string;
    provider: "tap" | "offline";
    providerReference: string;
    source: "tap_webhook" | "offline_approval";
    actorUserId: string | null;
  }): Promise<unknown>;
  markTapFailed(input: { demandId: string; providerReference: string; failureCode: string }): Promise<unknown>;
  submitOfflineProof(input: {
    tenantUserId: string;
    demandId: string;
    documentId: string;
    reference: string;
    idempotencyKey: string;
    fingerprint: string;
  }): Promise<unknown>;
  decideOfflinePayment(input: {
    actorUserId: string;
    demandId: string;
    decision: OfflineDecision;
    allowedRoles: readonly SarayaRole[];
    idempotencyKey: string;
    fingerprint: string;
  }): Promise<unknown>;
  findOperation(input: { actorUserId: string; action: "offline_proof.submit" | "offline_payment.decide"; idempotencyKey: string; fingerprint: string }): Promise<unknown | null>;
  readTenantPaymentStatus(tenantUserId: string, requestId: string): Promise<unknown>;
}

export interface SarayaPaymentGateway {
  createCharge(input: CheckoutContext & { attemptId: string; returnMode?: "web" | "native" }): Promise<{ id: string; paymentUrl: string }>;
  retrieveCharge(chargeId: string): Promise<VerifiedTapCharge>;
}

function checkoutFingerprint(tenantUserId: string, requestId: string) {
  return createHash("sha256").update(JSON.stringify({ tenantUserId, requestId })).digest("hex");
}

function payloadFingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function verificationFailed() {
  return new ApiError(422, "PAYMENT_VERIFICATION_FAILED", "تعذر التحقق من عملية الدفع", "Payment verification failed");
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function validUuid(value: string, field: string) {
  if (!uuidPattern.test(value)) throw new ApiError(404, "PAYMENT_NOT_FOUND", "عملية الدفع غير موجودة", "Payment not found", { [field]: ["invalid"] });
  return value.toLowerCase();
}

export interface PaidLeaseCheckout {
  createForPaidRequest(propertyId: string, requestId: string): Promise<{ leaseId: string }>;
}

export function createPaymentService(repository: PaymentRepository, gateway: SarayaPaymentGateway, leaseCheckout?: PaidLeaseCheckout) {
  const createLeaseAfterPayment = async (result: unknown) => {
    if (!leaseCheckout || !result || typeof result !== "object") return result;
    const value = result as { status?: string; propertyId?: string; requestId?: string };
    if (value.status === "paid" && value.propertyId && value.requestId) {
      const lease = await leaseCheckout.createForPaidRequest(value.propertyId, value.requestId);
      return { ...value, leaseId: lease.leaseId };
    }
    return result;
  };
  return {
    async createOnlineSession(principal: SarayaPrincipal, requestId: string, idempotencyKey: string, returnMode: "web" | "native" = "web") {
      requestId = validUuid(requestId, "requestId");
      idempotencyKey = idempotencyKey.trim();
      if (!idempotencyKey || idempotencyKey.length > 128) throw new ApiError(422, "INVALID_IDEMPOTENCY_KEY", "مفتاح الطلب غير صالح", "Invalid idempotency key");
      const started = await repository.beginOnlineCheckout({
        tenantUserId: principal.userId,
        requestId,
        idempotencyKey,
        fingerprint: checkoutFingerprint(principal.userId, requestId),
      });
      if (started.kind === "existing") return started;
      let charge: { id: string; paymentUrl: string };
      try {
        charge = await gateway.createCharge({ ...started, attemptId: started.commandId, returnMode });
      } catch (error) {
        if (typeof error === "object" && error !== null && "ambiguous" in error && error.ambiguous === false) {
          await repository.failOnlineCheckout(started.commandId, "TAP_CREATE_REJECTED");
          throw new ApiError(422, "PAYMENT_PROVIDER_REJECTED", "رفضت بوابة الدفع إنشاء العملية", "The payment provider rejected the charge");
        }
        throw new ApiError(502, "PAYMENT_PROVIDER_UNAVAILABLE", "بوابة الدفع غير متاحة حاليًا", "The payment provider is currently unavailable");
      }
      return repository.completeOnlineCheckout(started.commandId, charge.id, charge.paymentUrl);
    },

    readReturn(principal: SarayaPrincipal, requestId: string) {
      return repository.readTenantPaymentStatus(principal.userId, requestId);
    },

    async confirmTapCharge(chargeId: string, ip = "unknown") {
      await repository.reserveTapVerification(chargeId, ip);
      let charge: VerifiedTapCharge;
      try {
        charge = await gateway.retrieveCharge(chargeId);
      } catch (error) {
        if (error instanceof Error && error.message === "INVALID_BHD_AMOUNT") throw verificationFailed();
        throw new ApiError(502, "PAYMENT_PROVIDER_UNAVAILABLE", "تعذر التحقق من بوابة الدفع", "Could not verify the payment provider");
      }
      const demandId = charge.reference.order;
      if (!demandId) throw verificationFailed();
      const demand = await repository.getDemandForProviderVerification(demandId);
      if (!demand) throw verificationFailed();
      const metadata = charge.metadata;
      let amountMatches = false;
      try { amountMatches = parseBhdMills(charge.amount) === parseBhdMills(demand.amount); } catch { amountMatches = false; }
      if (
        demand.demandId !== demandId
        || !amountMatches
        || charge.currency !== "BHD"
        || demand.currency !== "BHD"
        || (demand.providerReference && demand.providerReference !== charge.id)
        || (metadata?.rental_request_id && metadata.rental_request_id !== demand.requestId)
        || (metadata?.tenant_user_id && metadata.tenant_user_id !== demand.tenantUserId)
      ) throw verificationFailed();
      if (["DECLINED", "CANCELLED", "FAILED", "EXPIRED"].includes(charge.status)) {
        return repository.markTapFailed({ demandId, providerReference: charge.id, failureCode: `TAP_${charge.status}` });
      }
      if (charge.status !== "CAPTURED") throw verificationFailed();
      return createLeaseAfterPayment(await repository.markPaid({
        demandId,
        provider: "tap",
        providerReference: charge.id,
        source: "tap_webhook",
        actorUserId: null,
      }));
    },

    submitOfflineProof(
      principal: SarayaPrincipal,
      demandId: string,
      documentId: string,
      reference: string,
      idempotencyKey: string,
    ) {
      demandId = validUuid(demandId, "demandId");
      documentId = validUuid(documentId, "documentId");
      reference = reference.trim();
      if (!reference || reference.length > 160) throw new ApiError(422, "INVALID_PAYMENT_REFERENCE", "مرجع الدفع غير صالح", "Invalid payment reference");
      idempotencyKey = idempotencyKey.trim();
      if (!idempotencyKey || idempotencyKey.length > 128) throw new ApiError(422, "INVALID_IDEMPOTENCY_KEY", "مفتاح الطلب غير صالح", "Invalid idempotency key");
      const fingerprint = payloadFingerprint({ demandId, documentId, reference });
      return repository.submitOfflineProof({
        tenantUserId: principal.userId,
        demandId,
        documentId,
        reference,
        idempotencyKey,
        fingerprint,
      });
    },

    decideOfflinePayment(principal: SarayaPrincipal, demandId: string, decision: OfflineDecision, idempotencyKey: string) {
      demandId = validUuid(demandId, "demandId");
      idempotencyKey = idempotencyKey.trim();
      if (!idempotencyKey || idempotencyKey.length > 128) throw new ApiError(422, "INVALID_IDEMPOTENCY_KEY", "مفتاح الطلب غير صالح", "Invalid idempotency key");
      return repository.decideOfflinePayment({
        actorUserId: principal.userId,
        demandId,
        decision,
        allowedRoles: ["accountant", "property_manager", "super_admin"],
        idempotencyKey,
        fingerprint: payloadFingerprint({ demandId, decision }),
      }).then(createLeaseAfterPayment);
    },
  };
}
