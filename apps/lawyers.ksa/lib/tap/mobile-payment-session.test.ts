import { describe, expect, it } from "vitest";

import {
  createMobilePaymentSession,
  type MobilePaymentSessionDependencies,
  type StoredMobilePaymentSession,
} from "./mobile-payment-session";

const request = {
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
};

function makeDependencies() {
  let stored: StoredMobilePaymentSession | null = null;
  const charges: Array<Record<string, unknown>> = [];
  let bookingCreates = 0;

  const dependencies: MobilePaymentSessionDependencies = {
    tapConfiguration: {
      secretKey: "sk_test_secret",
      publicKey: "pk_test_public",
      merchantId: "28137775",
    },
    siteUrl: "https://ksa.test",
    async findEmergencyCase(countryCode, caseId) {
      if (countryCode !== "SA" || caseId !== "emergency_arrest") return null;
      return {
        id: "case-1",
        slug: "emergency_arrest",
        name: "Arrest assistance",
        amount: 150,
        currency: "SAR",
      };
    },
    async findByIdempotencyKey(key) {
      return stored?.idempotencyKey === key ? stored : null;
    },
    async createBooking(input) {
      bookingCreates += 1;
      stored = {
        bookingId: "018f47de-8f4e-7dd1-9f41-f0f56365e902",
        idempotencyKey: input.idempotencyKey,
        orderReference: "LSOS-018F47DE",
        amount: input.amount,
        currency: input.currency,
        paymentStatus: "pending_payment",
        tapStatus: "CREATING",
        chargeId: null,
        transactionUrl: null,
      };
      return stored;
    },
    async createTapCharge(input) {
      charges.push(input as unknown as Record<string, unknown>);
      return {
        id: "chg_test_1",
        status: "INITIATED",
        transactionUrl: "https://tap.test/checkout/chg_test_1",
      };
    },
    async attachCharge(input) {
      if (!stored) throw new Error("booking missing");
      stored = {
        ...stored,
        chargeId: input.chargeId,
        tapStatus: input.tapStatus,
        transactionUrl: input.transactionUrl,
      };
      return stored;
    },
    async markFailed() {},
  };

  return {
    dependencies,
    get chargeCalls() {
      return charges.length;
    },
    get bookingCreates() {
      return bookingCreates;
    },
    get lastCharge() {
      return charges.at(-1);
    },
  };
}

describe("createMobilePaymentSession", () => {
  it("uses the server catalogue amount and returns a hosted test charge", async () => {
    const fake = makeDependencies();
    const result = await createMobilePaymentSession(request, fake.dependencies);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      bookingId: "018f47de-8f4e-7dd1-9f41-f0f56365e902",
      chargeId: "chg_test_1",
      transactionUrl: "https://tap.test/checkout/chg_test_1",
      amount: "150.00",
      currency: "SAR",
    });
    expect(fake.lastCharge?.amount).toBe(150);
    expect(fake.lastCharge).not.toHaveProperty("amount", 0.001);
  });

  it("reuses the same session for an idempotency retry", async () => {
    const fake = makeDependencies();
    const first = await createMobilePaymentSession(request, fake.dependencies);
    const second = await createMobilePaymentSession(request, fake.dependencies);

    expect(second.body).toEqual(first.body);
    expect(fake.bookingCreates).toBe(1);
    expect(fake.chargeCalls).toBe(1);
  });

  it("rejects an unknown emergency case", async () => {
    const fake = makeDependencies();
    const result = await createMobilePaymentSession(
      { ...request, emergencyCaseId: "unknown" },
      fake.dependencies,
    );

    expect(result).toEqual({
      status: 404,
      body: { ok: false, error: "Emergency case is unavailable" },
    });
    expect(fake.chargeCalls).toBe(0);
  });

  it("rejects live credentials before creating a booking", async () => {
    const fake = makeDependencies();
    fake.dependencies.tapConfiguration.secretKey = "sk_live_secret";

    const result = await createMobilePaymentSession(request, fake.dependencies);

    expect(result).toEqual({
      status: 500,
      body: { ok: false, error: "Tap test payments are unavailable" },
    });
    expect(fake.bookingCreates).toBe(0);
  });
});
