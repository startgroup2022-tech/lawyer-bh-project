import { describe, expect, it, vi } from "vitest";
import { TapApiError } from "@/lib/tap/client";
import { createSarayaTapGateway } from "./tap-gateway";

describe("Saraya Tap gateway", () => {
  it("creates a BHD checkout bound to demand, request, and authenticated tenant", async () => {
    const createCharge = vi.fn(async () => ({
      id: "chg_1",
      status: "INITIATED",
      transaction: { url: "https://tap.example/pay" },
    }));
    const gateway = createSarayaTapGateway({
      config: {
        secretKey: "sk_test_x",
        publicKey: "pk_test_x",
        merchantId: "merchant",
        marketplaceMid: "marketplace",
        mode: "test",
        siteUrl: "https://sq.lawyers.bh",
      },
      client: { createCharge, retrieveCharge: vi.fn() },
    });

    await gateway.createCharge({
      demandId: "55555555-5555-4555-8555-555555555555",
      requestId: "66666666-6666-4666-8666-666666666666",
      propertyId: "11111111-1111-4111-8111-111111111111",
      tenantUserId: "22222222-2222-4222-8222-222222222222",
      amount: "550.000",
      currency: "BHD",
      customer: { name: "Tenant", email: "tenant@example.com", phone: "+97339000000" },
      attemptId: "44444444-4444-4444-8444-444444444444",
    });

    expect(createCharge).toHaveBeenCalledWith(expect.objectContaining({
      amount: 550,
      currency: "BHD",
      reference: { order: "55555555-5555-4555-8555-555555555555", idempotent: "44444444-4444-4444-8444-444444444444" },
      redirect: { url: "https://sq.lawyers.bh/saraya/#/rental-requests/66666666-6666-4666-8666-666666666666" },
      post: { url: "https://sq.lawyers.bh/api/saraya/v1/payments/tap/webhook" },
      metadata: {
        rental_request_id: "66666666-6666-4666-8666-666666666666",
        tenant_user_id: "22222222-2222-4222-8222-222222222222",
      },
    }));

    await gateway.createCharge({
      demandId: "55555555-5555-4555-8555-555555555555",
      requestId: "66666666-6666-4666-8666-666666666666",
      propertyId: "11111111-1111-4111-8111-111111111111",
      tenantUserId: "22222222-2222-4222-8222-222222222222",
      amount: "550.000", currency: "BHD", customer: { name: "Tenant", email: null, phone: null },
      attemptId: "77777777-7777-4777-8777-777777777777", returnMode: "native",
    });
    expect(createCharge).toHaveBeenLastCalledWith(expect.objectContaining({
      redirect: { url: "https://sq.lawyers.bh/saraya/rental-requests/66666666-6666-4666-8666-666666666666" },
    }));
  });

  it("retrieves charges server-to-server and normalizes exact amounts", async () => {
    const retrieveCharge = vi.fn(async () => ({
      id: "chg_1",
      status: "CAPTURED",
      amount: 550,
      currency: "BHD",
      reference: { order: "demand-1" },
    }));
    const gateway = createSarayaTapGateway({
      config: { secretKey: "sk", publicKey: "pk", merchantId: "m", marketplaceMid: "mm", mode: "test", siteUrl: "https://sq.lawyers.bh" },
      client: { createCharge: vi.fn(), retrieveCharge },
    });

    await expect(gateway.retrieveCharge("chg_1")).resolves.toMatchObject({ amount: "550.000" });
  });

  it.each([[400, false], [409, true], [429, true], [500, true]])("classifies Tap create status %s ambiguity as %s", async (status, ambiguous) => {
    const gateway = createSarayaTapGateway({
      config: { secretKey: "sk", publicKey: "pk", merchantId: "m", marketplaceMid: "mm", mode: "test", siteUrl: "https://sq.lawyers.bh" },
      client: { createCharge: vi.fn(async () => { throw new TapApiError(status, {}); }), retrieveCharge: vi.fn() },
    });
    await expect(gateway.createCharge({
      demandId: "55555555-5555-4555-8555-555555555555", requestId: "66666666-6666-4666-8666-666666666666",
      propertyId: "11111111-1111-4111-8111-111111111111", tenantUserId: "22222222-2222-4222-8222-222222222222",
      amount: "1.000", currency: "BHD", customer: { name: "Tenant", email: null, phone: null },
      attemptId: "44444444-4444-4444-8444-444444444444",
    })).rejects.toMatchObject({ ambiguous });
  });
});
