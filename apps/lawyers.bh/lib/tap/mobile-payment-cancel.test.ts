import { describe, expect, it } from "vitest";

import { createMobileRequestAccessToken } from "./mobile-request-access";
import {
  cancelMobilePaymentRequest,
  type MobilePaymentCancellationDependencies,
  type MobilePaymentCancellationRow,
} from "./mobile-payment-cancel";

const bookingId = "018f47de-8f4e-7dd1-9f41-f0f56365e902";

function fixture(overrides: Partial<MobilePaymentCancellationRow> = {}) {
  const access = createMobileRequestAccessToken();
  let cancelled = 0;
  const row: MobilePaymentCancellationRow = {
    bookingId,
    paymentStatus: "pending",
    serviceStatus: "pending",
    tapStatus: "SDK_PENDING",
    requestAccessDigest: access.digest,
    ...overrides,
  };
  const dependencies: MobilePaymentCancellationDependencies = {
    async findBooking(id) {
      return id === bookingId ? row : null;
    },
    async cancelBooking() {
      cancelled += 1;
      return { ...row, paymentStatus: "failed", serviceStatus: "cancelled" };
    },
  };
  return { access, dependencies, get cancelled() { return cancelled; } };
}

describe("cancelMobilePaymentRequest", () => {
  it("cancels an unpaid request with its access token", async () => {
    const fake = fixture();
    const result = await cancelMobilePaymentRequest(
      bookingId,
      fake.access.token,
      fake.dependencies,
    );

    expect(result).toMatchObject({
      status: 200,
      body: { ok: true, paymentStatus: "failed", serviceStatus: "cancelled" },
      cancelledNow: true,
    });
    expect(fake.cancelled).toBe(1);
  });

  it("rejects a wrong access token", async () => {
    const fake = fixture();
    const result = await cancelMobilePaymentRequest(
      bookingId,
      "wrong-token",
      fake.dependencies,
    );

    expect(result.status).toBe(403);
    expect(fake.cancelled).toBe(0);
  });

  it("rejects cancellation after captured payment", async () => {
    const fake = fixture({ paymentStatus: "success", tapStatus: "CAPTURED" });
    const result = await cancelMobilePaymentRequest(
      bookingId,
      fake.access.token,
      fake.dependencies,
    );

    expect(result.status).toBe(409);
    expect(fake.cancelled).toBe(0);
  });

  it("treats repeated explicit cancellation as success", async () => {
    const fake = fixture({ paymentStatus: "failed", serviceStatus: "cancelled" });
    const result = await cancelMobilePaymentRequest(
      bookingId,
      fake.access.token,
      fake.dependencies,
    );

    expect(result.status).toBe(200);
    expect(result.cancelledNow).toBe(false);
    expect(fake.cancelled).toBe(0);
  });
});
