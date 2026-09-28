import { describe, expect, it } from "vitest";
import { getDictionary, getDirection, isLocale } from "@/lib/i18n";

describe("locale contract", () => {
  it("supports Arabic, English and Turkish with correct direction", () => {
    expect(["ar", "en", "tr"].every(isLocale)).toBe(true);
    expect(getDirection("ar")).toBe("rtl");
    expect(getDirection("en")).toBe("ltr");
    expect(getDirection("tr")).toBe("ltr");
  });

  it.each(["ar", "en", "tr"] as const)("loads complete core copy for %s", (locale) => {
    const copy = getDictionary(locale);
    expect(copy.hero.title).toBeTruthy();
    expect(copy.sos.submit).toBeTruthy();
    expect(copy.emergencyDisclaimer).toBeTruthy();
  });

  it.each(["ar", "en", "tr"] as const)("has complete portal navigation for %s", (locale) => {
    expect(Object.keys(getDictionary(locale).portal.nav)).toEqual([
      "overview", "requests", "messages", "documents", "appointments", "payments", "profile",
    ]);
  });

  it.each(["ar", "en", "tr"] as const)("has complete public shell copy for %s", (locale) => {
    const copy = getDictionary(locale);

    expect(copy.nav.about).toBeTruthy();
    expect(copy.footer.description).toBeTruthy();
    expect(Object.keys(copy.footer.links)).toEqual([
      "home", "about", "help", "portal", "lawyerRegister", "services", "howItWorks", "terms", "refundPolicy",
    ]);
  });

  it.each(["ar", "en", "tr"] as const)("has complete About page copy for %s", (locale) => {
    const about = getDictionary(locale).about;

    expect(about.title).toBeTruthy();
    expect(about.values.items).toHaveLength(3);
    expect(about.process.steps).toHaveLength(3);
    expect(about.management.member.name).toBeTruthy();
    expect(about.management.member.role).toBeTruthy();
    expect(about.cta.primary).toBeTruthy();
    expect(about.cta.secondary).toBeTruthy();
  });
});
