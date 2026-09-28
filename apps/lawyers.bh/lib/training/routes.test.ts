import { beforeEach, describe, expect, it, vi } from "vitest";
import { hasAdminPermission, normalizeAdminPermissions, DEFAULT_ADMIN_PERMISSIONS } from "@/lib/auth/admin-permissions";
const fixture = vi.hoisted(() => ({ granted: false, calls: 0, largeFile: false }));
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: async (permission: string) => fixture.granted && permission === "manage_training" ? { id: "admin" } : null }));
vi.mock("./repository", () => ({ training: {
  listApplications: async () => { fixture.calls++; return { applications: [], total: 0 }; },
  getApplication: async () => { fixture.calls++; return { id: "test", reference: "TRN-123", notes: "private" }; },
  reviewApplication: async () => { fixture.calls++; return { id: "test" }; },
  attachment: async () => { fixture.calls++; return { reference: "TRN-123", kind: "cv", bytes: fixture.largeFile ? Buffer.alloc(5 * 1024 * 1024, 65) : Buffer.from("%PDF-test") }; },
  startUpload: async () => { fixture.calls++; return { token: "a".repeat(64) }; },
  appendUpload: async () => { fixture.calls++; }, finalizeUpload: async () => { fixture.calls++; return { reference: "TRN-123" }; },
} }));
import { GET as list } from "@/app/api/admin/training/applications/route";
import { GET as detail, PATCH as review } from "@/app/api/admin/training/applications/[id]/route";
import { GET as file } from "@/app/api/admin/training/applications/[id]/files/[kind]/route";
import { POST as start } from "@/app/api/training/applications/route";
import { POST as finish, PUT as chunk } from "@/app/api/training/applications/[token]/route";
const ctx = { params: Promise.resolve({ id: "test", kind: "cv", token: "a".repeat(64) }) };
const req = (path: string, method = "GET", body?: string, origin = "https://www.lawyers.bh") => new Request(`https://www.lawyers.bh${path}`, { method, headers: { origin }, ...(body !== undefined ? { body } : {}) });
beforeEach(() => { fixture.granted = false; fixture.calls = 0; fixture.largeFile = false; });
describe("training permissions and route boundary", () => {
  it("streams maximum-size downloads in bounded chunks", async () => {
    fixture.granted = true; fixture.largeFile = true;
    const response = await file(req("/api/admin/training/applications/test/files/cv"), ctx);
    const reader = response.body!.getReader(); let total = 0;
    while (true) { const {value, done} = await reader.read(); if (done) break; expect(value.length).toBeLessThanOrEqual(64 * 1024); total += value.length; }
    expect(total).toBe(5 * 1024 * 1024);
  });
  it("keeps the new permission explicit, not inherited from careers or default admins", () => {
    expect(normalizeAdminPermissions({ manage_training: true })).toEqual({ manage_training: true });
    expect(DEFAULT_ADMIN_PERMISSIONS.manage_training).not.toBe(true);
    expect(hasAdminPermission({ role: "admin", isActive: true, permissions: { manage_careers: true } }, "manage_training")).toBe(false);
  });
  it("blocks all private endpoints before storage access", async () => {
    for (const response of [await list(req("/api/admin/training/applications")), await detail(req("/api/admin/training/applications/test"), ctx), await review(req("/api/admin/training/applications/test", "PATCH", "{}"), ctx), await file(req("/api/admin/training/applications/test/files/cv"), ctx)]) expect(response.status).toBe(403);
    expect(fixture.calls).toBe(0);
  });
  it("returns protected lists, details and downloads to the dedicated permission", async () => {
    fixture.granted = true;
    const listed = await list(req("/api/admin/training/applications")); expect(listed.status).toBe(200); expect(await listed.json()).toMatchObject({ total: 0 });
    const detailed = await detail(req("/api/admin/training/applications/test"), ctx); expect(await detailed.json()).toMatchObject({ application: { reference: "TRN-123" } });
    const downloaded = await file(req("/api/admin/training/applications/test/files/cv"), ctx);
    expect(downloaded.headers.get("content-disposition")).toBe('attachment; filename="TRN-123-cv.pdf"');
    expect(downloaded.headers.get("cache-control")).toBe("private, no-store"); expect(downloaded.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await downloaded.text()).toBe("%PDF-test");
  });
  it("rejects cross-origin mutations and oversized streamed chunks", async () => {
    fixture.granted = true;
    expect((await review(req("/api/admin/training/applications/test", "PATCH", "{}", "https://evil.invalid"), ctx)).status).toBe(403);
    expect((await start(req("/api/training/applications", "POST", "{}", "https://evil.invalid"))).status).toBe(403);
    expect((await chunk(req("/api/training/applications/token?kind=cv&offset=0", "PUT", "x".repeat(1048577)), ctx)).status).toBe(413);
    expect(fixture.calls).toBe(0);
  });
  it("returns only the public receipt after finalization", async () => {
    const response = await finish(req("/api/training/applications/token", "POST"), ctx);
    expect(await response.json()).toEqual({ ok: true, reference: "TRN-123" });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
