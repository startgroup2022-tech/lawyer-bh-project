import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("LegalSOS footer contact", () => {
  it("uses the public .org contact address", () => {
    const source = readFileSync("components/SiteFooter.tsx", "utf8");
    expect(source).toContain("info@legalsos.org");
    expect(source).not.toContain("info@legalsos.com");
  });
});
