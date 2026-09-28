import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ allowed: false }));
vi.mock("@/lib/auth/admin-access", () => ({ requireAdminPermission: async (permission: string) => state.allowed && permission === "manage_terms_commissions" }));
vi.mock("next-intl/server", () => ({ setRequestLocale: () => {} }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error("redirect:" + path); } }));
import Page from "./page";
describe("public policies admin page", () => {
  beforeEach(() => { state.allowed = false; });
  it("denies access without the existing terms permission", async () => {
    await expect(Page({ params: Promise.resolve({ locale: "ar" }), searchParams: Promise.resolve({ policy: "privacy" }) })).rejects.toThrow("redirect:/ar/admin");
  });
  it.each(["general", "privacy", "refund"])("opens the requested %s tab", async (policy) => {
    state.allowed = true;
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "ar" }), searchParams: Promise.resolve({ policy }) }));
    expect(html.match(/<a[^>]+aria-current="page"[^>]*>/)?.[0]).toContain("?policy=" + policy);
    expect(html).toContain("إدارة السياسات العامة");
  });
  it("does not expose lawyer registration through a public policy tab", async () => {
    state.allowed = true;
    const html = renderToStaticMarkup(await Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ policy: "lawyer_registration" }) }));
    expect(html.match(/<a[^>]+aria-current="page"[^>]*>/)?.[0]).toContain("?policy=general");
  });
});
