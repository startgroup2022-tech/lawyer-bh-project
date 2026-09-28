import { describe, expect, it, vi } from "vitest";

import { schedulePaidRequestAdminNotifications } from "./paid-request-notification-schedule";

describe("paid request notification scheduling", () => {
  it("runs after the payment response lifecycle and contains provider failure", async () => {
    let task: (() => Promise<void>) | undefined;
    const after = vi.fn((scheduled: () => Promise<void>) => { task = scheduled; });
    const run = vi.fn(async () => { throw new Error("provider unavailable"); });
    const log = vi.fn();

    schedulePaidRequestAdminNotifications(after, run, log);
    expect(run).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledOnce();

    await expect(task!()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith("[paid-request-admin-notifications] delivery unavailable");
  });
});
