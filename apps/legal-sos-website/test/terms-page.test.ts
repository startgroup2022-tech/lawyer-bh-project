import { describe, expect, it } from "vitest";
import { getTermsContent } from "@/lib/terms-content";

describe("LegalSOS terms content", () => {
  it("identifies the approved company as the legal owner", () => {
    const content = getTermsContent("ar");

    expect(content.owner).toBe(
      "GULF INTERNATIONAL COLLECTION AND CONSULTING CO. W.L.L",
    );
    expect(JSON.stringify(content)).not.toContain("ساريا سكوير");
    expect(JSON.stringify(content)).not.toContain("96375-5");
  });

  it.each(["ar", "en", "tr"] as const)(
    "provides the complete privacy contract in %s",
    (locale) => {
      const content = getTermsContent(locale);
      expect(content.sections.map((section) => section.key)).toEqual([
        "acceptance",
        "service-nature",
        "privacy",
        "data",
        "location-notifications",
        "sharing",
        "payments",
        "accounts",
        "limitations",
        "retention-rights",
        "law",
        "changes-contact",
      ]);
      expect(content.sections.every((section) => section.body.length > 40)).toBe(true);
      expect(JSON.stringify(content)).toContain("info@legalsos.org");
      expect(JSON.stringify(content)).not.toContain("info@legalsos.com");
    },
  );
});
