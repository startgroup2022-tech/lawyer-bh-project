import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../drizzle/0066_saraya_shared_office_parts.sql", import.meta.url),
  "utf8",
);
const drizzleConfig = readFileSync(new URL("../../../drizzle.config.ts", import.meta.url), "utf8");
const turboConfig = readFileSync(new URL("../../../../../turbo.json", import.meta.url), "utf8");

describe("Saraya shared-office migration", () => {
  it("defines property-scoped parent units and hierarchy metadata", () => {
    expect(migration).toContain('ADD COLUMN "parent_unit_id" uuid');
    expect(migration).toContain('ADD COLUMN "is_rentable" boolean DEFAULT true NOT NULL');
    expect(migration).toContain('FOREIGN KEY ("property_id", "parent_unit_id")');
    expect(migration).toContain('REFERENCES "public"."saraya_units"("property_id", "id")');
    expect(migration).toContain('saraya_units_property_parent_order_idx');
  });

  it("prevents invalid child metadata", () => {
    expect(migration).toContain('saraya_units_part_order_check');
    expect(migration).toContain('saraya_units_part_names_check');
    expect(migration).toContain('saraya_units_parent_rentable_check');
  });

  it("accepts Vercel's direct Postgres integration variable", () => {
    expect(drizzleConfig).toContain("process.env.POSTGRES_URL_NON_POOLING");
    expect(turboConfig).toContain('"POSTGRES_URL_NON_POOLING"');
  });
});
