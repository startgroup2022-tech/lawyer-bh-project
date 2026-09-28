import { beforeEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
const state = vi.hoisted(() => ({
  cookies: new Map<string, string>(),
  rows: [] as unknown[][],
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) =>
      state.cookies.has(key) ? { value: state.cookies.get(key) } : undefined,
  }),
}));
vi.mock("@/lib/db/client", async () => {
  const schema = await import("@/lib/db/schema");
  return {
    schema,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => state.rows.shift() ?? [] }),
        }),
      }),
    },
  };
});
import {
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "./admin-session";
import {
  createProviderSessionValue,
  setProviderSession,
  clearProviderSession,
} from "@/app/api/provider/_session";
import { redirectAuthenticatedEntry } from "./session-entry";
beforeEach(() => {
  state.cookies.clear();
  state.rows = [];
  vi.stubEnv("ADMIN_AUTH_SECRET", "entry-test-only");
  vi.stubEnv("LAWYER_AUTH_SECRET", "entry-test-only");
});
const admin = () => {
  state.cookies.set(
    "admin_session",
    createAdminSessionToken({
      id: "00000000-0000-4000-8000-000000000001",
      email: "test@example.invalid",
      role: "admin",
    }),
  );
  state.rows.push([
    { id: "admin", isActive: true, role: "admin", permissions: [] },
  ]);
};
const provider = () => {
  state.cookies.set(
    "provider_session",
    createProviderSessionValue("00000000-0000-4000-8000-000000000002"),
  );
  state.rows.push([
    {
      id: "provider",
      status: "approved",
      isActive: true,
      profileCompleted: true,
      licenseExpiryDate: "2099-01-01",
      suspensionType: null,
    },
  ]);
};
it("leaves anonymous visitors on the entry form", async () => {
  await expect(redirectAuthenticatedEntry("ar")).resolves.toBeUndefined();
});
it("redirects a saved active admin to the Arabic dashboard", async () => {
  admin();
  await expect(redirectAuthenticatedEntry("ar")).rejects.toMatchObject({
    digest: expect.stringContaining("/ar/admin;"),
  });
});
it("redirects a saved provider to their English dashboard", async () => {
  provider();
  await expect(redirectAuthenticatedEntry("en")).rejects.toMatchObject({
    digest: expect.stringContaining("/en/provider-dashboard;"),
  });
});
it("does not use a provider session on the admin login page", async () => {
  provider();
  await expect(
    redirectAuthenticatedEntry("ar", "admin"),
  ).resolves.toBeUndefined();
});
it("does not use an admin session on the provider login page", async () => {
  admin();
  await expect(
    redirectAuthenticatedEntry("ar", "provider"),
  ).resolves.toBeUndefined();
});
it("prefers admin on generic entry when both cookies exist", async () => {
  admin();
  provider();
  await expect(redirectAuthenticatedEntry("ar")).rejects.toMatchObject({
    digest: expect.stringContaining("/ar/admin;"),
  });
});
it("does not redirect a removed admin", async () => {
  admin();
  state.rows = [[]];
  await expect(redirectAuthenticatedEntry("ar")).resolves.toBeUndefined();
});
it("does not redirect a disabled provider", async () => {
  provider();
  state.rows = [
    [
      {
        status: "approved",
        isActive: false,
        profileCompleted: true,
        licenseExpiryDate: "2099-01-01",
        suspensionType: null,
      },
    ],
  ];
  await expect(redirectAuthenticatedEntry("ar")).resolves.toBeUndefined();
});
it("expired admin sessions remain on login", async () => {
  admin();
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 8 * 86400000);
  await expect(redirectAuthenticatedEntry("ar")).resolves.toBeUndefined();
});
it("malformed signatures are treated as signed out without crashing", async () => {
  state.cookies.set("admin_session", "e30.x");
  state.cookies.set("provider_session", "BH:fake.x");
  expect(() => verifyAdminSessionToken("e30.x")).not.toThrow();
  await expect(redirectAuthenticatedEntry("ar")).resolves.toBeUndefined();
});
it("retains a persistent provider cookie and removes it on logout", () => {
  const response = NextResponse.json({ ok: true });
  setProviderSession(response, "provider");
  expect(response.cookies.get("provider_session")?.maxAge).toBe(2592000);
  clearProviderSession(response);
  expect(response.cookies.get("provider_session")?.maxAge).toBe(0);
});
