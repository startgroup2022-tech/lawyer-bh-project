import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ admin: null as null | { id: string } }));
const services = vi.hoisted(() => ({
  listTermsVersions: vi.fn(async () => []),
  createTermsDraft: vi.fn(async () => ({ id: "draft-1" })),
  updateTermsDraft: vi.fn(async () => ({ id: "draft-1" })),
  archiveTermsVersion: vi.fn(async () => ({ id: "draft-1", status: "archived" })),
  publishTermsVersion: vi.fn(async () => ({ id: "draft-1", status: "published" })),
}));
const requireAdminPermission = vi.hoisted(() => vi.fn(async () => state.admin));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission }));
vi.mock("@/lib/terms-management/service", () => services);

import { GET, POST } from "./route";
import { PATCH } from "./[id]/route";
import { POST as PUBLISH } from "./[id]/publish/route";

const validDraft = {
  documentType: "general",
  contentAr: "الشروط العربية",
  contentEn: "English terms",
};

describe("terms admin routes", () => {
  beforeEach(() => {
    state.admin = null;
    vi.clearAllMocks();
  });

  it.each([
    () => GET(new Request("http://x/api/admin/terms?documentType=general")),
    () => POST(new Request("http://x/api/admin/terms", { method: "POST", body: JSON.stringify(validDraft) })),
    () => PATCH(new Request("http://x/api/admin/terms/draft-1", { method: "PATCH", body: JSON.stringify(validDraft) }), { params: Promise.resolve({ id: "draft-1" }) }),
    () => PUBLISH(new Request("http://x/api/admin/terms/draft-1/publish", { method: "POST", body: JSON.stringify({ confirmation: "PUBLISH" }) }), { params: Promise.resolve({ id: "draft-1" }) }),
  ])("rejects an unauthorized request", async (request) => {
    expect((await request()).status).toBe(403);
    expect(requireAdminPermission).toHaveBeenCalledWith("manage_terms_commissions");
  });

  it("validates and creates a terms draft for the authorized admin", async () => {
    state.admin = { id: "admin-1" };
    const response = await POST(new Request("http://x/api/admin/terms", {
      method: "POST",
      body: JSON.stringify(validDraft),
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ ok: true, version: { id: "draft-1" } });
    expect(services.createTermsDraft).toHaveBeenCalledWith(
      expect.objectContaining({ documentType: "general", contentAr: "الشروط العربية", contentEn: "English terms" }),
      { adminId: "admin-1" },
    );
  });

  it("lists the requested legal document versions", async () => {
    state.admin = { id: "admin-1" };
    const response = await GET(new Request("http://x/api/admin/terms?documentType=lawyer_registration"));
    expect(response.status).toBe(200);
    expect(services.listTermsVersions).toHaveBeenCalledWith("lawyer_registration");
  });

  it.each(["privacy", "refund"])("creates and edits independent %s drafts", async (documentType) => {
    state.admin = { id: "admin-1" };
    const body = JSON.stringify({ ...validDraft, documentType });
    expect((await POST(new Request("http://x/api/admin/terms", { method: "POST", body }))).status).toBe(201);
    expect(services.createTermsDraft).toHaveBeenCalledWith(expect.objectContaining({ documentType, platformPercentageYearOne: null }), { adminId: "admin-1" });
    expect((await PATCH(new Request("http://x/api/admin/terms/draft-1", { method: "PATCH", body }), { params: Promise.resolve({ id: "draft-1" }) })).status).toBe(200);
    expect(services.updateTermsDraft).toHaveBeenCalledWith("draft-1", expect.objectContaining({ documentType }), { adminId: "admin-1" });
    expect((await GET(new Request(`http://x/api/admin/terms?documentType=${documentType}`))).status).toBe(200);
    expect(services.listTermsVersions).toHaveBeenCalledWith(documentType);
  });

  it("updates a validated draft", async () => {
    state.admin = { id: "admin-1" };
    const response = await PATCH(new Request("http://x/api/admin/terms/draft-1", {
      method: "PATCH",
      body: JSON.stringify(validDraft),
    }), { params: Promise.resolve({ id: "draft-1" }) });
    expect(response.status).toBe(200);
    expect(services.updateTermsDraft).toHaveBeenCalledWith(
      "draft-1",
      expect.objectContaining({ documentType: "general" }),
      { adminId: "admin-1" },
    );
  });

  it("archives a version without requiring draft content", async () => {
    state.admin = { id: "admin-1" };
    const response = await PATCH(new Request("http://x/api/admin/terms/draft-1", {
      method: "PATCH",
      body: JSON.stringify({ action: "archive" }),
    }), { params: Promise.resolve({ id: "draft-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      version: { id: "draft-1", status: "archived" },
    });
    expect(services.archiveTermsVersion).toHaveBeenCalledWith(
      "draft-1",
      { adminId: "admin-1" },
    );
    expect(services.updateTermsDraft).not.toHaveBeenCalled();
  });

  it("requires the literal PUBLISH confirmation before publishing", async () => {
    state.admin = { id: "admin-1" };
    const missing = await PUBLISH(new Request("http://x/api/admin/terms/draft-1/publish", {
      method: "POST",
      body: JSON.stringify({ confirmation: "publish" }),
    }), { params: Promise.resolve({ id: "draft-1" }) });
    expect(missing.status).toBe(400);
    expect(services.publishTermsVersion).not.toHaveBeenCalled();

    const accepted = await PUBLISH(new Request("http://x/api/admin/terms/draft-1/publish", {
      method: "POST",
      body: JSON.stringify({ confirmation: "PUBLISH" }),
    }), { params: Promise.resolve({ id: "draft-1" }) });
    expect(accepted.status).toBe(200);
    expect(services.publishTermsVersion).toHaveBeenCalledWith("draft-1", { adminId: "admin-1" });
  });
});
