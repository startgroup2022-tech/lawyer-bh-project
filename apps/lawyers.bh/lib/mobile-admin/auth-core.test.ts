import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import {
  createMobileAdminAuth,
  type MobileAdminAuthStore,
} from "./auth-core";

const now = new Date("2026-09-20T12:00:00.000Z");
const adminId = "550e8400-e29b-41d4-a716-446655440000";

async function fixture(overrides: Partial<{ active: boolean; permitted: boolean }> = {}) {
  const passwordHash = await bcrypt.hash("correct-password", 4);
  const sessions = new Map<string, { adminId: string; expiresAt: Date }>();
  const admin = {
    id: adminId,
    fullName: "Admin User",
    email: "admin@example.com",
    passwordHash,
    role: "admin" as const,
    isActive: overrides.active ?? true,
    permissions: { manage_requests: overrides.permitted ?? true },
  };
  const store: MobileAdminAuthStore = {
    findAdminByEmail: async (email) => email === admin.email ? admin : null,
    findAdminById: async (id) => id === admin.id ? admin : null,
    saveSession: async (digest, id, expiresAt) => { sessions.set(digest, { adminId: id, expiresAt }); },
    findSession: async (digest) => sessions.get(digest) ?? null,
    revokeSession: async (digest) => { sessions.delete(digest); },
  };
  return { auth: createMobileAdminAuth(store, () => now), sessions, admin };
}

describe("mobile admin authorization", () => {
  it("issues a credential for an active permitted website admin without storing the raw token", async () => {
    const { auth, sessions } = await fixture();
    const result = await auth.login("admin@example.com", "correct-password");
    expect(result).not.toBeNull();
    expect(result?.admin).toMatchObject({ id: adminId, fullName: "Admin User" });
    expect(sessions.has(result!.token)).toBe(false);
    expect(await auth.authorize(result!.token, "manage_requests")).toMatchObject({ id: adminId });
  });

  it("rejects wrong passwords and inactive accounts", async () => {
    const active = await fixture();
    expect(await active.auth.login("admin@example.com", "wrong-password")).toBeNull();
    const inactive = await fixture({ active: false });
    expect(await inactive.auth.login("admin@example.com", "correct-password")).toBeNull();
  });

  it("rejects revoked, expired, and insufficient-permission credentials", async () => {
    const { auth, sessions, admin } = await fixture();
    const issued = await auth.login(admin.email, "correct-password");
    expect(issued).not.toBeNull();
    admin.permissions.manage_requests = false;
    expect(await auth.authorize(issued!.token, "manage_requests")).toBeNull();
    admin.permissions.manage_requests = true;
    const saved = [...sessions.values()][0];
    saved.expiresAt = new Date(now.getTime() - 1);
    expect(await auth.authorize(issued!.token, "manage_requests")).toBeNull();
    saved.expiresAt = new Date(now.getTime() + 1000);
    await auth.logout(issued!.token);
    expect(await auth.authorize(issued!.token, "manage_requests")).toBeNull();
  });
});
