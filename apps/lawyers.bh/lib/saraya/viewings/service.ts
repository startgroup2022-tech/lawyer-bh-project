import { ApiError, normalizeEmail, normalizePhone, type SarayaPrincipal } from "../auth/contracts";
import type {
  CreateViewingSlotInput,
  PublicAppointmentConfirmation,
  PublicAppointmentInput,
  PublicViewingSlot,
  UpdateViewingSlotInput,
  ViewingAuditContext,
  ViewingAppointment,
  ViewingAppointmentStatus,
  ViewingSlot,
} from "./contracts";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bahrainOrE164Pattern = /^(?:\+973\d{8}|\+[1-9]\d{7,14})$/;
const managementRoles = new Set(["super_admin", "property_manager"]);

export class SlotFullError extends Error {}
export class SlotUnavailableError extends Error {}
export class IdempotencyConflictError extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT";
}
export class SlotCapacityConflictError extends Error {
  readonly code = "VIEWING_CAPACITY_BELOW_BOOKED";
}
export class SlotTimeConflictError extends Error {
  readonly code = "VIEWING_SLOT_TIME_CONFLICT";
}

export interface ViewingRepository {
  resolvePublicUnit(unitId: string): Promise<{ propertyId: string; unitId: string } | null>;
  unitExists(propertyId: string, unitId: string): Promise<boolean>;
  listPublicSlots(propertyId: string, unitId: string, now: Date): Promise<ViewingSlot[]>;
  listSlots(propertyId: string): Promise<ViewingSlot[]>;
  findAppointmentByIdempotency(idempotencyKey: string): Promise<ViewingAppointment | null>;
  claimSlotAndCreateAppointment(
    input: PublicAppointmentInput,
    context: ViewingAuditContext,
  ): Promise<ViewingAppointment>;
  createSlot(
    input: Omit<CreateViewingSlotInput, "idempotencyKey"> & {
      propertyId: string;
      createdByUserId: string;
      idempotencyKey: string;
    },
    context: ViewingAuditContext,
  ): Promise<ViewingSlot>;
  updateSlot(
    propertyId: string,
    slotId: string,
    input: UpdateViewingSlotInput,
    actorUserId: string,
    context: ViewingAuditContext,
  ): Promise<ViewingSlot | null>;
  listAppointments(propertyId: string): Promise<ViewingAppointment[]>;
  updateAppointmentStatus(
    propertyId: string,
    appointmentId: string,
    status: Exclude<ViewingAppointmentStatus, "confirmed">,
    actorUserId: string,
    commandKey: string,
    context: ViewingAuditContext,
  ): Promise<ViewingAppointment | null>;
}

function invalid(field: string): never {
  throw new ApiError(
    422,
    "INVALID_VIEWING_APPOINTMENT",
    "بيانات موعد الزيارة غير صحيحة",
    "Invalid viewing appointment",
    { [field]: ["invalid"] },
  );
}

function validUuid(value: string, field: string) {
  if (!uuidPattern.test(value)) invalid(field);
  return value;
}

function normalizedIdempotencyKey(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized.length > 128) invalid("idempotencyKey");
  return normalized;
}

function samePublicBookingPayload(
  appointment: ViewingAppointment,
  input: PublicAppointmentInput,
) {
  return appointment.propertyId === input.propertyId
    && appointment.unitId === input.unitId
    && appointment.slotId === input.slotId
    && appointment.visitorName === input.visitorName
    && appointment.visitorPhone === input.visitorPhone
    && appointment.visitorEmail === input.visitorEmail
    && appointment.locale === input.locale;
}

function idempotencyConflict(): never {
  throw new ApiError(
    409,
    "IDEMPOTENCY_CONFLICT",
    "مفتاح تكرار الطلب مستخدم لعملية مختلفة",
    "Idempotency key was already used for a different operation",
  );
}

function parseFutureTimestamp(value: string, field: string, now: Date) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed <= now) invalid(field);
  return parsed;
}

function requireManagement(principal: SarayaPrincipal, propertyId: string) {
  const membership = principal.memberships.find((item) => item.propertyId === propertyId);
  if (!membership) {
    throw new ApiError(
      403,
      "PROPERTY_ACCESS_DENIED",
      "لا تملك صلاحية لهذا العقار",
      "Property access denied",
    );
  }
  if (!managementRoles.has(membership.role)) {
    throw new ApiError(
      403,
      "VIEWING_MANAGEMENT_DENIED",
      "ليست لديك صلاحية إدارة مواعيد الزيارة",
      "Viewing management denied",
    );
  }
}

function normalizePublicInput(input: PublicAppointmentInput): PublicAppointmentInput {
  validUuid(input.propertyId, "propertyId");
  validUuid(input.unitId, "unitId");
  validUuid(input.slotId, "slotId");
  const visitorName = input.visitorName.trim();
  const visitorPhone = normalizePhone(input.visitorPhone);
  const visitorEmail = normalizeEmail(input.visitorEmail);
  const idempotencyKey = normalizedIdempotencyKey(input.idempotencyKey);
  if (!visitorName || visitorName.length > 200) invalid("visitorName");
  if (!bahrainOrE164Pattern.test(visitorPhone)) invalid("visitorPhone");
  if (!emailPattern.test(visitorEmail) || visitorEmail.length > 254) invalid("visitorEmail");
  if (!idempotencyKey || idempotencyKey.length > 128) invalid("idempotencyKey");
  if (input.locale !== "ar" && input.locale !== "en") invalid("locale");
  return {
    ...input,
    visitorName,
    visitorPhone,
    visitorEmail,
    idempotencyKey,
  };
}

function confirmation(appointment: ViewingAppointment): PublicAppointmentConfirmation {
  return {
    reference: appointment.reference,
    status: "confirmed",
    startAt: appointment.startAt,
    endAt: appointment.endAt,
  };
}

function normalizedSlotInput(input: CreateViewingSlotInput, now: Date) {
  const startAt = parseFutureTimestamp(input.startAt, "startAt", now);
  const endAt = parseFutureTimestamp(input.endAt, "endAt", now);
  if (endAt <= startAt) invalid("endAt");
  if (!Number.isInteger(input.capacity) || input.capacity < 1) invalid("capacity");
  if (input.unitId != null) validUuid(input.unitId, "unitId");
  return {
    unitId: input.unitId ?? null,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    capacity: input.capacity,
    instructionsAr: input.instructionsAr?.trim() || null,
    instructionsEn: input.instructionsEn?.trim() || null,
    idempotencyKey: normalizedIdempotencyKey(input.idempotencyKey),
  };
}

function mapRepositoryError(error: unknown): never {
  const code = error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "";
  if (error instanceof IdempotencyConflictError || code === "IDEMPOTENCY_CONFLICT") {
    idempotencyConflict();
  }
  if (error instanceof SlotCapacityConflictError || code === "VIEWING_CAPACITY_BELOW_BOOKED") {
    throw new ApiError(
      409,
      "VIEWING_CAPACITY_BELOW_BOOKED",
      "لا يمكن خفض السعة عن عدد الحجوزات المؤكدة",
      "Capacity cannot be lower than confirmed bookings",
    );
  }
  if (error instanceof SlotTimeConflictError || code === "VIEWING_SLOT_TIME_CONFLICT") {
    throw new ApiError(
      422,
      "VIEWING_SLOT_TIME_CONFLICT",
      "وقت نهاية الزيارة يجب أن يكون بعد وقت البداية",
      "Viewing end time must be after start time",
    );
  }
  throw error;
}

export function createViewingService(
  repository: ViewingRepository,
  clock: () => Date = () => new Date(),
) {
  return {
    async listPublicSlots(unitId: string, now = clock()): Promise<PublicViewingSlot[]> {
      validUuid(unitId, "unitId");
      const unit = await repository.resolvePublicUnit(unitId);
      if (!unit) {
        throw new ApiError(404, "VIEWING_UNIT_NOT_FOUND", "الوحدة غير موجودة", "Unit not found");
      }
      const slots = await repository.listPublicSlots(unit.propertyId, unit.unitId, now);
      return slots.map((slot) => ({
        id: slot.id,
        startAt: slot.startAt,
        endAt: slot.endAt,
        remainingCapacity: Math.max(0, slot.capacity - slot.bookedCount),
        instructionsAr: slot.instructionsAr,
        instructionsEn: slot.instructionsEn,
      }));
    },

    async bookPublicAppointment(
      input: PublicAppointmentInput,
      context: ViewingAuditContext = { source: "public", ip: "unknown" },
    ): Promise<PublicAppointmentConfirmation> {
      const normalized = normalizePublicInput(input);
      const existing = await repository.findAppointmentByIdempotency(normalized.idempotencyKey);
      if (existing) {
        if (!samePublicBookingPayload(existing, normalized)) idempotencyConflict();
        return confirmation(existing);
      }
      try {
        return confirmation(await repository.claimSlotAndCreateAppointment(normalized, context));
      } catch (error) {
        if (error instanceof SlotFullError) {
          const concurrent = await repository.findAppointmentByIdempotency(normalized.idempotencyKey);
          if (concurrent) {
            if (!samePublicBookingPayload(concurrent, normalized)) idempotencyConflict();
            return confirmation(concurrent);
          }
          throw new ApiError(
            409,
            "VIEWING_SLOT_FULL",
            "موعد الزيارة مكتمل الحجز",
            "Viewing slot is full",
          );
        }
        if (error instanceof SlotUnavailableError) {
          throw new ApiError(
            409,
            "VIEWING_SLOT_UNAVAILABLE",
            "موعد الزيارة غير متاح",
            "Viewing slot is unavailable",
          );
        }
        if (error instanceof IdempotencyConflictError) idempotencyConflict();
        throw error;
      }
    },

    async createSlot(
      principal: SarayaPrincipal,
      propertyId: string,
      input: CreateViewingSlotInput,
      context: ViewingAuditContext = { source: "management", ip: "unknown" },
    ) {
      validUuid(propertyId, "propertyId");
      requireManagement(principal, propertyId);
      const normalized = normalizedSlotInput(input, clock());
      if (normalized.unitId && !(await repository.unitExists(propertyId, normalized.unitId))) {
        throw new ApiError(404, "VIEWING_UNIT_NOT_FOUND", "الوحدة غير موجودة", "Unit not found");
      }
      try {
        return await repository.createSlot({
          propertyId,
          createdByUserId: principal.userId,
          ...normalized,
        }, context);
      } catch (error) {
        mapRepositoryError(error);
      }
    },

    async listSlots(principal: SarayaPrincipal, propertyId: string) {
      validUuid(propertyId, "propertyId");
      requireManagement(principal, propertyId);
      return repository.listSlots(propertyId);
    },

    async updateSlot(
      principal: SarayaPrincipal,
      propertyId: string,
      slotId: string,
      input: UpdateViewingSlotInput,
      context: ViewingAuditContext = { source: "management", ip: "unknown" },
    ) {
      validUuid(propertyId, "propertyId");
      validUuid(slotId, "slotId");
      requireManagement(principal, propertyId);
      const patch: UpdateViewingSlotInput = {
        idempotencyKey: normalizedIdempotencyKey(input.idempotencyKey),
      };
      if (input.startAt !== undefined) patch.startAt = parseFutureTimestamp(input.startAt, "startAt", clock()).toISOString();
      if (input.endAt !== undefined) patch.endAt = parseFutureTimestamp(input.endAt, "endAt", clock()).toISOString();
      if (input.capacity !== undefined) {
        if (!Number.isInteger(input.capacity) || input.capacity < 1) invalid("capacity");
        patch.capacity = input.capacity;
      }
      if (input.status !== undefined) {
        if (!["active", "disabled", "cancelled"].includes(input.status)) invalid("status");
        patch.status = input.status;
      }
      if (input.instructionsAr !== undefined) patch.instructionsAr = input.instructionsAr?.trim() || null;
      if (input.instructionsEn !== undefined) patch.instructionsEn = input.instructionsEn?.trim() || null;
      if (Object.keys(patch).length === 1) invalid("slot");
      let updated: ViewingSlot | null;
      try {
        updated = await repository.updateSlot(
          propertyId,
          slotId,
          patch,
          principal.userId,
          context,
        );
      } catch (error) {
        mapRepositoryError(error);
      }
      if (!updated) throw new ApiError(404, "VIEWING_SLOT_NOT_FOUND", "الموعد غير موجود", "Viewing slot not found");
      return updated;
    },

    async listAppointments(principal: SarayaPrincipal, propertyId: string) {
      validUuid(propertyId, "propertyId");
      requireManagement(principal, propertyId);
      return repository.listAppointments(propertyId);
    },

    async updateAppointmentStatus(
      principal: SarayaPrincipal,
      propertyId: string,
      appointmentId: string,
      status: Exclude<ViewingAppointmentStatus, "confirmed">,
      commandKey: string,
      context: ViewingAuditContext = { source: "management", ip: "unknown" },
    ) {
      validUuid(propertyId, "propertyId");
      validUuid(appointmentId, "appointmentId");
      requireManagement(principal, propertyId);
      if (!["completed", "no_show", "cancelled"].includes(status)) invalid("status");
      const normalizedCommandKey = normalizedIdempotencyKey(commandKey);
      let updated: ViewingAppointment | null;
      try {
        updated = await repository.updateAppointmentStatus(
          propertyId,
          appointmentId,
          status,
          principal.userId,
          normalizedCommandKey,
          context,
        );
      } catch (error) {
        mapRepositoryError(error);
      }
      if (!updated) {
        throw new ApiError(
          409,
          "VIEWING_APPOINTMENT_ALREADY_UPDATED",
          "تم تحديث حالة موعد الزيارة مسبقًا",
          "Viewing appointment was already updated",
        );
      }
      return updated;
    },
  };
}
