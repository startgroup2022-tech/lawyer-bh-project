import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelMobilePaymentRequest: vi.fn(),
  notifyClientPaymentEvent: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ sqlClient: vi.fn() }));
vi.mock("@/lib/tap/mobile-payment-cancel", () => ({
  cancelMobilePaymentRequest: mocks.cancelMobilePaymentRequest,
}));
vi.mock("@/lib/tap/mobile-payment-notifications", () => ({
  notifyClientPaymentEvent: mocks.notifyClientPaymentEvent,
}));

import { POST } from "./route";

const bookingId = "018f47de-8f4e-7dd1-9f41-f0f56365e902";

function request() {
  return new Request("https://example.test/api/mobile/tap/payment-cancel", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bookingId, requestAccessToken: "access-token" }),
  });
}

describe("POST /api/mobile/tap/payment-cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("notifies the client when this request performs the cancellation", async () => {
    mocks.cancelMobilePaymentRequest.mockResolvedValue({
      status: 200,
      body: { ok: true, serviceStatus: "cancelled" },
      cancelledNow: true,
      notificationLocale: "en",
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.notifyClientPaymentEvent).toHaveBeenCalledWith({
      eventType: "request_cancelled",
      requestId: bookingId,
      locale: "en",
      source: "payment-cancel",
    });
  });

  it("does not send a duplicate notification for an idempotent cancellation", async () => {
    mocks.cancelMobilePaymentRequest.mockResolvedValue({
      status: 200,
      body: { ok: true, serviceStatus: "cancelled" },
      cancelledNow: false,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.notifyClientPaymentEvent).not.toHaveBeenCalled();
  });
});
