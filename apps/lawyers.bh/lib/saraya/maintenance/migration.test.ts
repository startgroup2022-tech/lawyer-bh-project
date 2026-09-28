import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "drizzle/0117_saraya_maintenance_tickets.sql";
const migration = existsSync(migrationPath)
  ? readFileSync(migrationPath, "utf8")
  : "";
const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");
const journal = JSON.parse(
  readFileSync("drizzle/meta/_journal.json", "utf8"),
) as { entries: Array<{ idx: number; tag: string }> };

describe("0116 Saraya maintenance tickets migration", () => {
  it("creates property-scoped maintenance tickets with operational fields", () => {
    expect(migration).toContain('CREATE TABLE "saraya_maintenance_tickets"');
    expect(migration).toContain('"ticket_number" varchar(32) NOT NULL');
    expect(migration).toContain('"priority" varchar(16)');
    expect(migration).toContain('"status" varchar(24)');
    expect(migration).toContain('"expense_amount" numeric(14,3)');
    expect(schema).toContain('"saraya_maintenance_tickets"');
  });

  it("keeps unit and tenant references inside the same property", () => {
    expect(migration).toContain(
      'CONSTRAINT "saraya_maintenance_tickets_property_unit_fk"',
    );
    expect(migration).toContain(
      'CONSTRAINT "saraya_maintenance_tickets_property_tenant_fk"',
    );
  });

  it("appends after the meeting-room inventory migration", () => {
    const previous = journal.entries.find(
      (entry) => entry.tag === "0116_saraya_meeting_room_inventory",
    );
    const current = journal.entries.find(
      (entry) => entry.tag === "0117_saraya_maintenance_tickets",
    );
    expect(current).toEqual(
      expect.objectContaining({ tag: "0117_saraya_maintenance_tickets" }),
    );
    expect(current!.idx).toBe(previous!.idx + 1);
  });
});
