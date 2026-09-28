import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  responses: [] as unknown[][],
  sqlClient: vi.fn((input: TemplateStringsArray | string) =>
    typeof input === "string" ? input : Promise.resolve(mocks.responses.shift() ?? [])),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/client", () => ({ sqlClient: mocks.sqlClient }));
vi.mock("@/lib/db/country-tables", () => ({
  getActiveCountry: vi.fn(async () => ({ code: "BH", tablePrefix: "bahrain" })),
  buildCountryTableSet: vi.fn(() => ({ payment_allocations: "bahrain_payment_allocations" })),
}));

import { settleDelayedAllocation } from "./delayed-settlement";

const base = {
  allocationId: "allocation_1", method: "bank" as const, reference: "BANK-123",
  transferredAt: new Date("2026-08-18T12:00:00.000Z"), adminId: "admin_1",
};

describe("settleDelayedAllocation", () => {
  beforeEach(() => { mocks.responses.length = 0; mocks.sqlClient.mockClear(); });

  it("rejects an empty reference", async () => {
    await expect(settleDelayedAllocation({ ...base, reference: " " }))
      .rejects.toMatchObject({ code: "invalid" });
  });

  it("requires an IBAN for a bank settlement", async () => {
    mocks.responses.push([{ id: "allocation_1", settlement_status: "bank_pending", provider_iban_snapshot: null }]);
    await expect(settleDelayedAllocation(base))
      .rejects.toMatchObject({ code: "invalid" });
  });

  it("atomically marks a pending allocation as paid by bank", async () => {
    mocks.responses.push(
      [{ id: "allocation_1", settlement_status: "bank_pending", provider_iban_snapshot: "BH00TEST" }],
      [{ id: "allocation_1", settlement_status: "paid_bank", settlement_reference: "BANK-123", settlement_transferred_at: "2026-08-18T12:00:00.000Z", settlement_recorded_by: "admin_1" }],
    );
    await expect(settleDelayedAllocation(base)).resolves.toMatchObject({
      id: "allocation_1", settlementStatus: "paid_bank", settlementReference: "BANK-123",
    });
  });

  it("returns a conflict when another process already settled it", async () => {
    mocks.responses.push(
      [{ id: "allocation_1", settlement_status: "paid_bank", provider_iban_snapshot: "BH00TEST" }],
      [],
    );
    await expect(settleDelayedAllocation(base))
      .rejects.toMatchObject({ code: "conflict" });
  });
});
