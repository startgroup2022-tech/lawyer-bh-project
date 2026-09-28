import { describe, expect, it } from "vitest";
import { providerDashboardCards } from "./providerDashboardNavigation";

describe("providerDashboardCards", () => {
  it("returns the three approved Arabic destinations", () => {
    expect(providerDashboardCards("ar").map((card) => card.href)).toEqual([
      "/ar/provider-dashboard/requests",
      "/ar/provider-dashboard/balances",
      "/ar/provider-dashboard/profile",
    ]);
    expect(providerDashboardCards("ar").map((card) => card.title)).toEqual([
      "طلباتي",
      "الأرصدة وروابط الدفع",
      "الملف الشخصي",
    ]);
  });

  it("returns English cards and combines balances with payment links", () => {
    const cards = providerDashboardCards("en");
    expect(cards).toHaveLength(3);
    expect(cards[1]).toMatchObject({
      view: "balances",
      title: "Balances & Payment Links",
      href: "/en/provider-dashboard/balances",
    });
  });

  it("normalizes unsupported locales to English routes", () => {
    expect(providerDashboardCards("fr")[0].href).toBe("/en/provider-dashboard/requests");
  });
});
