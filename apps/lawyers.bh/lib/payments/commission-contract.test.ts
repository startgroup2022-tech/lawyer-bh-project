import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PROVIDER_ONBOARDING_AGREEMENT_POINTS } from "@/lib/contract/agreementTemplate";

const appRoot = process.cwd();

function source(relativePath: string): string {
  return readFileSync(resolve(appRoot, relativePath), "utf8");
}

describe("lawyer commission contract", () => {
  it.each([
    "app/[locale]/join/Content.tsx",
    "app/[locale]/complete-profile/Content.tsx",
  ])("states the first-year and second-year rates in %s", (relativePath) => {
    const content = Object.values(PROVIDER_ONBOARDING_AGREEMENT_POINTS).flat().join("\n");
    expect(source(relativePath)).toContain("PROVIDER_ONBOARDING_AGREEMENT_POINTS");

    expect(content).toContain("commission of 20%");
    expect(content).toContain("during the first year");
    expect(content).toContain("45% beginning from the second year");
    expect(content).toContain("عمولة بنسبة 20%");
    expect(content).toContain("خلال السنة الأولى");
    expect(content).toContain("45% اعتبارًا من بداية السنة الثانية");
  });

  it("registers a forward-only schedule migration that never rewrites allocation snapshots", () => {
    const tag = "0056_update_lawyer_commission_schedule";
    const migrationPath = resolve(appRoot, "drizzle", `${tag}.sql`);
    const verificationPath = resolve(appRoot, "drizzle", `verify_${tag}.sql`);

    expect(existsSync(migrationPath)).toBe(true);
    expect(existsSync(verificationPath)).toBe(true);

    const journal = JSON.parse(source("drizzle/meta/_journal.json")) as {
      entries: Array<{
        idx: number;
        version: string;
        when: number;
        tag: string;
        breakpoints: boolean;
      }>;
    };
    const migration = readFileSync(migrationPath, "utf8");

    expect(journal.entries.find((entry) => entry.tag === tag)).toEqual({
      idx: 57,
      version: "7",
      when: 1788426000000,
      tag,
      breakpoints: true,
    });
    expect(migration).toContain("45.00");
    expect(migration).toContain("55.00");
    expect(migration).toContain("reviewed_at + INTERVAL '1 year'");
    expect(migration).not.toMatch(
      /(?:UPDATE|INSERT\s+INTO|DELETE\s+FROM)\s+(?:public\.)?bahrain_payment_allocations/i,
    );
  });
});
