import { describe, expect, it } from "vitest";
import { createCommissionManagementService, resolveDefaultCommissionSchedule } from "./commissions";

describe("managed lawyer commissions", () => {
  it("builds non-overlapping configured year schedules", () => {
    expect(resolveDefaultCommissionSchedule("2026-09-09T10:00:00.000Z", "18.50", "37.25")).toEqual([
      { platformPercentage: "18.50", providerPercentage: "81.50", effectiveFrom: "2026-09-09T10:00:00.000Z", effectiveTo: "2027-09-09T10:00:00.000Z" },
      { platformPercentage: "37.25", providerPercentage: "62.75", effectiveFrom: "2027-09-09T10:00:00.000Z", effectiveTo: null },
    ]);
  });

  it("archives the active override before inserting its replacement", async () => {
    const events: string[] = [];
    const service = createCommissionManagementService({
      async closeActiveOverride(_lawyerId, effectiveFrom) { events.push(`close:${effectiveFrom}`); },
      async insertOverride(input) { events.push(`insert:${input.platformPercentage}:${input.providerPercentage}`); return { id: "rate-2", ...input }; },
      async transaction(work) { return work(this); },
      async listLawyers() { return []; },
    });
    const result = await service.setLawyerCommissionOverride({ lawyerId: "lawyer-1", countryCode: "BH", platformPercentage: "25", effectiveFrom: "2026-10-01T00:00:00.000Z", reason: "Agreed rate" }, { adminId: "admin-1" });
    expect(events).toEqual(["close:2026-10-01T00:00:00.000Z", "insert:25.00:75.00"]);
    expect(result.platformPercentage).toBe("25.00");
  });

  it.each(["-1", "100.01", "1.001", "bad"])("rejects invalid override percentage %s", async value => {
    const service = createCommissionManagementService({ closeActiveOverride: async()=>{}, insertOverride: async input=>({id:"x",...input}), transaction: async function(work){return work(this)}, listLawyers: async()=>[] });
    await expect(service.setLawyerCommissionOverride({ lawyerId:"l",countryCode:"BH",platformPercentage:value,effectiveFrom:"2026-10-01T00:00:00.000Z",reason:null},{adminId:"a"})).rejects.toThrow("invalid_percentage");
  });
});
