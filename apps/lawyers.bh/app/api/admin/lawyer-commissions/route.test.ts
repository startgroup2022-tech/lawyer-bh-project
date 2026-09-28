import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ allowed: true, fail: false }));
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: async () => state.allowed ? { id: "admin" } : null }));
vi.mock("@/lib/terms-management/commissions", () => ({
  listLawyerCommissionRows: async () => { if (state.fail) throw new Error("database failure"); return []; },
  setLawyerCommissionOverride: async () => { throw new Error("database failure"); },
}));
import { GET, PATCH } from "./route";
describe("commission API error responses", () => {
  beforeEach(() => { state.allowed = true; state.fail = false; });
  it("rejects an unauthorized reader", async () => {
    state.allowed = false;
    expect((await GET(new Request("https://example.test/api/admin/lawyer-commissions"))).status).toBe(403);
  });
  it("returns a handled failure so clients can leave the loading state", async () => {
    state.fail = true;
    const response = await GET(new Request("https://example.test/api/admin/lawyer-commissions"));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "internal_error" });
  });
  it("does not expose database errors when saving a commission", async () => {
    const response = await PATCH(new Request("https://example.test/api/admin/lawyer-commissions", { method: "PATCH", body: JSON.stringify({}) }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "internal_error" });
  });
});
