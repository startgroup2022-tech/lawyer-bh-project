import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "drizzle/0110_activate_saudi_legalsos_registration.sql",
  "utf8",
);
const verification = readFileSync(
  "drizzle/verify_0110_activate_saudi_legalsos_registration.sql",
  "utf8",
);

describe("Saudi LegalSOS registration activation migration", () => {
  it("activates and provisions Saudi Arabia", () => {
    expect(migration).toContain("SET is_active = true");
    expect(verification).toContain("tables_provisioned = true");
  });

  it("enables LegalSOS while keeping the public Lawyers.bh website disabled", () => {
    expect(migration).toContain("VALUES ('SA', true, false, now())");
    expect(verification).toContain("app_enabled = true");
    expect(verification).toContain("website_enabled = false");
  });
});
