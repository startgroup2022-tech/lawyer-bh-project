import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({ sqlClient: {} }));

import {
  allowedWithdrawalTransition,
  hasValidWithdrawalIban,
  summarizeLawyerEarnings,
  type LawyerEarningAllocation,
} from "./lawyer-withdrawals";

describe("hasValidWithdrawalIban", () => {
  it.each([
    "bh67 bmag 0000 1299 1234 56",
    "GB82 WEST 1234 5698 7654 32",
    "DE89 3704 0044 0532 0130 00",
    "SA03 8000 0000 6080 1016 7519",
  ])("accepts a valid international IBAN: %s", (iban) => {
    expect(hasValidWithdrawalIban(iban)).toBe(true);
  });

  it.each([null, "", "US123", "BH123", "GB82WEST12345698765431"])(
    "rejects an invalid international IBAN: %s",
    (iban) => {
      expect(hasValidWithdrawalIban(iban)).toBe(false);
    },
  );
});

const allocation = (
  overrides: Partial<LawyerEarningAllocation> = {},
): LawyerEarningAllocation => ({
  id: "allocation-1",
  amount: 25,
  currency: "BHD",
  capturedAt: new Date("2026-09-04T08:00:00.000Z"),
  payoutStatus: "pending",
  settlementStatus: "bank_pending",
  withdrawalStatus: null,
  requestReference: "SOS-100",
  serviceAr: "استشارة قانونية طارئة",
  serviceEn: "Emergency Legal Consultation",
  customerName: "Client",
  ...overrides,
});

describe("summarizeLawyerEarnings", () => {
  const now = new Date("2026-09-04T12:00:00.000Z");

  it("uses only positive provider allocations that require a payout", () => {
    const result = summarizeLawyerEarnings([
      allocation(),
      allocation({ id: "zero", amount: 0 }),
      allocation({ id: "platform", amount: 100, settlementStatus: "not_applicable" }),
    ], now);

    expect(result.available).toBe(25);
    expect(result.transactions).toHaveLength(1);
  });

  it("reserves pending and approved withdrawals and keeps paid funds unavailable", () => {
    const result = summarizeLawyerEarnings([
      allocation({ id: "available", amount: 10 }),
      allocation({ id: "pending", amount: 20, withdrawalStatus: "pending" }),
      allocation({ id: "approved", amount: 30, withdrawalStatus: "approved" }),
      allocation({ id: "paid", amount: 40, withdrawalStatus: "paid", payoutStatus: "paid", settlementStatus: "paid_bank" }),
      allocation({ id: "rejected", amount: 50, withdrawalStatus: "rejected" }),
    ], now);

    expect(result).toMatchObject({
      available: 60,
      pendingWithdrawal: 50,
      paidOut: 40,
      lifetime: 150,
    });
  });

  it("calculates today, current week, and current month from captured timestamps", () => {
    const result = summarizeLawyerEarnings([
      allocation({ id: "today", amount: 1, capturedAt: new Date("2026-09-04T09:00:00Z") }),
      allocation({ id: "week", amount: 2, capturedAt: new Date("2026-09-01T09:00:00Z") }),
      allocation({ id: "month", amount: 4, capturedAt: new Date("2026-09-01T00:00:00Z") }),
      allocation({ id: "old", amount: 8, capturedAt: new Date("2026-08-30T23:59:59Z") }),
    ], now);

    expect(result.today).toBe(1);
    expect(result.thisWeek).toBe(7);
    expect(result.thisMonth).toBe(7);
  });
});

describe("allowedWithdrawalTransition", () => {
  it.each([
    ["pending", "approved", true],
    ["pending", "rejected", true],
    ["approved", "paid", true],
    ["approved", "rejected", true],
    ["pending", "paid", false],
    ["rejected", "approved", false],
    ["paid", "rejected", false],
  ] as const)("maps %s -> %s to %s", (from, to, expected) => {
    expect(allowedWithdrawalTransition(from, to)).toBe(expected);
  });
});
