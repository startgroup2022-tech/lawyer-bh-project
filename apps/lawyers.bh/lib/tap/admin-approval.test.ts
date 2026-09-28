import { describe, expect, it, vi } from "vitest";
import { canRepairTapApproval, finalizeTapAdminApproval } from "./admin-approval";

describe("finalizeTapAdminApproval", () => {
  it("allows recovery after a partial approval before onboarding exists", () => {
    expect(canRepairTapApproval("pending", false, false)).toBe(true);
    expect(canRepairTapApproval("approved", false, false)).toBe(true);
    expect(canRepairTapApproval("approved", false, true)).toBe(false);
    expect(canRepairTapApproval("approved", true, false)).toBe(true);
    expect(canRepairTapApproval("rejected", false, false)).toBe(false);
  });
  it("completes durable active approval before scheduling Tap", async () => {
    const events: string[] = [];
    const result = await finalizeTapAdminApproval({
      approveProvider: vi.fn(async () => { events.push("approve-active"); return { id: "law_1", isActive: true }; }),
      createCommissions: vi.fn(async () => { events.push("commissions"); }),
      ensureOnboarding: vi.fn(async () => { events.push("onboarding"); return { stage: "pending_admin" as const }; }),
      scheduleOnboarding: vi.fn(() => { events.push("schedule"); }),
    });

    expect(events).toEqual(["approve-active", "commissions", "onboarding", "schedule"]);
    expect(result).toEqual({ provider: { id: "law_1", isActive: true }, tapOnboarding: { stage: "pending_admin" } });
  });

  it("does not schedule Tap when a durable write fails", async () => {
    const scheduleOnboarding = vi.fn();
    await expect(finalizeTapAdminApproval({
      approveProvider: async () => ({ id: "law_1", isActive: false }),
      createCommissions: async () => { throw new Error("db failed"); },
      ensureOnboarding: async () => ({ stage: "pending_admin" as const }),
      scheduleOnboarding,
    })).rejects.toThrow("db failed");
    expect(scheduleOnboarding).not.toHaveBeenCalled();
  });

  it("approves Saudi providers without writing Bahrain-only Tap onboarding", async () => {
    const ensureOnboarding = vi.fn();
    const scheduleOnboarding = vi.fn();

    const result = await finalizeTapAdminApproval({
      tapRequired: false,
      approveProvider: async () => ({ id: "sa_law_1", isActive: true }),
      createCommissions: vi.fn(async () => undefined),
      ensureOnboarding,
      scheduleOnboarding,
    });

    expect(ensureOnboarding).not.toHaveBeenCalled();
    expect(scheduleOnboarding).not.toHaveBeenCalled();
    expect(result.tapOnboarding).toEqual({ stage: "not_applicable" });
  });
});
