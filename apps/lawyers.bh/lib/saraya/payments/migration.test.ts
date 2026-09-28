import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Saraya rental payment migration", () => {
  const migration = readFileSync("drizzle/0124_saraya_rental_payments.sql", "utf8");
  const hardening = readFileSync("drizzle/0125_saraya_payment_hardening.sql", "utf8");
  const offlineReference = readFileSync("drizzle/0126_saraya_offline_payment_reference.sql", "utf8");
  const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");
  const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ tag: string }> };

  it("adds durable commands, provider events, proof history, and payment states", () => {
    expect(migration).toContain("saraya_payment_commands");
    expect(migration).toContain("saraya_payment_provider_events");
    expect(migration).toContain("saraya_payment_proofs");
    expect(migration).toContain("verification_pending");
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'paid'");
  });

  it("keeps payment hardening migrations registered in order", () => {
    const tags = journal.entries.map((entry) => entry.tag);
    expect(tags.indexOf("0126_saraya_offline_payment_reference")).toBeGreaterThan(tags.indexOf("0125_saraya_payment_hardening"));
    expect(tags.indexOf("0127_saraya_lease_checkout_signing")).toBeGreaterThan(tags.indexOf("0126_saraya_offline_payment_reference"));
  });

  it("migrates offline provider identity to an internal proof id", () => {
    expect(offlineReference).toContain('"provider_reference"=selected_proof."id"::text');
    expect(offlineReference).toContain("saraya_payment_demands_offline_reference_check");
  });

  it("enforces one active Tap attempt and one demand per proof document", () => {
    expect(hardening).toContain("saraya_payment_commands_one_active_demand_uidx");
    expect(hardening).toContain("saraya_payment_proofs_document_key");
    expect(hardening).toContain("saraya_payment_operations");
  });

  it("deduplicates by current provider reference, ready state, and newest valid attempt", () => {
    expect(hardening).toContain('command."provider_reference" = demand."provider_reference"');
    expect(hardening).toContain("command.\"status\"='ready'");
    expect(hardening).toContain('command."created_at" DESC');
  });

  it("names every payment foreign key exactly as PostgreSQL created it", () => {
    for (const foreignKeyName of [
      "saraya_payment_commands_tenant_user_id_fkey",
      "saraya_payment_commands_payment_demand_id_fkey",
      "saraya_payment_provider_events_payment_demand_id_fkey",
      "saraya_payment_proofs_payment_demand_id_fkey",
      "saraya_payment_proofs_submitted_by_user_id_fkey",
      "saraya_payment_proofs_decided_by_user_id_fkey",
      "saraya_payment_operations_actor_user_id_fkey",
      "saraya_payment_operations_payment_demand_id_fkey",
    ]) {
      expect(schema).toContain(`name: "${foreignKeyName}"`);
    }

    const paymentTables = schema.slice(
      schema.indexOf("export const sarayaPaymentCommands"),
      schema.indexOf("export const sarayaLedgerEntries"),
    );
    expect(paymentTables).not.toContain(".references(");
    expect(paymentTables).toContain("saraya_payment_proofs_property_document_fk");
    expect(paymentTables).toContain("saraya_payment_proofs_property_request_fk");
  });
});
