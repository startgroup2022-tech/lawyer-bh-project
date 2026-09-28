import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath = "drizzle/0116_saraya_meeting_room_inventory.sql";
const migration = existsSync(migrationPath)
  ? readFileSync(migrationPath, "utf8")
  : "";
const productionInventoryPath = "drizzle/0120_saraya_production_inventory.sql";
const productionInventory = existsSync(productionInventoryPath)
  ? readFileSync(productionInventoryPath, "utf8")
  : "";
const journal = JSON.parse(
  readFileSync("drizzle/meta/_journal.json", "utf8"),
) as {
  entries: Array<{ idx: number; tag: string }>;
};

describe("0116 Saraya meeting-room inventory migration", () => {
  it("seeds the two approved Saraya Square meeting rooms idempotently", () => {
    expect(migration).toContain("INSERT INTO \"saraya_meeting_rooms\"");
    expect(migration).toContain("'SARAYA-SQUARE'");
    expect(migration).toContain("'MR-01'");
    expect(migration).toContain("'MR-02'");
    expect(migration).toContain(
      'ON CONFLICT ("property_id", "code") DO NOTHING',
    );
  });

  it("appends after the virtual-address inventory migration", () => {
    const previous = journal.entries.find(
      (entry) => entry.tag === "0115_saraya_virtual_addresses",
    );
    const current = journal.entries.find(
      (entry) => entry.tag === "0116_saraya_meeting_room_inventory",
    );

    expect(current).toEqual(
      expect.objectContaining({ tag: "0116_saraya_meeting_room_inventory" }),
    );
    expect(current!.idx).toBe(previous!.idx + 1);
  });

  it("recovers the production inventory for the current Saraya property code", () => {
    expect(productionInventory).toContain("SARAYA-HQ");
    expect(productionInventory).toContain("generate_series(1, 50)");
    expect(productionInventory).toContain("'MR-01'");
    expect(productionInventory).toContain("'MR-02'");
    expect(productionInventory).toContain(
      'ON CONFLICT ("property_id", "slot_number") DO NOTHING',
    );
    expect(productionInventory).toContain(
      'ON CONFLICT ("property_id", "code") DO NOTHING',
    );

    const current = journal.entries.find(
      (entry) => entry.tag === "0120_saraya_production_inventory",
    );
    const previous = journal.entries.find(
      (entry) => entry.tag === "0119_saraya_multiple_invoices",
    );
    expect(current!.idx).toBe(previous!.idx + 1);
  });
});
