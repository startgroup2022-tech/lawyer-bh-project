import { beforeEach, describe, expect, it, vi } from "vitest";

const sqlBoundary = vi.hoisted(() => {
  const queries: Array<{ template: string; values: unknown[] }> = [];
  const responses: unknown[][] = [];

  function sqlClient(stringsOrIdentifier: TemplateStringsArray | string, ...values: unknown[]) {
    if (typeof stringsOrIdentifier === "string") return stringsOrIdentifier;
    queries.push({ template: stringsOrIdentifier.join("?"), values });
    return Promise.resolve(responses.shift() ?? []);
  }

  return { queries, responses, sqlClient };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ sqlClient: sqlBoundary.sqlClient }));

import { recordPaymentAllocation } from "./commission";

describe("delayed provider allocations", () => {
  beforeEach(() => {
    sqlBoundary.queries.length = 0;
    sqlBoundary.responses.length = 0;
  });

  it("records an 80/20 bank-pending snapshot for a booking", async () => {
    sqlBoundary.responses.push(
      [],
      [{
        id: "rate_1", provider_id: "law_1", country_code: "BH",
        platform_percentage: "20.00", provider_percentage: "80.00",
        effective_from: "2026-08-18T00:00:00.000Z", effective_to: null,
        is_active: true,
      }],
      [{
        id: "allocation_1", country_code: "BH", booking_request_id: "booking_1",
        emergency_request_id: null, provider_id: "law_1", commission_rate_id: "rate_1",
        tap_charge_id: "chg_1", currency_code: "BHD", gross_amount: "10.000",
        platform_percentage: "20.00", provider_percentage: "80.00",
        platform_amount: "2.000", provider_amount: "8.000", gateway_fee_amount: "0.000",
        split_mode: "delayed", allocation_status: "calculated", payout_status: "pending",
        settlement_status: "bank_pending", captured_at: "2026-08-18T00:00:00.000Z",
        created_at: "2026-08-18T00:00:00.000Z",
      }],
    );

    const result = await recordPaymentAllocation({
      mode: "delayed",
      countryCode: "BH",
      request: { kind: "booking", id: "booking_1" },
      providerId: "law_1",
      providerNameSnapshot: "Test Lawyer",
      providerIbanSnapshot: "BH00TEST",
      tapChargeId: "chg_1",
      grossAmount: 10,
      commissionRatesTable: "bahrain_provider_commission_rates",
      paymentAllocationsTable: "bahrain_payment_allocations",
      capturedAt: new Date("2026-08-18T00:00:00.000Z"),
    });

    expect(result).toMatchObject({ platformAmount: 2, providerAmount: 8, isNew: true });
    const insert = sqlBoundary.queries.find(({ template }) => template.includes("INSERT INTO"));
    expect(insert?.template).toContain("settlement_status");
    expect(insert?.values).toContain("delayed");
    expect(insert?.values).toContain("bank_pending");
    expect(insert?.values).toContain("Test Lawyer");
    expect(insert?.values).toContain("BH00TEST");
    expect(insert?.values.some((value) => value instanceof Date)).toBe(false);
  });

  it("records delayed earnings when the lawyer has no IBAN yet", async () => {
    sqlBoundary.responses.push(
      [],
      [{
        id: "rate_1", provider_id: "law_1", country_code: "BH",
        platform_percentage: "20.00", provider_percentage: "80.00",
        effective_from: "2026-08-18T00:00:00.000Z", effective_to: null,
        is_active: true,
      }],
      [{
        id: "allocation_2", country_code: "BH", booking_request_id: null,
        emergency_request_id: "request_1", provider_id: "law_1", commission_rate_id: "rate_1",
        tap_charge_id: "chg_no_iban", currency_code: "BHD", gross_amount: "10.000",
        platform_percentage: "20.00", provider_percentage: "80.00",
        platform_amount: "2.000", provider_amount: "8.000", gateway_fee_amount: "0.000",
        split_mode: "delayed", allocation_status: "calculated", payout_status: "pending",
        settlement_status: "bank_pending", captured_at: "2026-08-18T00:00:00.000Z",
        created_at: "2026-08-18T00:00:00.000Z",
      }],
    );

    const result = await recordPaymentAllocation({
      mode: "delayed",
      countryCode: "BH",
      request: { kind: "emergency", id: "request_1" },
      providerId: "law_1",
      providerNameSnapshot: "Test Lawyer",
      providerIbanSnapshot: null,
      tapChargeId: "chg_no_iban",
      grossAmount: 10,
      commissionRatesTable: "bahrain_provider_commission_rates",
      paymentAllocationsTable: "bahrain_payment_allocations",
      capturedAt: new Date("2026-08-18T00:00:00.000Z"),
    });

    expect(result).toMatchObject({ providerAmount: 8, isNew: true });
    const insert = sqlBoundary.queries.find(({ template }) => template.includes("INSERT INTO") && template.includes("provider_iban_snapshot"));
    expect(insert?.values).toContain(null);
  });

  it("creates and uses a missing default commission schedule", async () => {
    const activeRate = {
      id: "rate_created", provider_id: "law_1", country_code: "BH",
      platform_percentage: "20.00", provider_percentage: "80.00",
      effective_from: "2026-08-01T00:00:00.000Z", effective_to: "2027-08-01T00:00:00.000Z",
      is_active: true,
    };
    sqlBoundary.responses.push(
      [],
      [],
      [activeRate, { ...activeRate, id: "rate_later", platform_percentage: "45.00", provider_percentage: "55.00" }],
      [activeRate],
      [{
        id: "allocation_3", country_code: "BH", booking_request_id: null,
        emergency_request_id: "request_2", provider_id: "law_1", commission_rate_id: "rate_created",
        tap_charge_id: "chg_missing_rate", currency_code: "BHD", gross_amount: "10.000",
        platform_percentage: "20.00", provider_percentage: "80.00",
        platform_amount: "2.000", provider_amount: "8.000", gateway_fee_amount: "0.000",
        split_mode: "delayed", allocation_status: "calculated", payout_status: "pending",
        settlement_status: "bank_pending", captured_at: "2026-09-01T00:00:00.000Z",
        created_at: "2026-09-01T00:00:00.000Z",
      }],
    );

    const result = await recordPaymentAllocation({
      mode: "delayed",
      countryCode: "BH",
      request: { kind: "emergency", id: "request_2" },
      providerId: "law_1",
      providerNameSnapshot: "Test Lawyer",
      providerIbanSnapshot: null,
      commissionStartsAt: new Date("2026-08-01T00:00:00.000Z"),
      tapChargeId: "chg_missing_rate",
      grossAmount: 10,
      commissionRatesTable: "bahrain_provider_commission_rates",
      paymentAllocationsTable: "bahrain_payment_allocations",
      capturedAt: new Date("2026-09-01T00:00:00.000Z"),
    });

    expect(result).toMatchObject({ commissionRateId: "rate_created", providerAmount: 8 });
    const scheduleInserts = sqlBoundary.queries.filter(
      ({ template }) =>
        template.includes("INSERT INTO") &&
        template.includes("effective_from") &&
        template.includes("effective_to"),
    );
    expect(scheduleInserts).toHaveLength(1);
    expect(scheduleInserts[0]?.values).toContain("First-year commission rate");
  });
});
