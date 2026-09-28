import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "drizzle/0118_saraya_documents.sql";
const migration = existsSync(migrationPath)
  ? readFileSync(migrationPath, "utf8")
  : "";
const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");
const journal = JSON.parse(
  readFileSync("drizzle/meta/_journal.json", "utf8"),
) as { entries: Array<{ idx: number; tag: string }> };

describe("0117 Saraya documents migration", () => {
  it("creates property-scoped document metadata", () => {
    expect(migration).toContain('CREATE TABLE "saraya_documents"');
    expect(migration).toContain('"storage_key" text NOT NULL');
    expect(migration).toContain('"content_type" varchar(96) NOT NULL');
    expect(migration).toContain('"size_bytes" integer NOT NULL');
    expect(schema).toContain('"saraya_documents"');
  });

  it("keeps unit, tenant and lease references inside the property", () => {
    expect(migration).toContain('CONSTRAINT "saraya_documents_property_unit_fk"');
    expect(migration).toContain('CONSTRAINT "saraya_documents_property_tenant_fk"');
    expect(migration).toContain('CONSTRAINT "saraya_documents_property_lease_fk"');
  });

  it("appends after maintenance tickets", () => {
    const previous = journal.entries.find(
      (entry) => entry.tag === "0117_saraya_maintenance_tickets",
    );
    const current = journal.entries.find(
      (entry) => entry.tag === "0118_saraya_documents",
    );
    expect(current!.idx).toBe(previous!.idx + 1);
  });
});
