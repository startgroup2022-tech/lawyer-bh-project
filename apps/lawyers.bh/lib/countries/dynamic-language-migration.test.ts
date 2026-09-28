import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "drizzle/0112_dynamic_languages_country_platforms.sql",
  "utf8",
);
const verification = readFileSync(
  "drizzle/verify_0112_dynamic_languages_country_platforms.sql",
  "utf8",
);

describe("dynamic language and product migration", () => {
  it("seeds published ar, en, and tr and backfills compatibility values", () => {
    for (const code of ["ar", "en", "tr"]) {
      expect(migration).toContain(`'${code}'`);
    }

    expect(migration).toContain("lawyers_platform_enabled");
    expect(migration).toContain("legal_sos_enabled");
    expect(migration).toContain("activate_country_platform");
    expect(verification).toContain("RAISE EXCEPTION");
  });

  it("preserves every normalized country default as a published membership", () => {
    expect(migration).toContain("Existing locale (");
    expect(migration).toMatch(
      /SELECT DISTINCT\s+lower\(btrim\(c\.default_locale\)\)/,
    );
    expect(migration).toContain("country_language_settings_require_published");
    expect(migration).toContain("platform_languages_prevent_used_downgrade");
    expect(verification).toContain(
      "cls.language_code IS DISTINCT FROM lower(btrim(c.default_locale))",
    );
    expect(verification).toContain("l.status IS DISTINCT FROM 'published'");
  });

  it("serializes membership checks with language downgrades", () => {
    expect(migration).toMatch(
      /FROM public\.platform_languages l\s+WHERE l\.code = NEW\.language_code\s+FOR UPDATE/,
    );
    expect(migration).toContain(
      "Membership and status downgrade serialize on this same language row",
    );
  });

  it("recognizes RTL primary languages and RTL script tags", () => {
    for (const code of [
      "ar",
      "ckb",
      "dv",
      "fa",
      "he",
      "nqo",
      "ps",
      "sd",
      "syr",
      "ug",
      "ur",
      "yi",
    ]) {
      expect(migration).toContain(`'${code}'`);
    }
    expect(migration).toContain(
      "(arab|hebr|adlm|rohg|nkoo|syrc|thaa|mand|samr)",
    );
    expect(migration).not.toMatch(
      /split_part[^]*?IN\s*\([^)]*'ff'[^)]*\)\s*THEN 'rtl'/,
    );
  });

  it("is non-destructive and keeps the other product flag during activation", () => {
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i);
    expect(migration).not.toMatch(/\bDELETE\s+FROM\b/i);
    expect(migration).toContain("IF NOT country_ready THEN");
    expect(migration).toContain(
      "ELSE country_channel_settings.lawyers_platform_enabled",
    );
    expect(migration).toContain(
      "ELSE country_channel_settings.legal_sos_enabled",
    );
    expect(verification).not.toMatch(
      /(?:PERFORM|FROM)\s+public\.activate_country_platform\s*\(/i,
    );
  });
});
