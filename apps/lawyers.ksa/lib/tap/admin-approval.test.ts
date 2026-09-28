import { describe, expect, it, vi } from "vitest";
import { canRepairTapApproval, finalizeTapAdminApproval } from "./admin-approval";

describe("finalizeTapAdminApproval", () => {
  it("allows recovery after a partial inactive approval", () => {
    expect(canRepairTapApproval("pending", false, false)).toBe(true);
    expect(canRepairTapApproval("approved", false, false)).toBe(true);
    expect(canRepairTapApproval("approved", false, true)).toBe(false);
    expect(canRepairTapApproval("approved", true, false)).toBe(false);
    expect(canRepairTapApproval("rejected", false, false)).toBe(false);
  });
  it("completes durable inactive approval before scheduling Tap", async () => {
    const events: string[] = [];
    const result = await finalizeTapAdminApproval({
      approveInactive: vi.fn(async () => { events.push("approve-inactive"); return { id: "law_1", isActive: false }; }),
      createCommissions: vi.fn(async () => { events.push("commissions"); }),
      ensureOnboarding: vi.fn(async () => { events.push("onboarding"); return { stage: "pending_admin" as const }; }),
      scheduleOnboarding: vi.fn(() => { events.push("schedule"); }),
    });

    expect(events).toEqual(["approve-inactive", "commissions", "onboarding", "schedule"]);
    expect(result).toEqual({ provider: { id: "law_1", isActive: false }, tapOnboarding: { stage: "pending_admin" } });
  });

  it("does not schedule Tap when a durable write fails", async () => {
    const scheduleOnboarding = vi.fn();
    await expect(finalizeTapAdminApproval({
      approveInactive: async () => ({ id: "law_1", isActive: false }),
      createCommissions: async () => { throw new Error("db failed"); },
      ensureOnboarding: async () => ({ stage: "pending_admin" as const }),
      scheduleOnboarding,
    })).rejects.toThrow("db failed");
    expect(scheduleOnboarding).not.toHaveBeenCalled();
  });
});
