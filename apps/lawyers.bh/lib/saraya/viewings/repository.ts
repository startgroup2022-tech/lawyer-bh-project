import { createHash, randomUUID } from "node:crypto";
import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sarayaAuditLogs,
  sarayaProperties,
  sarayaUnits,
  sarayaViewingAppointments,
  sarayaViewingCommands,
  sarayaViewingSlots,
} from "@/lib/db/saraya-schema";
import type {
  ViewingAppointment,
  ViewingAppointmentStatus,
  ViewingAuditContext,
  ViewingSlot,
} from "./contracts";
import {
  IdempotencyConflictError,
  SlotCapacityConflictError,
  SlotFullError,
  SlotTimeConflictError,
  SlotUnavailableError,
  type ViewingRepository,
} from "./service";

const propertyWideScopeId = "00000000-0000-0000-0000-000000000000";

type ViewingCommandAction =
  | "viewing_slot.create"
  | "viewing_slot.update"
  | "viewing_appointment.status";
type ViewingCommandEntity = "viewing_slot" | "viewing_appointment";
type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface CommandSpec {
  propertyId: string;
  actorUserId: string;
  idempotencyKey: string;
  action: ViewingCommandAction;
  entityType: ViewingCommandEntity;
  normalizedInput: Record<string, unknown>;
  normalizedInputHash: string;
}

interface StoredCommand {
  propertyId: string;
  action: string;
  entityType: string;
  normalizedInputHash: string;
  result: unknown;
}

interface CommandResult {
  entityId: string;
  status: string;
}

function auditMetadata(context: ViewingAuditContext) {
  return { requestSource: context.source };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function commandSpec(input: Omit<CommandSpec, "normalizedInputHash">): CommandSpec {
  const normalizedInput = canonicalize(input.normalizedInput) as Record<string, unknown>;
  const normalizedInputHash = createHash("sha256")
    .update(JSON.stringify(normalizedInput))
    .digest("hex");
  return { ...input, normalizedInput, normalizedInputHash };
}

async function lockCommand(transaction: DatabaseTransaction, actorUserId: string, key: string) {
  await transaction.execute(sql`
    SELECT pg_advisory_xact_lock(hashtextextended(${`${actorUserId}:${key}`}, 0))
  `);
}

async function findCommand(
  transaction: DatabaseTransaction,
  actorUserId: string,
  idempotencyKey: string,
): Promise<StoredCommand | null> {
  const rows = await transaction.execute(sql`
    SELECT command.property_id AS "propertyId", command.action,
           command.entity_type AS "entityType",
           command.normalized_input_hash AS "normalizedInputHash",
           command.result
    FROM saraya_viewing_commands command
    WHERE command.actor_user_id = ${actorUserId}
      AND command.idempotency_key = ${idempotencyKey}
    LIMIT 1
  `);
  return ((rows as unknown as StoredCommand[])[0]) ?? null;
}

function replayCommand(stored: StoredCommand | null, spec: CommandSpec): CommandResult | null {
  if (!stored) return null;
  if (
    stored.propertyId !== spec.propertyId
    || stored.action !== spec.action
    || stored.entityType !== spec.entityType
    || stored.normalizedInputHash !== spec.normalizedInputHash
  ) {
    throw new IdempotencyConflictError();
  }
  if (
    !stored.result
    || typeof stored.result !== "object"
    || !("entityId" in stored.result)
    || !("status" in stored.result)
    || typeof stored.result.entityId !== "string"
    || typeof stored.result.status !== "string"
  ) {
    throw new Error("Invalid stored Saraya viewing command result");
  }
  return {
    entityId: stored.result.entityId,
    status: stored.result.status,
  };
}

async function saveCommand(
  transaction: DatabaseTransaction,
  spec: CommandSpec,
  entityId: string,
  result: ViewingSlot | ViewingAppointment,
) {
  await transaction.insert(sarayaViewingCommands).values({
    propertyId: spec.propertyId,
    actorUserId: spec.actorUserId,
    idempotencyKey: spec.idempotencyKey,
    action: spec.action,
    entityType: spec.entityType,
    entityId,
    normalizedInputHash: spec.normalizedInputHash,
    normalizedInput: spec.normalizedInput,
    result: { entityId: result.id, status: result.status },
  });
}

function slotDto(row: typeof sarayaViewingSlots.$inferSelect): ViewingSlot {
  return {
    id: row.id,
    propertyId: row.propertyId,
    unitId: row.unitId,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    capacity: row.capacity,
    bookedCount: row.bookedCount,
    status: row.status as ViewingSlot["status"],
    instructionsAr: row.instructionsAr,
    instructionsEn: row.instructionsEn,
    createdByUserId: row.createdByUserId,
  };
}

function slotRecordDto(row: Record<string, unknown>): ViewingSlot {
  return {
    id: String(row.id),
    propertyId: String(row.propertyId),
    unitId: row.unitId == null ? null : String(row.unitId),
    startAt: new Date(row.startAt as string | Date).toISOString(),
    endAt: new Date(row.endAt as string | Date).toISOString(),
    capacity: Number(row.capacity),
    bookedCount: Number(row.bookedCount),
    status: row.status as ViewingSlot["status"],
    instructionsAr: row.instructionsAr == null ? null : String(row.instructionsAr),
    instructionsEn: row.instructionsEn == null ? null : String(row.instructionsEn),
    createdByUserId: String(row.createdByUserId),
  };
}

function appointmentDto(row: Record<string, unknown>): ViewingAppointment {
  return {
    id: String(row.id),
    propertyId: String(row.propertyId),
    unitId: String(row.unitId),
    slotId: String(row.slotId),
    reference: String(row.reference),
    visitorName: String(row.visitorName),
    visitorPhone: String(row.visitorPhone),
    visitorEmail: String(row.visitorEmail),
    locale: row.locale as "ar" | "en",
    status: row.status as ViewingAppointmentStatus,
    idempotencyKey: String(row.idempotencyKey),
    internalNotes: row.internalNotes == null ? null : String(row.internalNotes),
    startAt: new Date(row.startAt as string | Date).toISOString(),
    endAt: new Date(row.endAt as string | Date).toISOString(),
  };
}

async function loadSlot(
  transaction: DatabaseTransaction,
  propertyId: string,
  slotId: string,
) {
  const [row] = await transaction
    .select()
    .from(sarayaViewingSlots)
    .where(and(eq(sarayaViewingSlots.propertyId, propertyId), eq(sarayaViewingSlots.id, slotId)))
    .limit(1);
  return row ? slotDto(row) : null;
}

async function loadAppointment(
  transaction: DatabaseTransaction,
  propertyId: string,
  appointmentId: string,
) {
  const rows = await transaction.execute(sql`
    SELECT appointment.id, appointment.property_id AS "propertyId",
           appointment.unit_id AS "unitId", appointment.slot_id AS "slotId",
           appointment.reference, appointment.visitor_name AS "visitorName",
           appointment.visitor_phone AS "visitorPhone",
           appointment.visitor_email::text AS "visitorEmail", appointment.locale,
           appointment.status, appointment.idempotency_key AS "idempotencyKey",
           appointment.internal_notes AS "internalNotes",
           slot.start_at AS "startAt", slot.end_at AS "endAt"
    FROM saraya_viewing_appointments appointment
    JOIN saraya_viewing_slots slot
      ON slot.property_id = appointment.property_id AND slot.id = appointment.slot_id
    WHERE appointment.property_id = ${propertyId} AND appointment.id = ${appointmentId}
    LIMIT 1
  `);
  const row = (rows as unknown as Record<string, unknown>[])[0];
  return row ? appointmentDto(row) : null;
}

function sameAppointmentPayload(
  appointment: ViewingAppointment,
  input: Parameters<ViewingRepository["claimSlotAndCreateAppointment"]>[0],
) {
  return appointment.propertyId === input.propertyId
    && appointment.unitId === input.unitId
    && appointment.slotId === input.slotId
    && appointment.visitorName === input.visitorName
    && appointment.visitorPhone === input.visitorPhone
    && appointment.visitorEmail === input.visitorEmail
    && appointment.locale === input.locale;
}

function uniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: string; cause?: { code?: string } };
  return value.code === "23505" || value.cause?.code === "23505";
}

async function findByIdempotency(idempotencyKey: string) {
  const rows = await db.execute(sql`
    SELECT appointment.id, appointment.property_id AS "propertyId",
           appointment.unit_id AS "unitId", appointment.slot_id AS "slotId",
           appointment.reference, appointment.visitor_name AS "visitorName",
           appointment.visitor_phone AS "visitorPhone",
           appointment.visitor_email::text AS "visitorEmail", appointment.locale,
           appointment.status, appointment.idempotency_key AS "idempotencyKey",
           appointment.internal_notes AS "internalNotes",
           slot.start_at AS "startAt", slot.end_at AS "endAt"
    FROM saraya_viewing_appointments appointment
    JOIN saraya_viewing_slots slot
      ON slot.property_id = appointment.property_id AND slot.id = appointment.slot_id
    WHERE appointment.idempotency_key = ${idempotencyKey}
    LIMIT 1
  `);
  const row = (rows as unknown as Record<string, unknown>[])[0];
  return row ? appointmentDto(row) : null;
}

export const viewingRepository: ViewingRepository = {
  async resolvePublicUnit(unitId) {
    const [row] = await db
      .select({ propertyId: sarayaUnits.propertyId, unitId: sarayaUnits.id })
      .from(sarayaUnits)
      .innerJoin(sarayaProperties, eq(sarayaProperties.id, sarayaUnits.propertyId))
      .where(
        and(
          eq(sarayaUnits.id, unitId),
          eq(sarayaUnits.isPublicListing, true),
          eq(sarayaUnits.isRentable, true),
          eq(sarayaUnits.status, "vacant"),
          eq(sarayaProperties.isActive, true),
        ),
      )
      .limit(1);
    return row ?? null;
  },

  async unitExists(propertyId, unitId) {
    const [row] = await db
      .select({ id: sarayaUnits.id })
      .from(sarayaUnits)
      .where(and(eq(sarayaUnits.propertyId, propertyId), eq(sarayaUnits.id, unitId)))
      .limit(1);
    return Boolean(row);
  },

  async listPublicSlots(propertyId, unitId, now) {
    const rows = await db
      .select()
      .from(sarayaViewingSlots)
      .where(
        and(
          eq(sarayaViewingSlots.propertyId, propertyId),
          or(eq(sarayaViewingSlots.unitId, unitId), sql`${sarayaViewingSlots.unitId} IS NULL`),
          eq(sarayaViewingSlots.status, "active"),
          gt(sarayaViewingSlots.startAt, now),
          sql`${sarayaViewingSlots.bookedCount} < ${sarayaViewingSlots.capacity}`,
        ),
      )
      .orderBy(
        sql`CASE WHEN ${sarayaViewingSlots.unitId} IS NULL THEN 1 ELSE 0 END`,
        asc(sarayaViewingSlots.startAt),
        asc(sarayaViewingSlots.id),
      );
    return rows.map(slotDto);
  },

  async listSlots(propertyId) {
    const rows = await db
      .select()
      .from(sarayaViewingSlots)
      .where(eq(sarayaViewingSlots.propertyId, propertyId))
      .orderBy(asc(sarayaViewingSlots.startAt), asc(sarayaViewingSlots.id));
    return rows.map(slotDto);
  },

  findAppointmentByIdempotency: findByIdempotency,

  async claimSlotAndCreateAppointment(input, context) {
    try {
      return await db.transaction(async (transaction) => {
        const replayRows = await transaction.execute(sql`
          SELECT appointment.id, appointment.property_id AS "propertyId",
                 appointment.unit_id AS "unitId", appointment.slot_id AS "slotId",
                 appointment.reference, appointment.visitor_name AS "visitorName",
                 appointment.visitor_phone AS "visitorPhone",
                 appointment.visitor_email::text AS "visitorEmail", appointment.locale,
                 appointment.status, appointment.idempotency_key AS "idempotencyKey",
                 appointment.internal_notes AS "internalNotes",
                 replay_slot.start_at AS "startAt", replay_slot.end_at AS "endAt"
          FROM saraya_viewing_appointments appointment
          JOIN saraya_viewing_slots replay_slot
            ON replay_slot.property_id = appointment.property_id
           AND replay_slot.id = appointment.slot_id
          WHERE appointment.idempotency_key = ${input.idempotencyKey}
          LIMIT 1
        `);
        const replayRow = (replayRows as unknown as Record<string, unknown>[])[0];
        if (replayRow) {
          const replay = appointmentDto(replayRow);
          if (!sameAppointmentPayload(replay, input)) throw new IdempotencyConflictError();
          return replay;
        }

        const slots = await transaction.execute(sql`
          SELECT slot.id, slot.property_id AS "propertyId", slot.unit_id AS "unitId",
                 slot.unit_scope_id AS "unitScopeId", slot.start_at AS "startAt",
                 slot.end_at AS "endAt", slot.capacity, slot.booked_count AS "bookedCount",
                 slot.status
          FROM saraya_viewing_slots slot
          JOIN saraya_units unit
            ON unit.property_id = slot.property_id AND unit.id = ${input.unitId}
          JOIN saraya_properties property ON property.id = unit.property_id
          WHERE slot.property_id = ${input.propertyId} AND slot.id = ${input.slotId}
            AND (slot.unit_id = ${input.unitId} OR slot.unit_id IS NULL)
            AND unit.is_public_listing = true AND unit.is_rentable = true
            AND unit.status = 'vacant' AND property.is_active = true
          FOR UPDATE OF slot
        `);
        const slot = (slots as unknown as Record<string, unknown>[])[0];
        if (!slot || slot.status !== "active" || new Date(slot.startAt as string | Date) <= new Date()) {
          throw new SlotUnavailableError();
        }
        if (Number(slot.bookedCount) >= Number(slot.capacity)) throw new SlotFullError();

        const reference = `SV-${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
        const [created] = await transaction
          .insert(sarayaViewingAppointments)
          .values({
            propertyId: input.propertyId,
            unitId: input.unitId,
            slotId: input.slotId,
            slotUnitScopeId: String(slot.unitScopeId ?? propertyWideScopeId),
            reference,
            visitorName: input.visitorName,
            visitorPhone: input.visitorPhone,
            visitorEmail: input.visitorEmail,
            locale: input.locale,
            idempotencyKey: input.idempotencyKey,
          })
          .returning();
        await transaction
          .update(sarayaViewingSlots)
          .set({
            bookedCount: sql`${sarayaViewingSlots.bookedCount} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(sarayaViewingSlots.propertyId, input.propertyId),
              eq(sarayaViewingSlots.id, input.slotId),
            ),
          );
        await transaction.insert(sarayaAuditLogs).values({
          propertyId: input.propertyId,
          actorUserId: null,
          action: "viewing_appointment.created",
          entityType: "viewing_appointment",
          entityId: created.id,
          after: {
            unitId: input.unitId,
            slotId: input.slotId,
            status: "confirmed",
            ...auditMetadata(context),
          },
          ipAddress: context.ip,
        });
        return appointmentDto({ ...created, startAt: slot.startAt, endAt: slot.endAt });
      });
    } catch (error) {
      if (uniqueViolation(error)) {
        const existing = await findByIdempotency(input.idempotencyKey);
        if (existing) {
          if (!sameAppointmentPayload(existing, input)) throw new IdempotencyConflictError();
          return existing;
        }
      }
      throw error;
    }
  },

  async createSlot(input, context) {
    const { idempotencyKey, ...slotInput } = input;
    const spec = commandSpec({
      propertyId: input.propertyId,
      actorUserId: input.createdByUserId,
      idempotencyKey,
      action: "viewing_slot.create",
      entityType: "viewing_slot",
      normalizedInput: {
        propertyId: input.propertyId,
        unitId: input.unitId ?? null,
        startAt: input.startAt,
        endAt: input.endAt,
        capacity: input.capacity,
        instructionsAr: input.instructionsAr ?? null,
        instructionsEn: input.instructionsEn ?? null,
      },
    });
    return db.transaction(async (transaction) => {
      await lockCommand(transaction, spec.actorUserId, spec.idempotencyKey);
      const replay = replayCommand(
        await findCommand(transaction, spec.actorUserId, spec.idempotencyKey),
        spec,
      );
      if (replay) {
        const current = await loadSlot(transaction, spec.propertyId, replay.entityId);
        if (!current) throw new Error("Stored Saraya viewing slot command target is missing");
        return current;
      }

      const [row] = await transaction
        .insert(sarayaViewingSlots)
        .values({
          ...slotInput,
          startAt: new Date(input.startAt),
          endAt: new Date(input.endAt),
        })
        .returning();
      const result = slotDto(row);
      await transaction.insert(sarayaAuditLogs).values({
        propertyId: input.propertyId,
        actorUserId: input.createdByUserId,
        action: "viewing_slot.created",
        entityType: "viewing_slot",
        entityId: row.id,
        after: {
          unitId: row.unitId,
          startAt: row.startAt.toISOString(),
          endAt: row.endAt.toISOString(),
          capacity: row.capacity,
          status: row.status,
          ...auditMetadata(context),
        },
        ipAddress: context.ip,
      });
      await saveCommand(transaction, spec, row.id, result);
      return result;
    });
  },

  async updateSlot(propertyId, slotId, input, actorUserId, context) {
    const { idempotencyKey, ...normalizedPatch } = input;
    const spec = commandSpec({
      propertyId,
      actorUserId,
      idempotencyKey,
      action: "viewing_slot.update",
      entityType: "viewing_slot",
      normalizedInput: { propertyId, slotId, ...normalizedPatch },
    });
    return db.transaction(async (transaction) => {
      await lockCommand(transaction, actorUserId, idempotencyKey);
      const replay = replayCommand(
        await findCommand(transaction, actorUserId, idempotencyKey),
        spec,
      );
      if (replay) return loadSlot(transaction, propertyId, replay.entityId);

      const rows = await transaction.execute(sql`
        SELECT slot.id, slot.property_id AS "propertyId", slot.unit_id AS "unitId",
               slot.start_at AS "startAt", slot.end_at AS "endAt",
               slot.capacity, slot.booked_count AS "bookedCount", slot.status,
               slot.instructions_ar AS "instructionsAr",
               slot.instructions_en AS "instructionsEn",
               slot.created_by_user_id AS "createdByUserId"
        FROM saraya_viewing_slots slot
        WHERE slot.property_id = ${propertyId} AND slot.id = ${slotId}
        FOR UPDATE OF slot
      `);
      const currentRecord = (rows as unknown as Record<string, unknown>[])[0];
      if (!currentRecord) return null;
      const current = slotRecordDto(currentRecord);
      const startAt = input.startAt ? new Date(input.startAt) : new Date(current.startAt);
      const endAt = input.endAt ? new Date(input.endAt) : new Date(current.endAt);
      if (endAt <= startAt) throw new SlotTimeConflictError();
      if (input.capacity !== undefined && input.capacity < current.bookedCount) {
        throw new SlotCapacityConflictError();
      }
      const [row] = await transaction
        .update(sarayaViewingSlots)
        .set({
          ...(input.startAt ? { startAt } : {}),
          ...(input.endAt ? { endAt } : {}),
          ...(input.capacity !== undefined ? { capacity: input.capacity } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.instructionsAr !== undefined ? { instructionsAr: input.instructionsAr } : {}),
          ...(input.instructionsEn !== undefined ? { instructionsEn: input.instructionsEn } : {}),
          updatedAt: new Date(),
        })
        .where(and(eq(sarayaViewingSlots.propertyId, propertyId), eq(sarayaViewingSlots.id, slotId)))
        .returning();
      const result = slotDto(row);
      await transaction.insert(sarayaAuditLogs).values({
        propertyId,
        actorUserId,
        action: "viewing_slot.updated",
        entityType: "viewing_slot",
        entityId: slotId,
        before: current,
        after: { ...result, ...auditMetadata(context) },
        ipAddress: context.ip,
      });
      await saveCommand(transaction, spec, slotId, result);
      return result;
    });
  },

  async listAppointments(propertyId) {
    const rows = await db.execute(sql`
      SELECT appointment.id, appointment.property_id AS "propertyId",
             appointment.unit_id AS "unitId", appointment.slot_id AS "slotId",
             appointment.reference, appointment.visitor_name AS "visitorName",
             appointment.visitor_phone AS "visitorPhone",
             appointment.visitor_email::text AS "visitorEmail", appointment.locale,
             appointment.status, appointment.idempotency_key AS "idempotencyKey",
             appointment.internal_notes AS "internalNotes",
             slot.start_at AS "startAt", slot.end_at AS "endAt"
      FROM saraya_viewing_appointments appointment
      JOIN saraya_viewing_slots slot
        ON slot.property_id = appointment.property_id AND slot.id = appointment.slot_id
      WHERE appointment.property_id = ${propertyId}
      ORDER BY slot.start_at, appointment.created_at
    `);
    return (rows as unknown as Record<string, unknown>[]).map(appointmentDto);
  },

  async updateAppointmentStatus(
    propertyId,
    appointmentId,
    status,
    actorUserId,
    idempotencyKey,
    context,
  ) {
    const spec = commandSpec({
      propertyId,
      actorUserId,
      idempotencyKey,
      action: "viewing_appointment.status",
      entityType: "viewing_appointment",
      normalizedInput: { propertyId, appointmentId, status },
    });
    return db.transaction(async (transaction) => {
      await lockCommand(transaction, actorUserId, idempotencyKey);
      const replay = replayCommand(
        await findCommand(transaction, actorUserId, idempotencyKey),
        spec,
      );
      if (replay) return loadAppointment(transaction, propertyId, replay.entityId);

      const rows = await transaction.execute(sql`
        SELECT appointment.id, appointment.property_id AS "propertyId",
               appointment.unit_id AS "unitId", appointment.slot_id AS "slotId",
               appointment.reference, appointment.visitor_name AS "visitorName",
               appointment.visitor_phone AS "visitorPhone",
               appointment.visitor_email::text AS "visitorEmail", appointment.locale,
               appointment.status, appointment.idempotency_key AS "idempotencyKey",
               appointment.internal_notes AS "internalNotes",
               slot.start_at AS "startAt", slot.end_at AS "endAt"
        FROM saraya_viewing_appointments appointment
        JOIN saraya_viewing_slots slot
          ON slot.property_id = appointment.property_id AND slot.id = appointment.slot_id
        WHERE appointment.property_id = ${propertyId} AND appointment.id = ${appointmentId}
        FOR UPDATE OF appointment, slot
      `);
      const current = (rows as unknown as Record<string, unknown>[])[0];
      if (!current || current.status !== "confirmed") return null;
      const [updated] = await transaction
        .update(sarayaViewingAppointments)
        .set({
          status,
          cancelledAt: status === "cancelled" ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sarayaViewingAppointments.propertyId, propertyId),
            eq(sarayaViewingAppointments.id, appointmentId),
            eq(sarayaViewingAppointments.status, "confirmed"),
          ),
        )
        .returning();
      if (!updated) return null;
      if (status === "cancelled") {
        await transaction
          .update(sarayaViewingSlots)
          .set({
            bookedCount: sql`${sarayaViewingSlots.bookedCount} - 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(sarayaViewingSlots.propertyId, propertyId),
              eq(sarayaViewingSlots.id, updated.slotId),
              gt(sarayaViewingSlots.bookedCount, 0),
            ),
          );
      }
      const result = appointmentDto({
        ...updated,
        startAt: current.startAt,
        endAt: current.endAt,
      });
      await transaction.insert(sarayaAuditLogs).values({
        propertyId,
        actorUserId,
        action: `viewing_appointment.${status}`,
        entityType: "viewing_appointment",
        entityId: appointmentId,
        before: { status: "confirmed" },
        after: { status, ...auditMetadata(context) },
        ipAddress: context.ip,
      });
      await saveCommand(transaction, spec, appointmentId, result);
      return result;
    });
  },
};
