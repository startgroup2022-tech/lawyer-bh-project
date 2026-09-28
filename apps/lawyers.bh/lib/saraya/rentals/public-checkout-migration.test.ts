import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readPendingFile(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const migration = readPendingFile("drizzle/0122_saraya_public_rental_checkout.sql");
const verify = readPendingFile("drizzle/verify_0122_saraya_public_rental_checkout.sql");
const schema = readFileSync("lib/db/saraya-schema.ts", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
  entries: Array<{ idx: number; tag: string; when: number }>;
};

function schemaTable(name: string, nextName: string): string {
  const start = schema.indexOf(`export const ${name} = pgTable`);
  const end = schema.indexOf(`export const ${nextName} =`, start + 1);
  return schema.slice(start, end);
}

describe("0121 Saraya public rental checkout", () => {
  it("stores property-scoped viewing slots and private appointments", () => {
    expect(migration).toContain('CREATE TABLE "saraya_viewing_slots"');
    expect(migration).toContain('CREATE TABLE "saraya_viewing_appointments"');
    expect(migration).toContain("saraya_viewing_slots_capacity_check");
    expect(migration).toContain("saraya_viewing_appointments_idempotency_uidx");
    expect(verify).toContain("saraya_viewing_appointments_property_slot_unit_fk");
    expect(schema).toContain("sarayaViewingAppointments");
  });

  it("persists permanent management command idempotency", () => {
    expect(migration).toContain('CREATE TABLE "saraya_viewing_commands"');
    for (const column of [
      "property_id",
      "actor_user_id",
      "idempotency_key",
      "action",
      "entity_type",
      "entity_id",
      "normalized_input_hash",
      "normalized_input",
      "result",
      "created_at",
      "updated_at",
    ]) {
      expect(migration).toContain(`"${column}"`);
    }
    expect(migration).toContain("saraya_viewing_commands_actor_key_uidx");
    expect(migration).toContain("saraya_viewing_commands_property_fk");
    expect(migration).toContain("saraya_viewing_commands_actor_fk");
    expect(migration).toContain("saraya_viewing_commands_action_check");
    expect(migration).toContain("saraya_viewing_commands_entity_type_check");
    expect(schema).toContain("sarayaViewingCommands");
    expect(verify).toContain("Incorrect saraya_viewing_commands_actor_key_uidx definition");
    expect(migration).not.toContain('"last_command_key"');
    expect(schema).not.toContain("lastCommandKey");
  });

  it("fully verifies the management command index and check definitions", () => {
    expect(verify).toContain(
      "Incorrect saraya_viewing_commands_property_entity_idx definition",
    );
    for (const constraint of [
      "idempotency_key_check",
      "action_check",
      "entity_type_check",
      "input_hash_check",
      "result_check",
    ]) {
      expect(verify).toContain(
        `Incorrect saraya_viewing_commands_${constraint} definition`,
      );
    }
    expect(verify).toMatch(
      /tablename = 'saraya_viewing_commands'[\s\S]*indexname = 'saraya_viewing_commands_property_entity_idx'[\s\S]*\(property_id, entity_type, entity_id\)/,
    );
    expect(verify).toMatch(
      /constraint_schema\.nspname = 'public'[\s\S]*constraint_table\.relname = 'saraya_viewing_commands'[\s\S]*saraya_viewing_commands_action_check[\s\S]*viewing_slot\.create[\s\S]*viewing_appointment\.status/,
    );
  });

  it("uses one public appointment idempotency key across the full payload", () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "saraya_viewing_appointments_idempotency_uidx"',
    );
    expect(migration).toContain(
      'ON "saraya_viewing_appointments" ("idempotency_key")',
    );
    expect(verify).toContain(
      "Incorrect saraya_viewing_appointments_idempotency_uidx definition",
    );
  });

  it("binds unit appointments to the selected slot while allowing property-wide slots", () => {
    expect(migration).toContain('"unit_scope_id" uuid GENERATED ALWAYS AS');
    expect(migration).toContain('"slot_unit_scope_id" uuid NOT NULL');
    expect(migration).toContain("saraya_viewing_slots_property_id_scope_key");
    expect(migration).toContain(
      'CONSTRAINT "saraya_viewing_appointments_property_slot_unit_fk" FOREIGN KEY ("property_id", "slot_id", "slot_unit_scope_id")',
    );
    expect(migration).toContain("saraya_viewing_appointments_slot_unit_scope_check");
    expect(verify).toContain("saraya_viewing_appointments_property_slot_unit_fk");
    expect(schema).toContain("slotUnitScopeId");
  });

  it("reserves the zero UUID before using it as the property-wide slot sentinel", () => {
    const preflightPosition = migration.indexOf(
      "Cannot reserve the zero UUID for property-wide Saraya viewing slots",
    );
    const unitConstraintPosition = migration.indexOf(
      "saraya_units_reserved_zero_id_check",
    );

    expect(preflightPosition).toBeGreaterThan(-1);
    expect(migration).toContain(
      'WHERE "id" = \'00000000-0000-0000-0000-000000000000\'::uuid',
    );
    expect(preflightPosition).toBeLessThan(unitConstraintPosition);
    expect(schema).toContain("saraya_units_reserved_zero_id_check");
    expect(verify).toContain("saraya_units_reserved_zero_id_check");
    expect(verify).toContain(
      "Incorrect saraya_units_reserved_zero_id_check definition",
    );
  });

  it("stores inherited approval policy and immutable request snapshots", () => {
    expect(migration).toContain("rental_approval_mode");
    expect(migration).toContain("rental_approval_override");
    expect(migration).toContain("resolved_approval_mode");
    expect(migration).toContain("saraya_rental_requests_active_unit_uidx");
  });

  it("stops with an explicit preflight error when historical active requests conflict", () => {
    const preflightPosition = migration.indexOf(
      "Cannot enforce one active Saraya rental request per unit",
    );
    const indexPosition = migration.indexOf(
      'CREATE UNIQUE INDEX "saraya_rental_requests_active_unit_uidx"',
    );

    expect(preflightPosition).toBeGreaterThan(-1);
    expect(migration).toContain("HAVING COUNT(*) > 1");
    expect(preflightPosition).toBeLessThan(indexPosition);
  });

  it("stores payment verification and two-party signatures", () => {
    expect(migration).toContain("payment_method");
    expect(migration).toContain("provider_reference");
    expect(migration).toContain("receipt_document_id");
    expect(migration).toContain('CREATE TABLE "saraya_lease_signature_requests"');
    expect(verify).toContain("saraya_lease_signature_requests");
    expect(schema).toContain("sarayaLeaseSignatureRequests");
  });

  it("verifies critical constraint and index definitions rather than names alone", () => {
    expect(verify).toContain("pg_get_constraintdef");
    expect(verify).toContain("pg_get_indexdef");
    expect(verify).toContain("slot_unit_scope_id");
    expect(verify).toContain("WHERE status = ANY");
    expect(verify).toContain("idempotency_key");
  });

  it("verifies every remaining checkout index definition", () => {
    for (const indexName of [
      "saraya_viewing_slots_active_start_idx",
      "saraya_rental_requests_property_lease_uidx",
      "saraya_payment_demands_provider_reference_uidx",
      "saraya_lease_signature_requests_property_lease_status_idx",
    ]) {
      expect(verify).toContain(`Incorrect ${indexName} definition`);
    }

    expect(verify).toContain("property_id, unit_id, status, start_at");
    expect(verify).toContain("property_id, lease_id%WHERE lease_id IS NOT NULL");
    expect(verify).toContain("provider, provider_reference%WHERE provider_reference IS NOT NULL");
    expect(verify).toContain("property_id, lease_id, status");
  });

  it("uses explicit matching names for every Task 1 foreign key", () => {
    const foreignKeys = [
      "saraya_viewing_slots_property_fk",
      "saraya_viewing_slots_property_unit_fk",
      "saraya_viewing_slots_created_by_fk",
      "saraya_viewing_appointments_property_fk",
      "saraya_viewing_appointments_property_slot_unit_fk",
      "saraya_viewing_appointments_property_unit_fk",
      "saraya_viewing_appointments_user_fk",
      "saraya_rental_requests_property_lease_fk",
      "saraya_payment_demands_property_receipt_fk",
      "saraya_payment_demands_verified_by_fk",
      "saraya_lease_signature_requests_property_lease_fk",
      "saraya_lease_signature_requests_signer_user_fk",
    ];

    for (const foreignKeyName of foreignKeys) {
      expect(migration).toContain(foreignKeyName);
      expect(schema).toContain(`name: "${foreignKeyName}"`);
    }

    for (const table of [
      schemaTable("sarayaViewingSlots", "sarayaViewingAppointments"),
      schemaTable("sarayaViewingAppointments", "sarayaAuditLogs"),
      schemaTable("sarayaPaymentDemands", "sarayaLedgerEntries"),
      schemaTable("sarayaLeaseSignatureRequests", "sarayaMeetingRoomStatus"),
    ]) {
      expect(table).not.toContain(".references(");
    }
  });

  it("scopes constraint verification to the public schema and owning table", () => {
    expect(verify).toContain("constraint_table.oid = constraint_row.conrelid");
    expect(verify).toContain("constraint_schema.oid = constraint_table.relnamespace");
    expect(verify).toContain("constraint_schema.nspname = 'public'");
    expect(verify).toContain("constraint_table.relname = expected.table_name");
  });

  it("verifies unit_scope_id is a stored generated COALESCE expression", () => {
    expect(verify).toContain("information_schema.columns");
    expect(verify).toContain("is_generated = 'ALWAYS'");
    expect(verify).toContain("pg_attrdef");
    expect(verify).toContain("pg_get_expr");
    expect(verify).toContain("COALESCE(unit_id");
    expect(verify).toContain("00000000-0000-0000-0000-000000000000");
  });

  it("uses a short transaction-local lock timeout before locking DDL", () => {
    const timeoutPosition = migration.indexOf("SET LOCAL lock_timeout = '5s'");
    const firstAlterPosition = migration.indexOf("ALTER TABLE");
    const firstIndexPosition = migration.indexOf("CREATE INDEX");

    expect(timeoutPosition).toBeGreaterThan(-1);
    expect(timeoutPosition).toBeLessThan(firstAlterPosition);
    expect(timeoutPosition).toBeLessThan(firstIndexPosition);
  });

  it("keeps descending created-at indexes aligned between SQL and Drizzle", () => {
    expect(migration).toContain(
      '("property_id", "status", "created_at" DESC)',
    );
    expect(migration).toContain(
      '("signer_user_id", "status", "created_at" DESC)',
    );
    expect(schema).toMatch(
      /saraya_viewing_appointments_property_status_created_idx[\s\S]*table\.createdAt\.desc\(\)/,
    );
    expect(schema).toMatch(
      /saraya_lease_signature_requests_signer_status_idx[\s\S]*table\.createdAt\.desc\(\)/,
    );
  });

  it("registers migration 0121 after 0120", () => {
    const previous = journal.entries.find((entry) => entry.tag === "0120_saraya_production_inventory");
    const current = journal.entries.find((entry) => entry.tag === "0122_saraya_public_rental_checkout");

    expect(current).toEqual(expect.objectContaining({ idx: 113 }));
    expect(current!.when).toBeGreaterThan(previous!.when);
  });
});
