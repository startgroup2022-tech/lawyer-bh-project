import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  loadSettings: vi.fn(),
  loadView: vi.fn(),
  save: vi.fn(),
  record: vi.fn(),
  refresh: vi.fn(),
  test: vi.fn(),
  encryptionConfigured: vi.fn(() => true),
}));

vi.mock("@/lib/auth/admin-access", () => ({ requireSuperAdmin: mocks.admin }));
vi.mock("@/lib/tap/settings", () => ({
  loadTapSettings: mocks.loadSettings,
  loadTapSettingsView: mocks.loadView,
  saveTapSettings: mocks.save,
  recordTapConnectionTest: mocks.record,
}));
vi.mock("@/lib/tap/hydrate", () => ({ refreshTapConfig: mocks.refresh }));
vi.mock("@/lib/tap/connection-test", () => ({ testTapConnection: mocks.test }));
vi.mock("@/lib/tap/secret-box", () => ({ encryptionConfigured: mocks.encryptionConfigured }));

import { GET, PATCH, POST } from "./route";

const ORIGIN = "https://lawyers.bh";
const emptyEnv = { secretKey: null, publicKey: null, merchantId: null, marketplaceMid: null };
const completeEnv = { secretKey: "sk_test_x", publicKey: "pk_test_x", merchantId: "mid", marketplaceMid: "mp" };
const settings = {
  activeEnvironment: "test" as const,
  liveEnabled: false,
  test: completeEnv,
  live: emptyEnv,
  lastTestStatus: null,
  lastTestAt: null,
  lastTestMessage: null,
};

const patch = (body: unknown, origin = ORIGIN) =>
  PATCH(new Request(`${ORIGIN}/api/admin/tap-settings`, {
    method: "PATCH",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  }));

const post = (body: unknown, origin = ORIGIN) =>
  POST(new Request(`${ORIGIN}/api/admin/tap-settings`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  }));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.encryptionConfigured.mockReturnValue(true);
});

it("blocks non-admins on every method", async () => {
  mocks.admin.mockResolvedValue(null);
  expect((await GET()).status).toBe(403);
  expect((await patch({ activeEnvironment: "test" })).status).toBe(403);
  expect((await post({})).status).toBe(403);
  expect(mocks.save).not.toHaveBeenCalled();
});

it("blocks cross-origin writes", async () => {
  mocks.admin.mockResolvedValue({ id: "admin-1" });
  expect((await patch({ activeEnvironment: "test" }, "https://evil.example")).status).toBe(403);
  expect((await post({}, "https://evil.example")).status).toBe(403);
});

it("returns a masked settings view without secrets", async () => {
  mocks.admin.mockResolvedValue({ id: "admin-1" });
  mocks.loadView.mockResolvedValue({ activeEnvironment: "test", test: { secretKeyMasked: "••••" } });
  const response = await GET();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(JSON.stringify(body)).not.toContain("sk_test_x");
});

it("refuses to activate live before it is enabled", async () => {
  mocks.admin.mockResolvedValue({ id: "admin-1" });
  mocks.loadSettings.mockResolvedValue(settings);
  const response = await patch({ activeEnvironment: "live" });
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe("live_not_enabled");
  expect(mocks.save).not.toHaveBeenCalled();
});

it("refuses an incomplete target environment", async () => {
  mocks.admin.mockResolvedValue({ id: "admin-1" });
  mocks.loadSettings.mockResolvedValue({ ...settings, test: emptyEnv });
  const response = await patch({ activeEnvironment: "test" });
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe("incomplete_credentials");
  expect(mocks.save).not.toHaveBeenCalled();
});

it("saves a complete environment and refreshes the live config", async () => {
  mocks.admin.mockResolvedValue({ id: "admin-1" });
  mocks.loadSettings.mockResolvedValue(settings);
  mocks.loadView.mockResolvedValue({ activeEnvironment: "test", test: { secretKeyMasked: "••••" } });
  const response = await patch({ test: { merchantId: "new-mid" } });
  expect(response.status).toBe(200);
  expect(mocks.save).toHaveBeenCalledWith({ test: { merchantId: "new-mid" } }, "admin-1");
  expect(mocks.refresh).toHaveBeenCalled();
});

it("tests the connection and records the result", async () => {
  mocks.admin.mockResolvedValue({ id: "admin-1" });
  mocks.loadSettings.mockResolvedValue(settings);
  mocks.test.mockResolvedValue({ status: "connected", message: "ok" });
  const response = await post({ environment: "test" });
  expect(response.status).toBe(200);
  expect(mocks.test).toHaveBeenCalledWith({ environment: "test", secretKey: "sk_test_x" });
  expect(mocks.record).toHaveBeenCalledWith({ environment: "test", status: "connected", message: "ok" });
});
