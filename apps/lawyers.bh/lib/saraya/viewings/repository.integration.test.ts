import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/saraya-schema";
import type { ViewingRepository } from "./service";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db/client", () => ({ db: state.db }));

const configuredUrl = process.env.DATABASE_URL;
const localUrl = (() => {
  if (!configuredUrl) return null;
  const parsed = new URL(configuredUrl);
  return ["127.0.0.1", "localhost"].includes(parsed.hostname) ? configuredUrl : null;
})();

const propertyId = "11111111-1111-4111-8111-111111111111";
const unitId = "22222222-2222-4222-8222-222222222222";
const otherUnitId = "33333333-3333-4333-8333-333333333333";
const managerUserId = "44444444-4444-4444-8444-444444444444";
const context = { source: "management" as const, ip: "203.0.113.10" };
const publicContext = { source: "public" as const, ip: "198.51.100.10" };

describe.skipIf(!localUrl)("Saraya viewing repository against isolated PostgreSQL", () => {
  let admin: ReturnType<typeof postgres>;
  let sql: ReturnType<typeof postgres>;
  let repository: ViewingRepository;
  const schemaName = `saraya_viewing_${randomUUID().replaceAll("-", "")}`;

  beforeAll(async () => {
    admin = postgres(localUrl!, { max: 1, onnotice: () => {} });
    await admin`CREATE SCHEMA ${admin(schemaName)}`;
    sql = postgres(localUrl!, {
      max: 8,
      connection: { search_path: schemaName },
      onnotice: () => {},
    });
    await sql.unsafe(`
      CREATE TYPE saraya_unit_status AS ENUM ('vacant', 'occupied', 'reserved', 'maintenance', 'inactive');
      CREATE TABLE saraya_properties (
        id uuid PRIMARY KEY,
        is_active boolean NOT NULL DEFAULT true
      );
      CREATE TABLE saraya_users (
        id uuid PRIMARY KEY
      );
      CREATE TABLE saraya_units (
        id uuid PRIMARY KEY,
        property_id uuid NOT NULL REFERENCES saraya_properties(id),
        is_public_listing boolean NOT NULL DEFAULT true,
        is_rentable boolean NOT NULL DEFAULT true,
        status saraya_unit_status NOT NULL DEFAULT 'vacant',
        CONSTRAINT saraya_units_property_id_key UNIQUE(property_id, id)
      );
      CREATE TABLE saraya_viewing_slots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id uuid NOT NULL REFERENCES saraya_properties(id),
        unit_id uuid,
        unit_scope_id uuid GENERATED ALWAYS AS (COALESCE(unit_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
        start_at timestamptz NOT NULL,
        end_at timestamptz NOT NULL,
        capacity integer NOT NULL DEFAULT 1,
        booked_count integer NOT NULL DEFAULT 0,
        status varchar(24) NOT NULL DEFAULT 'active',
        instructions_ar text,
        instructions_en text,
        created_by_user_id uuid NOT NULL REFERENCES saraya_users(id),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT saraya_viewing_slots_property_id_key UNIQUE(property_id, id),
        CONSTRAINT saraya_viewing_slots_property_id_scope_key UNIQUE(property_id, id, unit_scope_id),
        CONSTRAINT saraya_viewing_slots_capacity_check CHECK (capacity > 0 AND booked_count >= 0 AND booked_count <= capacity),
        CONSTRAINT saraya_viewing_slots_property_unit_fk FOREIGN KEY(property_id, unit_id) REFERENCES saraya_units(property_id, id)
      );
      CREATE TABLE saraya_viewing_appointments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id uuid NOT NULL REFERENCES saraya_properties(id),
        unit_id uuid NOT NULL,
        slot_id uuid NOT NULL,
        slot_unit_scope_id uuid NOT NULL,
        user_id uuid,
        reference varchar(32) NOT NULL,
        visitor_name text NOT NULL,
        visitor_phone text NOT NULL,
        visitor_email text NOT NULL,
        locale varchar(8) NOT NULL,
        status varchar(24) NOT NULL DEFAULT 'confirmed',
        idempotency_key varchar(128) NOT NULL,
        internal_notes text,
        cancelled_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT saraya_viewing_appointments_property_id_key UNIQUE(property_id, id),
        CONSTRAINT saraya_viewing_appointments_property_reference_key UNIQUE(property_id, reference),
        CONSTRAINT saraya_viewing_appointments_property_slot_unit_fk FOREIGN KEY(property_id, slot_id, slot_unit_scope_id) REFERENCES saraya_viewing_slots(property_id, id, unit_scope_id),
        CONSTRAINT saraya_viewing_appointments_property_unit_fk FOREIGN KEY(property_id, unit_id) REFERENCES saraya_units(property_id, id)
      );
      CREATE UNIQUE INDEX saraya_viewing_appointments_idempotency_uidx
        ON saraya_viewing_appointments(idempotency_key);
      CREATE TABLE saraya_viewing_commands (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id uuid NOT NULL REFERENCES saraya_properties(id),
        actor_user_id uuid NOT NULL REFERENCES saraya_users(id),
        idempotency_key varchar(128) NOT NULL,
        action varchar(64) NOT NULL,
        entity_type varchar(32) NOT NULL,
        entity_id uuid NOT NULL,
        normalized_input_hash char(64) NOT NULL,
        normalized_input jsonb NOT NULL,
        result jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT saraya_viewing_commands_result_check CHECK (
          jsonb_typeof(result) = 'object'
          AND result ? 'entityId'
          AND result ? 'status'
          AND result - ARRAY['entityId', 'status'] = '{}'::jsonb
        )
      );
      CREATE UNIQUE INDEX saraya_viewing_commands_actor_key_uidx
        ON saraya_viewing_commands(actor_user_id, idempotency_key);
      CREATE TABLE saraya_audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id uuid NOT NULL REFERENCES saraya_properties(id),
        actor_user_id uuid,
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id uuid,
        before jsonb,
        after jsonb,
        ip_address text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await sql`INSERT INTO saraya_properties(id) VALUES (${propertyId})`;
    await sql`INSERT INTO saraya_users(id) VALUES (${managerUserId})`;
    await sql`INSERT INTO saraya_units(id, property_id) VALUES (${unitId}, ${propertyId}), (${otherUnitId}, ${propertyId})`;

    state.db = drizzle(sql, { schema });
    repository = (await import("./repository")).viewingRepository;
  });

  afterAll(async () => {
    await sql?.end();
    if (admin) {
      await admin`DROP SCHEMA IF EXISTS ${admin(schemaName)} CASCADE`;
      await admin.end();
    }
  });

  it("orders unit slots first and creates an administrative slot exactly once", async () => {
    const specific = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-02T10:00:00.000Z",
      endAt: "2030-10-02T10:30:00.000Z",
      capacity: 2,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "create-specific",
    }, context);
    const propertyWide = await repository.createSlot({
      propertyId,
      unitId: null,
      startAt: "2030-10-02T09:00:00.000Z",
      endAt: "2030-10-02T09:30:00.000Z",
      capacity: 1,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "create-property-wide",
    }, context);
    const replay = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-02T10:00:00.000Z",
      endAt: "2030-10-02T10:30:00.000Z",
      capacity: 2,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "create-specific",
    }, context);

    expect(replay.id).toBe(specific.id);
    const slots = await repository.listPublicSlots(propertyId, unitId, new Date("2030-10-01T00:00:00Z"));
    expect(slots.map((slot) => slot.id).slice(0, 2)).toEqual([specific.id, propertyWide.id]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_viewing_commands WHERE idempotency_key='create-specific'`).toEqual([{ count: 1 }]);
  });

  it("serializes capacity claims and returns an idempotent booking replay", async () => {
    const slot = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-03T09:00:00.000Z",
      endAt: "2030-10-03T09:30:00.000Z",
      capacity: 1,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "capacity-slot",
    }, context);
    const base = {
      propertyId,
      unitId,
      slotId: slot.id,
      visitorName: "Visitor",
      visitorPhone: "+97339000000",
      locale: "en" as const,
    };
    const results = await Promise.allSettled([
      repository.claimSlotAndCreateAppointment({
        ...base,
        visitorEmail: "one@example.com",
        idempotencyKey: "claim-one",
      }, publicContext),
      repository.claimSlotAndCreateAppointment({
        ...base,
        visitorEmail: "two@example.com",
        idempotencyKey: "claim-two",
      }, publicContext),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const [stored] = await sql`SELECT booked_count FROM saraya_viewing_slots WHERE id=${slot.id}`;
    expect(stored.booked_count).toBe(1);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_viewing_appointments WHERE slot_id=${slot.id}`).toEqual([{ count: 1 }]);

    const appointment = results.find((result) => result.status === "fulfilled")!;
    if (appointment.status !== "fulfilled") throw new Error("appointment missing");
    const replay = await repository.claimSlotAndCreateAppointment({
      ...base,
      visitorEmail: appointment.value.visitorEmail,
      idempotencyKey: appointment.value.idempotencyKey,
    }, publicContext);
    expect(replay.id).toBe(appointment.value.id);
  });

  it("replays historical slot and appointment commands without reapplying stale updates", async () => {
    const slot = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-04T09:00:00.000Z",
      endAt: "2030-10-04T09:30:00.000Z",
      capacity: 2,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "update-slot",
    }, context);
    const firstUpdate = await repository.updateSlot(
      propertyId,
      slot.id,
      { capacity: 1, idempotencyKey: "update-capacity" },
      managerUserId,
      context,
    );
    const retryUpdate = await repository.updateSlot(
      propertyId,
      slot.id,
      { capacity: 1, idempotencyKey: "update-capacity" },
      managerUserId,
      context,
    );
    expect(retryUpdate).toEqual(firstUpdate);
    const laterUpdate = await repository.updateSlot(
      propertyId,
      slot.id,
      { capacity: 2, idempotencyKey: "update-capacity-later" },
      managerUserId,
      context,
    );
    expect(laterUpdate?.capacity).toBe(2);
    const historicalReplay = await repository.updateSlot(
      propertyId,
      slot.id,
      { capacity: 1, idempotencyKey: "update-capacity" },
      managerUserId,
      context,
    );
    expect(historicalReplay).toEqual(laterUpdate);
    expect(await sql`SELECT capacity FROM saraya_viewing_slots WHERE id=${slot.id}`).toEqual([{ capacity: 2 }]);

    const appointment = await repository.claimSlotAndCreateAppointment({
      propertyId,
      unitId,
      slotId: slot.id,
      visitorName: "Cancel Visitor",
      visitorPhone: "+97339000001",
      visitorEmail: "cancel@example.com",
      locale: "en",
      idempotencyKey: "cancel-booking",
    }, publicContext);
    const cancelled = await repository.updateAppointmentStatus(
      propertyId,
      appointment.id,
      "cancelled",
      managerUserId,
      "cancel-command",
      context,
    );
    await sql`
      UPDATE saraya_viewing_appointments
      SET visitor_name='Reloaded Visitor', visitor_phone='+97339999998',
          visitor_email='reloaded@example.com', idempotency_key='reloaded-public-key',
          internal_notes='Reloaded authorized row'
      WHERE id=${appointment.id}
    `;
    const retryCancelled = await repository.updateAppointmentStatus(
      propertyId,
      appointment.id,
      "cancelled",
      managerUserId,
      "cancel-command",
      context,
    );
    expect(cancelled?.status).toBe("cancelled");
    expect(retryCancelled).toMatchObject({
      id: appointment.id,
      visitorName: "Reloaded Visitor",
      visitorPhone: "+97339999998",
      visitorEmail: "reloaded@example.com",
      idempotencyKey: "reloaded-public-key",
      internalNotes: "Reloaded authorized row",
      status: "cancelled",
    });
    expect(await sql`SELECT booked_count FROM saraya_viewing_slots WHERE id=${slot.id}`).toEqual([{ booked_count: 0 }]);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_audit_logs WHERE action='viewing_appointment.cancelled' AND entity_id=${appointment.id}`).toEqual([{ count: 1 }]);

    const commands = await sql`
      SELECT normalized_input, result
      FROM saraya_viewing_commands
      WHERE idempotency_key IN ('update-slot', 'update-capacity', 'update-capacity-later', 'cancel-command')
      ORDER BY idempotency_key
    `;
    for (const command of commands) {
      expect(Object.keys(command.result as Record<string, unknown>).sort()).toEqual([
        "entityId",
        "status",
      ]);
    }
    const storedCommands = JSON.stringify(commands);
    for (const secret of [
      "Cancel Visitor",
      "+97339000001",
      "cancel@example.com",
      "cancel-booking",
      "Reloaded Visitor",
      "+97339999998",
      "reloaded@example.com",
      "reloaded-public-key",
    ]) {
      expect(storedCommands).not.toContain(secret);
    }
  });

  it("rejects management key reuse for a different payload or action", async () => {
    const slot = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-04T11:00:00.000Z",
      endAt: "2030-10-04T11:30:00.000Z",
      capacity: 1,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "management-conflict",
    }, context);

    await expect(repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-04T12:00:00.000Z",
      endAt: "2030-10-04T12:30:00.000Z",
      capacity: 1,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "management-conflict",
    }, context)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(repository.updateSlot(
      propertyId,
      slot.id,
      { status: "disabled", idempotencyKey: "management-conflict" },
      managerUserId,
      context,
    )).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("treats equivalent normalized command JSON as the same payload regardless of key order", async () => {
    const slot = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-04T12:00:00.000Z",
      endAt: "2030-10-04T12:30:00.000Z",
      capacity: 1,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "canonical-slot",
    }, context);
    const first = await repository.updateSlot(
      propertyId,
      slot.id,
      { status: "disabled", instructionsEn: "Welcome", idempotencyKey: "canonical-update" },
      managerUserId,
      context,
    );
    const replay = await repository.updateSlot(
      propertyId,
      slot.id,
      { instructionsEn: "Welcome", status: "disabled", idempotencyKey: "canonical-update" },
      managerUserId,
      context,
    );

    expect(replay).toEqual(first);
    expect(await sql`SELECT count(*)::int AS count FROM saraya_viewing_commands WHERE idempotency_key='canonical-update'`).toEqual([{ count: 1 }]);
  });

  it("rejects public key reuse when any normalized payload field differs", async () => {
    const slot = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-04T13:00:00.000Z",
      endAt: "2030-10-04T13:30:00.000Z",
      capacity: 2,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "public-conflict-slot",
    }, context);
    const input = {
      propertyId,
      unitId,
      slotId: slot.id,
      visitorName: "Original Visitor",
      visitorPhone: "+97339000002",
      visitorEmail: "original@example.com",
      locale: "en" as const,
      idempotencyKey: "public-full-payload",
    };
    await repository.claimSlotAndCreateAppointment(input, publicContext);

    await expect(repository.claimSlotAndCreateAppointment({
      ...input,
      visitorName: "Different Visitor",
    }, publicContext)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect(await sql`SELECT count(*)::int AS count FROM saraya_viewing_appointments WHERE idempotency_key='public-full-payload'`).toEqual([{ count: 1 }]);
  });

  it("rejects capacity/time conflicts and stores only safe request context in audits", async () => {
    const slot = await repository.createSlot({
      propertyId,
      unitId,
      startAt: "2030-10-05T09:00:00.000Z",
      endAt: "2030-10-05T09:30:00.000Z",
      capacity: 2,
      instructionsAr: null,
      instructionsEn: null,
      createdByUserId: managerUserId,
      idempotencyKey: "conflict-slot",
    }, context);
    await sql`UPDATE saraya_viewing_slots SET booked_count=2 WHERE id=${slot.id}`;

    await expect(repository.updateSlot(
      propertyId,
      slot.id,
      { capacity: 1, idempotencyKey: "capacity-too-low" },
      managerUserId,
      context,
    )).rejects.toMatchObject({ code: "VIEWING_CAPACITY_BELOW_BOOKED" });
    await expect(repository.updateSlot(
      propertyId,
      slot.id,
      { startAt: "2030-10-05T10:00:00.000Z", idempotencyKey: "bad-time" },
      managerUserId,
      context,
    )).rejects.toMatchObject({ code: "VIEWING_SLOT_TIME_CONFLICT" });

    const audits = await sql`SELECT after, ip_address FROM saraya_audit_logs ORDER BY created_at`;
    expect(audits.some((row) => row.ip_address === context.ip && row.after.requestSource === "management")).toBe(true);
    expect(audits.some((row) => row.ip_address === publicContext.ip && row.after.requestSource === "public")).toBe(true);
    const serialized = JSON.stringify(audits);
    expect(serialized).not.toContain("@example.com");
    expect(serialized).not.toContain("idempotencyKey");
    expect(serialized).not.toContain("visitorPhone");
  });
}, 20_000);
