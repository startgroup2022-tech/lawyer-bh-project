import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0075_saraya_rental_finance.sql", "utf8");
const verify = readFileSync("drizzle/verify_0075_saraya_rental_finance.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; tag: string }>;
};

describe("0075 Saraya rental finance migration contract", () => {
  it.each([
    "saraya_rental_requests",
    "saraya_invoices",
    "saraya_invoice_items",
    "saraya_payment_demands",
    "saraya_ledger_entries",
  ])("creates and verifies %s", (table) => {
    expect(migration).toContain(`CREATE TABLE "${table}"`);
    expect(verify).toContain(table);
  });

  it("keeps requests, invoices and demands inside one property", () => {
    for (const constraint of [
      "saraya_rental_requests_property_unit_fk",
      "saraya_rental_requests_property_tenant_fk",
      "saraya_invoices_property_request_fk",
      "saraya_payment_demands_property_invoice_fk",
      "saraya_ledger_entries_property_invoice_fk",
    ]) {
      expect(migration).toContain(`CONSTRAINT "${constraint}"`);
      expect(verify).toContain(constraint);
    }
  });

  it("uses fixed precision BHD amounts and non-negative checks", () => {
    expect(migration).toContain('"currency" char(3) DEFAULT \'BHD\' NOT NULL');
    expect(migration).toContain('numeric(14,3)');
    expect(migration).toContain('CHECK ("amount" >= 0)');
    expect(migration).toContain('"total_amount" >= 0');
  });

  it("makes ledger movements and issued invoice items immutable", () => {
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "saraya_ledger_entries"');
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "saraya_invoice_items"');
    expect(verify).toContain("saraya_ledger_entries_immutable");
    expect(verify).toContain("saraya_invoice_items_immutable");
  });

  it("enforces retry-safe command identifiers", () => {
    expect(migration).toContain('UNIQUE("tenant_user_id", "idempotency_key")');
    expect(migration).toContain('UNIQUE("property_id", "rental_request_id")');
    expect(migration).toContain('UNIQUE("property_id", "invoice_id")');
  });

  it("appends after 0074 without rewriting prior journal entries", () => {
    const previous = journal.entries.find((entry) => entry.tag === "0074_consultation_types_admin");
    const current = journal.entries.find((entry) => entry.tag === "0075_saraya_rental_finance");
    expect(current).toEqual(expect.objectContaining({ tag: "0075_saraya_rental_finance" }));
    expect(current!.idx).toBe(previous!.idx + 1);
  });
});
