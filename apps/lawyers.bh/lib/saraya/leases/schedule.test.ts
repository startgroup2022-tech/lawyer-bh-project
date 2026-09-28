import { describe, expect, it } from "vitest";
import type { LeaseTerms } from "./contracts";
import { buildRentSchedule } from "./schedule";

const terms = { startDate: "2026-01-01", endDate: "2026-12-31", rentAmount: "1200.000", depositAmount: "500.000", frequency: "monthly" as const, dueDay: 1, graceDays: 5, discountAmount: "0.000", feeAmount: "0.000" };

describe("buildRentSchedule", () => {
  it.each([["monthly", 12], ["quarterly", 4], ["annual", 1]] as const)("builds %s installments", (frequency, count) => {
    const result = buildRentSchedule({ ...terms, frequency });
    expect(result).toHaveLength(count);
    expect(result.reduce((sum, row) => sum + BigInt(row.totalMinor), BigInt(0))).toBe(BigInt(1200_000 * count));
  });

  it("prorates a partial first month using exact calendar days", () => {
    const [first] = buildRentSchedule({ ...terms, startDate: "2026-01-16", endDate: "2026-02-28" });
    expect(first).toMatchObject({ periodStart: "2026-01-16", periodEnd: "2026-01-31", baseMinor: "619355" });
  });

  it("uses 29 days when prorating February in a leap year", () => {
    const [first] = buildRentSchedule({ ...terms, startDate: "2028-02-15", endDate: "2028-03-31" });
    expect(first.baseMinor).toBe("620690");
  });

  it("bounds due days to the last day of short months and applies grace days", () => {
    const [february] = buildRentSchedule({ ...terms, startDate: "2026-02-01", endDate: "2026-02-28", dueDay: 31, graceDays: 3 });
    expect(february).toMatchObject({ dueDate: "2026-02-28", graceUntil: "2026-03-03" });
  });

  it("never makes the first installment due before the lease starts", () => {
    const [first] = buildRentSchedule({ ...terms, startDate: "2026-01-16", endDate: "2026-01-31", dueDay: 1 });
    expect(first.dueDate).toBe("2026-01-16");
  });

  it("applies discounts and fees in thousandths without floating point", () => {
    const [row] = buildRentSchedule({ ...terms, endDate: "2026-01-31", rentAmount: "99.999", discountAmount: "10.001", feeAmount: "2.003" });
    expect(row).toMatchObject({ baseMinor: "99999", discountMinor: "10001", feeMinor: "2003", totalMinor: "92001" });
  });

  it.each([
    [{ dueDay: 0 }, "INVALID_DUE_DAY"], [{ dueDay: 32 }, "INVALID_DUE_DAY"],
    [{ startDate: "2026-02-30" }, "INVALID_DATE"], [{ endDate: "2025-12-31" }, "INVALID_DATE_RANGE"],
    [{ rentAmount: "-1.000" }, "INVALID_MONEY"], [{ depositAmount: "-0.001" }, "INVALID_MONEY"], [{ discountAmount: "1201.000" }, "NEGATIVE_INSTALLMENT"],
    [{ frequency: "weekly" }, "INVALID_FREQUENCY"],
  ] as const)("rejects invalid terms %#", (patch, code) => {
    expect(() => buildRentSchedule({ ...terms, ...patch } as unknown as LeaseTerms)).toThrowError(expect.objectContaining({ code }));
  });
});
