import { describe, expect, it } from "vitest";

import { SosCaseAdminError, parseAdminSosCaseInput } from "./admin-case-types";

const validCase = {
  countryCode: "bh",
  slug: "direct-consultation",
  nameAr: "استشارة قانونية",
  nameEn: "Legal consultation",
  descriptionAr: "استشارة مباشرة مع أول محام متاح.",
  descriptionEn: "A direct consultation with the first available lawyer.",
  actionTypeAr: "محادثة واتصال",
  actionTypeEn: "Chat and call",
  price: "15.000",
  currencyCode: "bhd",
  workflowType: "direct_consultation",
  iconAssetUrl: "https://cdn.example.com/sos-case-icons/icon.svg",
  iconStorageKey: "sos-case-icons/11111111-1111-4111-8111-111111111111.svg",
  sortOrder: 4,
  isActive: true,
};

describe("SOS case admin validation", () => {
  it("normalizes a complete direct consultation case", () => {
    expect(parseAdminSosCaseInput(validCase)).toEqual({
      ...validCase,
      countryCode: "BH",
      currencyCode: "BHD",
      price: "15.000",
    });
  });

  it.each([
    ["invalid_slug", { slug: "استشارة" }],
    ["invalid_name", { nameAr: " " }],
    ["invalid_description", { descriptionEn: " " }],
    ["invalid_action_type", { actionTypeAr: " " }],
    ["invalid_price", { price: "0" }],
    ["invalid_currency", { currencyCode: "BD" }],
    ["invalid_order", { sortOrder: 1.5 }],
    ["invalid_workflow", { workflowType: "custom" }],
    ["invalid_icon", { iconAssetUrl: "javascript:alert(1)" }],
  ])("rejects %s", (code, override) => {
    expect(() => parseAdminSosCaseInput({ ...validCase, ...override })).toThrowError(
      new SosCaseAdminError(code),
    );
  });
});
