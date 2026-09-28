import { expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ role: "admin" as "admin" | "provider" }));
vi.mock("./session-entry", () => ({
  redirectAuthenticatedEntry: async (locale: string, role?: string) => {
    if (!role || role === auth.role)
      throw new Error(`dashboard:${locale}:${auth.role}`);
  },
}));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {} }));
vi.mock("@/lib/terms-management/service", () => ({
  getPublishedTerms: async () => null,
}));
// UI modules depend on a mounted browser; this test exercises their server page boundary.
vi.mock("@/app/[locale]/join/Content", () => ({ default: () => null }));
vi.mock("@/app/[locale]/login/LoginOptions", () => ({ default: () => null }));
vi.mock("@/app/[locale]/login/RoleLoginForm", () => ({ default: () => null }));
import Login from "@/app/[locale]/login/page";
import Role from "@/app/[locale]/login/[role]/page";
import Join from "@/app/[locale]/join/page";
it.each(["admin", "provider"] as const)(
  "login and join redirect the saved %s before rendering",
  async (role) => {
    auth.role = role;
    for (const Page of [Login, Join])
      await expect(
        Page({ params: Promise.resolve({ locale: "ar" }) }),
      ).rejects.toThrow(`dashboard:ar:${role}`);
  },
);
it.each(["admin", "provider"] as const)(
  "role login redirects only its own saved %s session",
  async (role) => {
    auth.role = role;
    await expect(
      Role({ params: Promise.resolve({ locale: "en", role }) }),
    ).rejects.toThrow(`dashboard:en:${role}`);
  },
);
