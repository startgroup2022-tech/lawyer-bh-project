import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("admin dashboard cards", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

  it("links to lawyer import with lawyer permission", () => {
    expect(source).toContain('href: "/admin/lawyers/import"');
    expect(source).toContain('permission: "manage_lawyers"');
  });

  it("links to balances with finance permission", () => {
    expect(source).toContain('href: "/admin/provider-balances"');
    expect(source).toContain('permission: "manage_finance"');
  });

  it("links to FAQ management with its dedicated permission", () => {
    expect(source).toContain('href: "/admin/faq"');
    expect(source).toContain('permission: "manage_faq"');
  });

  it("links super administrators to language management with draft-readiness guidance", () => {
    const cardStart = source.indexOf('href: "/admin/languages"');
    expect(cardStart).toBeGreaterThan(-1);
    const card = source.slice(Math.max(0, cardStart - 360), cardStart + 220);
    expect(card).toContain("إدارة اللغات");
    expect(card).toContain("Language management");
    expect(card).toContain("كتالوج اللغات");
    expect(card).toContain("country data only");
    expect(card).toContain("لا ينشئ واجهة عامة");
    expect(card).toContain("superOnly: true");
  });

  it.each([
    ["/admin/terms", "general terms"],
    ["/admin/lawyer-terms", "lawyer registration terms"],
    ["/admin/lawyer-commissions", "lawyer commissions"],
  ])("links to %s with the terms and commissions permission", (href) => {
    const cardStart = source.indexOf(`href: "${href}"`);
    expect(cardStart).toBeGreaterThan(-1);
    expect(source.slice(cardStart, cardStart + 260)).toContain('permission: "manage_terms_commissions"');
  });
});
