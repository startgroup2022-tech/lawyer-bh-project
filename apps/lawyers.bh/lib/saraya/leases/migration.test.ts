import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0064_saraya_leases.sql", "utf8");
const verify = readFileSync("drizzle/verify_0064_saraya_leases.sql", "utf8");
const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");
const repository = readFileSync("lib/saraya/leases/repository.ts", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ idx: number; tag: string }> };

describe("0064 Saraya lease migration contract", () => {
  it.each(["saraya_leases", "saraya_lease_versions", "saraya_rent_schedule_items"])("creates and verifies %s", (table) => {
    expect(migration).toContain(`CREATE TABLE "${table}"`);
    expect(verify).toContain(table);
    expect(schema).toContain(`"${table}"`);
  });
  it("enforces property-scoped unit, tenant, lease and version references", () => {
    for (const constraint of ["saraya_leases_property_unit_fk", "saraya_leases_property_tenant_fk", "saraya_lease_versions_property_lease_fk", "saraya_rent_schedule_property_version_fk"]) {
      expect(migration).toContain(`CONSTRAINT "${constraint}"`);
      expect(verify).toContain(constraint);
    }
  });
  it("creates a composite unique target before referencing scoped units", () => {
    const target = 'ADD CONSTRAINT "saraya_units_property_id_key" UNIQUE ("property_id", "id")';
    const foreignKey = 'CONSTRAINT "saraya_leases_property_unit_fk"';
    expect(migration).toContain(target);
    expect(migration.indexOf(target)).toBeLessThan(migration.indexOf(foreignKey));
  });
  it("makes approved version rows immutable", () => {
    expect(migration).toContain("BEFORE UPDATE OR DELETE ON \"saraya_lease_versions\"");
    expect(verify).toContain("saraya_lease_versions_immutable");
  });
  it("locks lease versions to their parent current version with a deferred composite FK", () => {
    expect(migration).toContain('FOREIGN KEY ("property_id", "id", "current_version")');
    expect(migration).toContain('REFERENCES "public"."saraya_lease_versions"("property_id", "lease_id", "version") DEFERRABLE INITIALLY DEFERRED');
  });
  it("persists immutable actor-attributed events and immutable schedules", () => {
    expect(migration).toContain('CREATE TABLE "saraya_lease_events"');
    expect(migration).toContain('"actor_user_id" uuid NOT NULL');
    expect(migration).toContain('"reason" text');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "saraya_lease_events"');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "saraya_rent_schedule_items"');
  });
  it("serializes competing approvals by locking the property-scoped unit row", () => {
    expect(repository).toContain("JOIN saraya_units u ON u.property_id=l.property_id AND u.id=l.unit_id");
    expect(repository).toContain("FOR UPDATE OF l,u");
    expect(repository.indexOf("FOR UPDATE OF l,u")).toBeLessThan(repository.indexOf("hasOverlappingActiveLease"));
  });
  it("verifies owning tables, targets, and ordered composite columns", () => {
    expect(verify).toContain("conrelid = 'public.saraya_leases'::regclass");
    expect(verify).toContain("confrelid = 'public.saraya_units'::regclass");
    expect(verify).toContain("ARRAY['property_id', 'unit_id']");
    expect(verify).toContain("ARRAY['property_id', 'id']");
  });
  it("keeps named event and custom deferred constraints aligned with Drizzle metadata", () => {
    expect(schema).toContain('name: "saraya_lease_events_actor_user_fk"');
    expect(schema).toContain('name: "saraya_leases_current_version_fk"');
    expect(schema).toContain('managedByMigration: "0064_saraya_leases.sql"');
    expect(verify).toContain("ARRAY['property_id', 'lease_id']");
    expect(verify).toContain("ARRAY['actor_user_id']");
    expect(verify).toContain("ARRAY['property_id', 'lease_id', 'created_at']");
  });
  it("appends 0064 after 0063", () => {
    const previous = journal.entries.find((entry) => entry.tag === "0063_saraya_auth");
    const lease = journal.entries.find((entry) => entry.tag === "0064_saraya_leases");
    expect(lease).toEqual(expect.objectContaining({ idx: 57, tag: "0064_saraya_leases" }));
    expect(lease!.idx).toBe(previous!.idx + 1);
  });
});

describe("lease checkout migration", () => {
  it("persists immutable package and signature evidence constraints", () => {
    const sql = readFileSync("drizzle/0127_saraya_lease_checkout_signing.sql", "utf8");
    expect(sql).toContain('CREATE TABLE "saraya_lease_packages"');
    expect(sql).toContain('UNIQUE("rental_request_id")');
    expect(sql).toContain('"accepted_checksum"');
    expect(sql).toContain('"evidence_digest"');
    expect(sql).toContain("authorized_admin");
    expect(sql).toContain("saraya_lease_package_snapshot_immutable");
    expect(sql).toContain('"final_document_checksum"');
    expect(sql).toContain("saraya final lease document is immutable");
    expect(sql).toContain("saraya_tenant_orgs_property_registration_uidx");
    expect(sql).toContain("saraya_contacts_property_verified_tenant_user_uidx");
  });
});
