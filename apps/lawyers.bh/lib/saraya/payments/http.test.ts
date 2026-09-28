import { describe, expect, it, vi } from "vitest";
import type { SarayaPrincipal } from "../auth/contracts";
import { createPaymentHandlers } from "./http";

const principal: SarayaPrincipal = { userId: "user", sessionId: "session", propertyIds: [], memberships: [] };

function handlers(uploadOfflineProof = vi.fn(async () => ({ status: "verification_pending" })), verifyWebhook = vi.fn(async () => true)) {
  return createPaymentHandlers({
    authenticate: vi.fn(async () => principal),
    createOnlineSession: vi.fn(async () => ({ paymentUrl: "https://tap.example/pay" })),
    readReturn: vi.fn(async () => ({ status: "charge_created" })),
    confirmTapCharge: vi.fn(async () => ({ status: "paid" })),
    submitOfflineProof: vi.fn(async () => ({ status: "verification_pending" })),
    decideOfflinePayment: vi.fn(async () => ({ status: "paid" })),
    uploadOfflineProof,
    verifyWebhook,
    clientIp: () => "203.0.113.10",
  });
}

describe("Saraya payment HTTP", () => {
  it("takes checkout idempotency from the request header", async () => {
    const dependencies = handlers();
    const response = await dependencies.session(new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": "checkout-1" },
      body: "{}",
    }), "request-1");
    expect(response.status).toBe(201);
  });

  it("passes a fixed native return mode and reads server-confirmed return state", async () => {
    const dependencies = handlers();
    const response = await dependencies.session(new Request("https://example.test", {
      method: "POST", headers: { "content-type": "application/json", "x-saraya-client": "native" },
      body: JSON.stringify({ idempotencyKey: "checkout-1", returnMode: "native" }),
    }), "request-1");
    expect(response.status).toBe(201);
    const returned = await dependencies.paymentReturn(new Request("https://example.test"), "request-1");
    expect(returned.status).toBe(200);
    await expect(returned.json()).resolves.toEqual({ status: "charge_created" });
  });

  it("accepts only a Tap charge identifier from the webhook payload", async () => {
    const response = await handlers().webhook(new Request("https://example.test", {
      method: "POST",
      body: JSON.stringify({ id: "chg_1", amount: "0.001", status: "CAPTURED" }),
      headers: { "content-type": "application/json", hashstring: "valid" },
    }));
    expect(response.status).toBe(200);
  });

  it("rejects an invalid Tap signature before provider lookup", async () => {
    const verify = vi.fn(async () => false);
    const response = await handlers(undefined, verify).webhook(new Request("https://example.test", {
      method: "POST", headers: { hashstring: "bad" }, body: JSON.stringify({ id: "chg_1" }),
    }));
    expect(response.status).toBe(401);
  });

  it("rejects oversized webhook bodies before signature verification", async () => {
    const verify = vi.fn(async () => true);
    const response = await handlers(undefined, verify).webhook(new Request("https://example.test", {
      method: "POST", headers: { hashstring: "x", "content-length": "70000" }, body: "{}",
    }));
    expect(response.status).toBe(413);
    expect(verify).not.toHaveBeenCalled();
  });

  it("dispatches multipart receipts to the private proof uploader", async () => {
    const upload = vi.fn(async () => ({ status: "verification_pending" }));
    const request = new Request("https://example.test", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=test", "idempotency-key": "proof-key" },
      body: "--test--\r\n",
    });
    const response = await handlers(upload).offlineProof(request, "demand-1");
    expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith(request, principal, "demand-1", "proof-key");
  });
});
