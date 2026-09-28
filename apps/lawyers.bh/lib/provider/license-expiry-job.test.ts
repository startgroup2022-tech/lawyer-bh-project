import { describe, expect, it, vi } from "vitest";

import {
  runLicenseExpiryMaintenance,
  type LicenseExpiryCandidate,
  type LicenseExpiryStore,
} from "./license-expiry-job";

function storeWith(
  candidates: LicenseExpiryCandidate[],
  claim: (candidate: LicenseExpiryCandidate) => Promise<string | null> = async (
    candidate,
  ) => `claim-${candidate.lawyerId}`,
): LicenseExpiryStore {
  return {
    deactivateExpired: vi.fn().mockResolvedValue(2),
    listReminderCandidates: vi.fn().mockResolvedValue(candidates),
    claimReminder: vi.fn(claim),
    markReminderSent: vi.fn().mockResolvedValue(undefined),
    markReminderFailed: vi.fn().mockResolvedValue(undefined),
  };
}

const candidate = (
  lawyerId: string,
  expiryDate: string,
  locale: "ar" | "en" = "ar",
): LicenseExpiryCandidate => ({
  lawyerId,
  email: `${lawyerId}@example.test`,
  fullNameAr: `محامي ${lawyerId}`,
  fullNameEn: `Lawyer ${lawyerId}`,
  locale,
  expiryDate,
});

describe("runLicenseExpiryMaintenance", () => {
  it("deactivates expired lawyers and sends the due 30-day and 7-day reminders", async () => {
    const store = storeWith([
      candidate("thirty", "2026-10-02"),
      candidate("seven", "2026-09-09", "en"),
      candidate("not-due", "2026-09-10"),
    ]);
    const deliver = vi.fn().mockResolvedValue(undefined);

    const result = await runLicenseExpiryMaintenance({
      runDate: "2026-09-02",
      store,
      deliver,
    });

    expect(result).toEqual({
      deactivated: 2,
      remindersSent: 2,
      remindersFailed: 0,
    });
    expect(store.deactivateExpired).toHaveBeenCalledWith("2026-09-02");
    expect(deliver).toHaveBeenCalledTimes(2);
    expect(deliver.mock.calls[0][0]).toMatchObject({
      to: "thirty@example.test",
      subject: expect.stringContaining("30"),
    });
    expect(deliver.mock.calls[1][0]).toMatchObject({
      to: "seven@example.test",
      subject: expect.stringContaining("7 days"),
    });
  });

  it("does not deliver a reminder when its idempotency claim is unavailable", async () => {
    const store = storeWith([candidate("already-sent", "2026-09-09")], async () =>
      Promise.resolve(null),
    );
    const deliver = vi.fn();

    const result = await runLicenseExpiryMaintenance({
      runDate: "2026-09-02",
      store,
      deliver,
    });

    expect(deliver).not.toHaveBeenCalled();
    expect(result.remindersSent).toBe(0);
  });

  it("records one delivery failure and continues with the next lawyer", async () => {
    const store = storeWith([
      candidate("fails", "2026-10-02"),
      candidate("succeeds", "2026-09-09"),
    ]);
    const deliver = vi
      .fn()
      .mockRejectedValueOnce(new Error("mail unavailable"))
      .mockResolvedValueOnce(undefined);

    const result = await runLicenseExpiryMaintenance({
      runDate: "2026-09-02",
      store,
      deliver,
    });

    expect(result).toEqual({
      deactivated: 2,
      remindersSent: 1,
      remindersFailed: 1,
    });
    expect(store.markReminderFailed).toHaveBeenCalledWith(
      "claim-fails",
      "mail unavailable",
    );
    expect(store.markReminderSent).toHaveBeenCalledWith("claim-succeeds");
  });

  it("uses the renewed expiry date as a separate claim identity", async () => {
    const renewed = candidate("renewed", "2026-10-02");
    const store = storeWith([renewed]);

    await runLicenseExpiryMaintenance({
      runDate: "2026-09-02",
      store,
      deliver: vi.fn().mockResolvedValue(undefined),
    });

    expect(store.claimReminder).toHaveBeenCalledWith(renewed, "30_days");
  });
});
