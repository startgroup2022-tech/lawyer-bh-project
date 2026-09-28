import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminPermission: vi.fn(),
  countAudience: vi.fn(),
  recentSends: vi.fn(),
  send: vi.fn(),
}));

vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: mocks.requireAdminPermission }));
vi.mock("@/lib/admin/mobile-notifications/store", () => ({ mobileNotificationStore: {
  countAudience: mocks.countAudience,
  recentSends: mocks.recentSends,
} }));
vi.mock("@/lib/admin/mobile-notifications/sender", () => ({ sendAdminMobileNotification: mocks.send }));

import { GET, POST } from "./route";

const payload = {
  audience: "active_lawyers", titleAr: "تنبيه", bodyAr: "نص", titleEn: "Alert", bodyEn: "Body",
  idempotencyKey: "11111111-1111-4111-8111-111111111111", confirmed: true,
};

describe("admin mobile notifications route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminPermission.mockResolvedValue({ id: "admin-1" });
    mocks.countAudience.mockResolvedValue(7);
    mocks.recentSends.mockResolvedValue([]);
  });

  it("rejects access without notification permission", async () => {
    mocks.requireAdminPermission.mockResolvedValue(null);
    expect((await GET(new Request("https://example.test/api/admin/mobile-notifications?audience=clients"))).status).toBe(403);
    expect((await POST(new Request("https://example.test/api/admin/mobile-notifications", { method: "POST", body: JSON.stringify(payload) }))).status).toBe(403);
  });

  it("returns a token-free audience preview and history", async () => {
    mocks.recentSends.mockResolvedValue([{ id: "send-1", audience: "clients", targeted: 2 }]);
    const response = await GET(new Request("https://example.test/api/admin/mobile-notifications?audience=clients"));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(JSON.parse(text)).toMatchObject({ audience: "clients", count: 7, history: [{ id: "send-1" }] });
    expect(text).not.toContain("fcm_token");
  });

  it("rejects invalid and unconfirmed sends", async () => {
    for (const input of [{ ...payload, confirmed: false }, { ...payload, audience: "unknown" }]) {
      expect((await POST(new Request("https://example.test/api/admin/mobile-notifications", { method: "POST", body: JSON.stringify(input) }))).status).toBe(400);
    }
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("uses the authenticated admin and returns aggregate results", async () => {
    mocks.send.mockResolvedValue({ id: "send-1", state: "completed", audience: "active_lawyers", targeted: 7, successful: 6, failed: 1, pruned: 1 });
    const response = await POST(new Request("https://example.test/api/admin/mobile-notifications", { method: "POST", body: JSON.stringify({ ...payload, adminId: "attacker" }) }));
    expect(response.status).toBe(200);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ adminId: "admin-1" }));
    expect(await response.json()).toEqual({ id: "send-1", state: "completed", audience: "active_lawyers", targeted: 7, successful: 6, failed: 1, pruned: 1 });
  });
});
