import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("multiple Saraya invoices migration", () => {
  it("drops the one-invoice-per-rental-request constraint and is journaled", async () => {
    const [sql, journal] = await Promise.all([
      readFile(new URL("../../../drizzle/0119_saraya_multiple_invoices.sql", import.meta.url), "utf8"),
      readFile(new URL("../../../drizzle/meta/_journal.json", import.meta.url), "utf8"),
    ]);
    expect(sql).toContain('DROP CONSTRAINT IF EXISTS "saraya_invoices_property_request_key"');
    expect(journal).toContain('"tag":"0119_saraya_multiple_invoices"');
  });
});
