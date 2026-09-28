import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ admin: null as null | { id: string }, listed: { categories: [], questions: [] }, created: { id: "category-1" } }));
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: vi.fn(async () => state.admin) }));
vi.mock("@/lib/faq/service", () => ({
  listAdminFaq: vi.fn(async () => state.listed),
  createCategory: vi.fn(async () => state.created),
}));

import { GET } from "./route";
import { POST as createCategory } from "./categories/route";

describe("FAQ admin routes", () => {
  beforeEach(() => { state.admin = null; });

  it("rejects reads and writes without manage_faq", async () => {
    expect((await GET()).status).toBe(403);
    const response = await createCategory(new Request("https://lawyers.bh/api/admin/faq/categories", { method: "POST", body: "{}" }));
    expect(response.status).toBe(403);
  });

  it("returns authorized FAQ management data", async () => {
    state.admin = { id: "admin-1" };
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, categories: [], questions: [], counts: { published: 0, draft: 0, archived: 0 } });
  });
});
