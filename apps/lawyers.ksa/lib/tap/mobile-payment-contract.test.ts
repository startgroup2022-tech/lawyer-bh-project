import { describe, expect, it } from "vitest";

import {
  assertTapTestConfiguration,
  parseMobilePaymentRequest,
  toMobilePaymentStatus,
} from "./mobile-payment-contract";

describe("mobile Tap payment contract", () => {
  it("accepts customer and case identifiers without accepting an amount", () => {
    const parsed = parseMobilePaymentRequest({
      countryCode: "SA",
      emergencyCaseId: "emergency_arrest",
      customer: {
        name: "Test Customer",
        email: "test@example.com",
        phoneCountryCode: "966",
        phone: "501234567",
      },
      locale: "ar",
      idempotencyKey: "018f47de-8f4e-7dd1-9f41-f0f56365e901",
      amount: 0.001,
    });

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect("amount" in parsed.value).toBe(false);
      expect(parsed.value.customer.phone).toBe("501234567");
    }
  });

  it("rejects malformed customer and idempotency data", () => {
    const parsed = parseMobilePaymentRequest({
      countryCode: "SA",
      emergencyCaseId: "emergency_arrest",
      customer: {
        name: "",
        email: "not-an-email",
        phoneCountryCode: "+966",
        phone: "phone",
      },
      locale: "ar",
      idempotencyKey: "timestamp-123",
    });

    expect(parsed).toEqual({
      ok: false,
      error: "Invalid mobile payment request",
    });
  });

  it("rejects Bahrain requests in the Saudi product", () => {
    expect(
      parseMobilePaymentRequest({
        countryCode: "BH",
        emergencyCaseId: "emergency_arrest",
        customer: {
          name: "Test Customer",
          email: "test@example.com",
          phoneCountryCode: "973",
          phone: "12345678",
        },
        locale: "ar",
        idempotencyKey: "018f47de-8f4e-7dd1-9f41-f0f56365e901",
      }),
    ).toEqual({ ok: false, error: "Invalid mobile payment request" });
  });

  it("rejects live Tap configuration", () => {
    expect(() =>
      assertTapTestConfiguration({
        secretKey: "sk_live_secret",
        publicKey: "pk_live_public",
        merchantId: "28137775",
      }),
    ).toThrow("Tap test credentials are required");
  });

  it("accepts test Tap configuration", () => {
    expect(
      assertTapTestConfiguration({
        secretKey: "sk_test_secret",
        publicKey: "pk_test_public",
        merchantId: "28137775",
      }),
    ).toEqual({
      secretKey: "sk_test_secret",
      publicKey: "pk_test_public",
      merchantId: "28137775",
    });
  });

  it("maps only captured paid rows to paid", () => {
    expect(
      toMobilePaymentStatus({
        paymentStatus: "paid",
        tapStatus: "CAPTURED",
      }),
    ).toBe("paid");

    expect(
      toMobilePaymentStatus({
        paymentStatus: "paid",
        tapStatus: "INITIATED",
      }),
    ).toBe("pending_payment");

    expect(
      toMobilePaymentStatus({
        paymentStatus: "failed",
        tapStatus: "DECLINED",
      }),
    ).toBe("failed");

    expect(
      toMobilePaymentStatus({
        paymentStatus: "failed",
        tapStatus: "CANCELLED",
      }),
    ).toBe("cancelled");
  });
});
