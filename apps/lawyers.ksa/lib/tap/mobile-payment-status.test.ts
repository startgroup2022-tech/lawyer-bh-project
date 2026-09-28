import { describe, expect, it } from "vitest";

import {
  getMobilePaymentStatus,
  type MobilePaymentStatusDependencies,
  type MobilePaymentStatusRow,
} from "./mobile-payment-status";

const bookingId = "018f47de-8f4e-7dd1-9f41-f0f56365e902";

function makeDependencies(rowOverrides: Partial<MobilePaymentStatusRow> = {}) {
  let row: MobilePaymentStatusRow = {
    bookingId,
    amount: 150,
    currency: "SAR",
    orderReference: "LSOS-018F47DE",
    paymentStatus: "pending_payment",
    tapStatus: "INITIATED",
    chargeId: "chg_test_1",
    invoiceNumber: null,
    ...rowOverrides,
  };
  let retrieveCalls = 0;
  let paidUpdates = 0;
  let charge = {
    id: "chg_test_1",
    status: "CAPTURED",
    amount: 150,
    currency: "SAR",
    reference: { order: "LSOS-018F47DE" },
  };

  const dependencies: MobilePaymentStatusDependencies = {
    async findBooking(id) {
      return id === bookingId ? row : null;
    },
    async retrieveCharge() {
      retrieveCalls += 1;
      return charge;
    },
    async markPaid(input) {
      paidUpdates += 1;
      row = {
        ...row,
        paymentStatus: "paid",
        tapStatus: "CAPTURED",
        invoiceNumber: input.invoiceNumber,
      };
      return row;
    },
    async markTerminal(input) {
      row = { ...row, paymentStatus: input.paymentStatus, tapStatus: input.tapStatus };
      return row;
    },
  };

  return {
    dependencies,
    setCharge(value: typeof charge) {
      charge = value;
    },
    get retrieveCalls() {
      return retrieveCalls;
    },
    get paidUpdates() {
      return paidUpdates;
    },
  };
}

describe("getMobilePaymentStatus", () => {
  it("returns stored captured payment without retrieving it again", async () => {
    const fake = makeDependencies({ paymentStatus: "paid", tapStatus: "CAPTURED" });
    const result = await getMobilePaymentStatus(bookingId, fake.dependencies);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: "paid", tapStatus: "CAPTURED" });
    expect(fake.retrieveCalls).toBe(0);
  });

  it("reconciles a matching captured charge", async () => {
    const fake = makeDependencies();
    const result = await getMobilePaymentStatus(bookingId, fake.dependencies);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: "paid",
      tapStatus: "CAPTURED",
      chargeId: "chg_test_1",
      amount: "150.00",
      currency: "SAR",
    });
    expect(fake.paidUpdates).toBe(1);
  });

  it("never marks an amount mismatch as paid", async () => {
    const fake = makeDependencies();
    fake.setCharge({
      id: "chg_test_1",
      status: "CAPTURED",
      amount: 0.001,
      currency: "SAR",
      reference: { order: "LSOS-018F47DE" },
    });

    const result = await getMobilePaymentStatus(bookingId, fake.dependencies);

    expect(result).toEqual({
      status: 409,
      body: { ok: false, error: "Tap charge does not match the booking" },
    });
    expect(fake.paidUpdates).toBe(0);
  });

  it("returns failed for a matching declined charge", async () => {
    const fake = makeDependencies();
    fake.setCharge({
      id: "chg_test_1",
      status: "DECLINED",
      amount: 150,
      currency: "SAR",
      reference: { order: "LSOS-018F47DE" },
    });

    const result = await getMobilePaymentStatus(bookingId, fake.dependencies);
    expect(result.body).toMatchObject({ status: "failed", tapStatus: "DECLINED" });
  });

  it("returns 404 for an unknown booking", async () => {
    const fake = makeDependencies();
    const result = await getMobilePaymentStatus(
      "018f47de-8f4e-7dd1-9f41-f0f56365e999",
      fake.dependencies,
    );
    expect(result.status).toBe(404);
  });
});
