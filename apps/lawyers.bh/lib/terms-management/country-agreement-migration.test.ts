import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "drizzle/0109_country_scoped_legalsos_lawyer_terms.sql",
  "utf8",
);
const verification = readFileSync(
  "drizzle/verify_0109_country_scoped_legalsos_lawyer_terms.sql",
  "utf8",
);

describe("country-scoped LegalSOS lawyer agreement migration", () => {
  it("backfills Bahrain and creates an independently scoped Saudi publication", () => {
    expect(migration).toContain("SET country_code = 'BH'");
    expect(migration).toContain("document_type, 'SA', version");
    expect(migration).toContain(
      "terms_versions_one_published_per_country_document_idx",
    );
  });

  it("verifies both country publications and no unscoped agreements", () => {
    expect(verification).toContain("country_code IS NULL");
    expect(verification).toContain("country_code = 'BH'");
    expect(verification).toContain("country_code = 'SA'");
  });
});
