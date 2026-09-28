import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  sendEmail: vi.fn(),
  store: {},
}));

vi.mock("@/lib/provider/license-expiry-job", () => ({
  runLicenseExpiryMaintenance: mocks.run,
}));
vi.mock("@/lib/provider/license-expiry-store", () => ({
  postgresLicenseExpiryStore: mocks.store,
}));
vi.mock("@/lib/postmark", () => ({ sendEmail: mocks.sendEmail }));

import { GET } from "./route";

function request(token?: string) {
  return new Request("https://www.lawyers.bh/api/cron/lawyer-license-expiry", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("lawyer license expiry cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-secret";
    mocks.run.mockResolvedValue({
      deactivated: 3,
      remindersSent: 2,
      remindersFailed: 1,
    });
  });

  it.each([undefined, "wrong-secret"])(
    "rejects an unauthorized request without running maintenance",
    async (token) => {
      const response = await GET(request(token));
      expect(response.status).toBe(401);
      expect(mocks.run).not.toHaveBeenCalled();
    },
  );

  it("returns aggregate maintenance counts for the configured secret", async () => {
    const response = await GET(request("cron-secret"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      deactivated: 3,
      remindersSent: 2,
      remindersFailed: 1,
    });
    expect(mocks.run).toHaveBeenCalledWith({
      runDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      store: mocks.store,
      deliver: mocks.sendEmail,
    });
  });

  it("returns a generic error when maintenance fails", async () => {
    mocks.run.mockRejectedValue(new Error("database details"));

    const response = await GET(request("cron-secret"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "maintenance_failed" });
  });
});
