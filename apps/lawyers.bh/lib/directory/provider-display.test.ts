import { describe, expect, it } from "vitest";

import {
  displayMembershipNumber,
  displayProviderName,
  providerMatchesCategory,
  providerRoleLabels,
  providerRoles,
} from "./provider-display";

describe("public provider display policy", () => {
  it("returns every valid role once in canonical order", () => {
    expect(providerRoles({
      subscriptionType: "consultant",
      subscriptionTypes: ["private_executor", "lawyer", "private_executor"],
    })).toEqual(["lawyer", "private_executor"]);
  });

  it("falls back to the legacy singular role", () => {
    expect(providerRoles({ subscriptionType: "mediator", subscriptionTypes: [] })).toEqual(["mediator"]);
  });

  it("localizes distinct role tags without definite articles", () => {
    expect(providerRoleLabels(["lawyer", "private_executor"], true)).toEqual(["محامي", "منفذ خاص"]);
  });

  it("matches any registered role category", () => {
    const provider = { subscriptionType: "lawyer", subscriptionTypes: ["lawyer", "expert"] };
    expect(providerMatchesCategory(provider, "expert")).toBe(true);
    expect(providerMatchesCategory(provider, "translator")).toBe(false);
  });

  it("uses the real membership number and a localized missing label", () => {
    expect(displayMembershipNumber(" LBH-001004 ", true)).toBe("LBH-001004");
    expect(displayMembershipNumber(null, true)).toBe("غير متوفر");
    expect(displayMembershipNumber("", false)).toBe("Not available");
  });

  it("returns the stored name without a role prefix", () => {
    expect(displayProviderName({ nameAr: "حبيب محمد", nameEn: "Habib Mohammed" }, true)).toBe("حبيب محمد");
  });
});
