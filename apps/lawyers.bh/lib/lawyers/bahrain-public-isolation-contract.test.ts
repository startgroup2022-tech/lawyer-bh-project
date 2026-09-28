import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const publicRepository = readFileSync("lib/publicLawyers.ts", "utf8");
const directory = readFileSync("app/[locale]/directory/page.tsx", "utf8");
const profile = readFileSync("app/[locale]/directory/[slug]/page.tsx", "utf8");
const sitemap = readFileSync("app/sitemap.ts", "utf8");

describe("public Lawyers.bh Bahrain isolation", () => {
  it("defines Bahrain as the non-overridable public website default", () => {
    expect(publicRepository).toContain('PUBLIC_LAWYERS_BH_COUNTRY = "BH"');
    expect(publicRepository).toContain("eq(schema.bahrainLawyers.countryCode, normalizedCountryCode)");
  });

  it("does not pass a country selector from directory, profile, or sitemap", () => {
    expect(directory).toContain("getPublicLawyers()");
    expect(directory).not.toMatch(/getPublicLawyers\([^)]/);
    expect(profile).toContain("getPublicLawyerBySlug(slug)");
    expect(sitemap).toContain("getPublicLawyers()");
    for (const source of [directory, profile, sitemap]) {
      expect(source).not.toContain("saudi_lawyers");
      expect(source).not.toContain('countryCode: "SA"');
    }
  });
});
