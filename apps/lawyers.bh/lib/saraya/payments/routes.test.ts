import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: vi.fn(), webhook: vi.fn(), offlineProof: vi.fn(), offlineDecision: vi.fn(),
}));
vi.mock("./runtime", () => ({ paymentHandlers: state }));

describe("Saraya payment route wiring", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wires the actual payment session route", async () => {
    state.session.mockResolvedValue(new Response(null, { status: 201 }));
    const route = await import("@/app/api/saraya/v1/rental-requests/[requestId]/payment-session/route");
    const request = new Request("https://example.test", { method: "POST" });
    const response = await route.POST(request, { params: Promise.resolve({ requestId: "request-1" }) });
    expect(response.status).toBe(201);
    expect(state.session).toHaveBeenCalledWith(request, "request-1");
  });

  it("wires the actual public Tap webhook route", async () => {
    state.webhook.mockResolvedValue(new Response(null, { status: 200 }));
    const route = await import("@/app/api/saraya/v1/payments/tap/webhook/route");
    const request = new Request("https://example.test", { method: "POST" });
    await route.POST(request);
    expect(state.webhook).toHaveBeenCalledWith(request);
  });

  it("wires offline proof and decision routes", async () => {
    state.offlineProof.mockResolvedValue(new Response(null, { status: 201 }));
    state.offlineDecision.mockResolvedValue(new Response(null, { status: 200 }));
    const proof = await import("@/app/api/saraya/v1/payment-demands/[demandId]/offline-proof/route");
    const decision = await import("@/app/api/saraya/v1/payment-demands/[demandId]/decision/route");
    const request = new Request("https://example.test", { method: "POST" });
    await proof.POST(request, { params: Promise.resolve({ demandId: "demand-1" }) });
    await decision.POST(request, { params: Promise.resolve({ demandId: "demand-1" }) });
    expect(state.offlineProof).toHaveBeenCalledWith(request, "demand-1");
    expect(state.offlineDecision).toHaveBeenCalledWith(request, "demand-1");
  });
});
