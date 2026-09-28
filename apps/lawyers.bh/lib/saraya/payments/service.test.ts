import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createPaymentService, type PaymentRepository } from "./service";

const tenant: SarayaPrincipal = {
  userId: "22222222-2222-4222-8222-222222222222",
  sessionId: "session",
  propertyIds: [],
  memberships: [],
};

const manager: SarayaPrincipal = {
  userId: "33333333-3333-4333-8333-333333333333",
  sessionId: "session",
  propertyIds: ["11111111-1111-4111-8111-111111111111"],
  memberships: [{
    propertyId: "11111111-1111-4111-8111-111111111111",
    role: "property_manager",
  }],
};

const checkout = {
  commandId: "44444444-4444-4444-8444-444444444444",
  kind: "create" as const,
  demandId: "55555555-5555-4555-8555-555555555555",
  requestId: "66666666-6666-4666-8666-666666666666",
  propertyId: "11111111-1111-4111-8111-111111111111",
  tenantUserId: tenant.userId,
  amount: "550.000",
  currency: "BHD" as const,
  customer: { name: "Tenant", email: "tenant@example.com", phone: "+97339000000" },
};

function repository(overrides: Partial<PaymentRepository> = {}): PaymentRepository {
  return {
    beginOnlineCheckout: vi.fn(async () => checkout),
    completeOnlineCheckout: vi.fn(async (_commandId, providerReference, paymentUrl) => ({
      demandId: checkout.demandId,
      requestId: checkout.requestId,
      providerReference,
      paymentUrl,
    })),
    failOnlineCheckout: vi.fn(async () => undefined),
    getDemandForProviderVerification: vi.fn(async () => checkout),
    markPaid: vi.fn(async () => ({ status: "paid", requestStatus: "paid_awaiting_signature" })),
    submitOfflineProof: vi.fn(async () => ({ status: "verification_pending" })),
    decideOfflinePayment: vi.fn(async () => ({ status: "paid", requestStatus: "paid_awaiting_signature" })),
    readTenantPaymentStatus: vi.fn(async () => ({ status: "pending" })),
    markTapFailed: vi.fn(async () => ({ status: "failed" })),
    reserveTapVerification: vi.fn(async () => undefined),
    findOperation: vi.fn(async () => null),
    ...overrides,
  };
}

describe("Saraya payment service", () => {
  it("persists the Tap provider reference before returning the checkout URL", async () => {
    const order: string[] = [];
    const repo = repository({
      completeOnlineCheckout: vi.fn(async (_commandId, providerReference, paymentUrl) => {
        order.push("persist");
        return { demandId: checkout.demandId, requestId: checkout.requestId, providerReference, paymentUrl };
      }),
    });
    const service = createPaymentService(repo, {
      createCharge: vi.fn(async () => {
        order.push("tap");
        return { id: "chg_1", paymentUrl: "https://tap.example/pay" };
      }),
      retrieveCharge: vi.fn(),
    });

    const result = await service.createOnlineSession(tenant, checkout.requestId, "idem-1");

    expect(order).toEqual(["tap", "persist"]);
    expect(result).toMatchObject({ providerReference: "chg_1", paymentUrl: "https://tap.example/pay" });
  });

  it("keeps an ambiguous create timeout resumable with the same stable attempt", async () => {
    const repo = repository();
    const gateway = { createCharge: vi.fn(async () => { throw Object.assign(new Error("timeout"), { ambiguous: true }); }), retrieveCharge: vi.fn() };
    const service = createPaymentService(repo, gateway);
    await expect(service.createOnlineSession(tenant, checkout.requestId, "idem-timeout")).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_UNAVAILABLE" });
    expect(repo.failOnlineCheckout).not.toHaveBeenCalled();
    expect(gateway.createCharge).toHaveBeenCalledWith(expect.objectContaining({ attemptId: checkout.commandId }));
  });

  it("marks a definitively rejected create attempt failed so a new key can retry", async () => {
    const repo = repository();
    const gateway = { createCharge: vi.fn(async () => { throw Object.assign(new Error("invalid"), { ambiguous: false }); }), retrieveCharge: vi.fn() };
    const service = createPaymentService(repo, gateway);
    await expect(service.createOnlineSession(tenant, checkout.requestId, "idem-rejected")).rejects.toMatchObject({ code: "PAYMENT_PROVIDER_REJECTED" });
    expect(repo.failOnlineCheckout).toHaveBeenCalledWith(checkout.commandId, "TAP_CREATE_REJECTED");
  });

  it("does not mark a demand paid from a browser return", async () => {
    const repo = repository();
    const service = createPaymentService(repo, { createCharge: vi.fn(), retrieveCharge: vi.fn() });

    await service.readReturn(tenant, checkout.requestId);

    expect(repo.markPaid).not.toHaveBeenCalled();
  });

  it("marks one demand paid after a captured server-side Tap lookup", async () => {
    const repo = repository();
    const service = createPaymentService(repo, {
      createCharge: vi.fn(),
      retrieveCharge: vi.fn(async () => ({
        id: "chg_1",
        status: "CAPTURED",
        amount: "550.000",
        currency: "BHD",
        reference: { order: checkout.demandId },
        metadata: { rental_request_id: checkout.requestId, tenant_user_id: tenant.userId },
      })),
    });

    await service.confirmTapCharge("chg_1", "203.0.113.10");
    await service.confirmTapCharge("chg_1", "203.0.113.10");

    expect(repo.markPaid).toHaveBeenCalledTimes(2);
    expect(repo.markPaid).toHaveBeenNthCalledWith(1, expect.objectContaining({
      demandId: checkout.demandId,
      providerReference: "chg_1",
      source: "tap_webhook",
    }));
  });

  it("creates the lease package after verified payment and returns its id", async () => {
    const repo = repository({ markPaid: vi.fn(async () => ({ status: "paid", propertyId: checkout.propertyId, requestId: checkout.requestId })) });
    const leaseCheckout = { createForPaidRequest: vi.fn(async () => ({ leaseId: "lease-1" })) };
    const service = createPaymentService(repo, {
      createCharge: vi.fn(),
      retrieveCharge: vi.fn(async () => ({ id: "chg_1", status: "CAPTURED", amount: "550.000", currency: "BHD", reference: { order: checkout.demandId } })),
    }, leaseCheckout);

    await expect(service.confirmTapCharge("chg_1")).resolves.toMatchObject({ leaseId: "lease-1" });
    expect(leaseCheckout.createForPaidRequest).toHaveBeenCalledWith(checkout.propertyId, checkout.requestId);
  });

  it.each([
    ["amount", { amount: "549.999" }],
    ["currency", { currency: "USD" }],
    ["demand", { reference: { order: "77777777-7777-4777-8777-777777777777" } }],
    ["tenant", { metadata: { rental_request_id: checkout.requestId, tenant_user_id: manager.userId } }],
  ])("rejects a captured lookup with mismatched %s", async (_field, override) => {
    const repo = repository();
    const service = createPaymentService(repo, {
      createCharge: vi.fn(),
      retrieveCharge: vi.fn(async () => ({
        id: "chg_1",
        status: "CAPTURED",
        amount: "550.000",
        currency: "BHD",
        reference: { order: checkout.demandId },
        metadata: { rental_request_id: checkout.requestId, tenant_user_id: tenant.userId },
        ...override,
      })),
    });

    await expect(service.confirmTapCharge("chg_1")).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });
    expect(repo.markPaid).not.toHaveBeenCalled();
  });

  it("rejects a captured charge that differs from the persisted provider reference", async () => {
    const repo = repository({
      getDemandForProviderVerification: vi.fn(async () => ({ ...checkout, providerReference: "chg_expected" })),
    });
    const service = createPaymentService(repo, {
      createCharge: vi.fn(),
      retrieveCharge: vi.fn(async () => ({
        id: "chg_other", status: "CAPTURED", amount: "550.000", currency: "BHD",
        reference: { order: checkout.demandId },
      })),
    });
    await expect(service.confirmTapCharge("chg_other")).rejects.toMatchObject({ code: "PAYMENT_VERIFICATION_FAILED" });
  });

  it.each(["DECLINED", "CANCELLED", "FAILED", "EXPIRED"])("records terminal Tap state %s and permits a safe retry", async (status) => {
    const repo = repository();
    const service = createPaymentService(repo, {
      createCharge: vi.fn(),
      retrieveCharge: vi.fn(async () => ({
        id: "chg_1", status, amount: "550.000", currency: "BHD",
        reference: { order: checkout.demandId },
        metadata: { rental_request_id: checkout.requestId, tenant_user_id: tenant.userId },
      })),
    });
    await service.confirmTapCharge("chg_1", "203.0.113.10");
    expect(repo.markTapFailed).toHaveBeenCalledWith(expect.objectContaining({
      demandId: checkout.demandId,
      providerReference: "chg_1",
      failureCode: `TAP_${status}`,
    }));
  });

  it("rate limits a signed webhook before calling Tap", async () => {
    const repo = repository({ reserveTapVerification: vi.fn(async () => { throw Object.assign(new Error(), { code: "PAYMENT_WEBHOOK_RATE_LIMITED" }); }) });
    const gateway = { createCharge: vi.fn(), retrieveCharge: vi.fn() };
    const service = createPaymentService(repo, gateway);
    await expect(service.confirmTapCharge("chg_1", "203.0.113.10")).rejects.toMatchObject({ code: "PAYMENT_WEBHOOK_RATE_LIMITED" });
    expect(gateway.retrieveCharge).not.toHaveBeenCalled();
  });

  it("lets only the bound tenant submit an offline proof", async () => {
    const repo = repository();
    const service = createPaymentService(repo, { createCharge: vi.fn(), retrieveCharge: vi.fn() });

    await service.submitOfflineProof(tenant, checkout.demandId, "88888888-8888-4888-8888-888888888888", "bank-1", "proof-key");

    expect(repo.submitOfflineProof).toHaveBeenCalledWith(expect.objectContaining({ tenantUserId: tenant.userId }));
  });

  it("allows accountant, property manager, and super admin to decide offline payment", async () => {
    const repo = repository();
    const service = createPaymentService(repo, { createCharge: vi.fn(), retrieveCharge: vi.fn() });

    await service.decideOfflinePayment(manager, checkout.demandId, { type: "approve" }, "decision-key");

    expect(repo.decideOfflinePayment).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: manager.userId,
      allowedRoles: ["accountant", "property_manager", "super_admin"],
    }));
  });
});
