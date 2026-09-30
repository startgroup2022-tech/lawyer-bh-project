import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  admin: null as null | { id: string },
  actionInput: null as null | Record<string, unknown>,
}));

vi.mock("@/lib/auth/admin-access", () => ({
  requireAdminPermission: vi.fn(async () => state.admin),
}));
vi.mock("@/lib/communications/moderation/store", () => ({
  listModerationReports: vi.fn(async () => ({ items: [{ id: "report-1", status: "open" }], nextCursor: null })),
  getModerationReport: vi.fn(async (id: string) => id === "missing" ? null : ({ id, status: "open", evidence: [] })),
  applyModerationAction: vi.fn(async (input: Record<string, unknown>) => {
    state.actionInput = input;
    return { reportId: input.reportId, status: "actioned", action: input.action };
  }),
}));

import { GET as LIST } from "./route";
import { GET as DETAIL } from "./[id]/route";
import { POST as ACTION } from "./[id]/actions/route";

describe("admin moderation routes", () => {
  beforeEach(() => {
    state.admin = { id: "22222222-2222-4222-8222-222222222222" };
    state.actionInput = null;
  });

  it("uses the existing admin permission session for every endpoint", async () => {
    state.admin = null;
    expect((await LIST(new Request("https://example.test/api/admin/moderation/reports"))).status).toBe(403);
    expect((await DETAIL(new Request("https://example.test"), { params: Promise.resolve({ id: "report-1" }) })).status).toBe(403);
    expect((await ACTION(new Request("https://example.test", { method: "POST", body: "{}" }), { params: Promise.resolve({ id: "report-1" }) })).status).toBe(403);
  });

  it("lists reports for an authorized platform administrator", async () => {
    const response = await LIST(new Request("https://example.test/api/admin/moderation/reports?status=open"));
    expect(response.status).toBe(200);
    expect((await response.json()).items).toEqual([{ id: "report-1", status: "open" }]);
  });

  it("applies a chat suspension using the signed-in admin rather than a body admin id", async () => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await ACTION(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "chat_suspension",
          internalReason: "Repeated harassment",
          publicMessageAr: "تم تعطيل المحادثة مؤقتًا.",
          publicMessageEn: "Chat has been temporarily disabled.",
          expiresAt,
          adminId: "attacker",
        }),
      }),
      { params: Promise.resolve({ id: "report-1" }) },
    );
    expect(response.status).toBe(200);
    expect(state.actionInput).toEqual({
      reportId: "report-1",
      adminId: "22222222-2222-4222-8222-222222222222",
      action: "chat_suspension",
      internalReason: "Repeated harassment",
      publicMessageAr: "تم تعطيل المحادثة مؤقتًا.",
      publicMessageEn: "Chat has been temporarily disabled.",
      expiresAt,
    });
  });

  it("requires a future expiry for chat suspension", async () => {
    const response = await ACTION(
      new Request("https://example.test", {
        method: "POST",
        body: JSON.stringify({ action: "chat_suspension", internalReason: "Reason" }),
      }),
      { params: Promise.resolve({ id: "report-1" }) },
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_moderation_expiry" });
  });
});
