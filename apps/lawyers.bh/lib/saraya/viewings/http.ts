import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle, jsonBody, text } from "../auth/http";
import { requestIp } from "../auth/security";
import type {
  CreateViewingSlotInput,
  PublicAppointmentInput,
  UpdateViewingSlotInput,
  ViewingAuditContext,
  ViewingAppointmentStatus,
} from "./contracts";

interface ViewingHandlerDependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  listPublicSlots(unitId: string, now?: Date): Promise<unknown[]>;
  bookPublicAppointment(input: PublicAppointmentInput, context: ViewingAuditContext): Promise<unknown>;
  createSlot(
    principal: SarayaPrincipal,
    propertyId: string,
    input: CreateViewingSlotInput,
    context: ViewingAuditContext,
  ): Promise<unknown>;
  listSlots(principal: SarayaPrincipal, propertyId: string): Promise<unknown[]>;
  updateSlot(
    principal: SarayaPrincipal,
    propertyId: string,
    slotId: string,
    input: UpdateViewingSlotInput,
    context: ViewingAuditContext,
  ): Promise<unknown>;
  listAppointments(principal: SarayaPrincipal, propertyId: string): Promise<unknown[]>;
  updateAppointmentStatus(
    principal: SarayaPrincipal,
    propertyId: string,
    appointmentId: string,
    status: Exclude<ViewingAppointmentStatus, "confirmed">,
    commandKey: string,
    context: ViewingAuditContext,
  ): Promise<unknown>;
}

interface RouteContext<Key extends string> {
  params: Promise<Record<Key, string>>;
}

function propertyIdOf(request: Request) {
  const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!propertyId) {
    throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  }
  return propertyId;
}

function requiredInteger(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (!Number.isInteger(value)) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "تحقق من الحقول المطلوبة",
      "Check the required fields",
      { [key]: ["INVALID"] },
    );
  }
  return value as number;
}

function optionalText(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "تحقق من الحقول المطلوبة",
      "Check the required fields",
      { [key]: ["INVALID"] },
    );
  }
  return value.trim() || null;
}

function appointmentInput(body: Record<string, unknown>): PublicAppointmentInput {
  const locale = text(body, "locale");
  if (locale !== "ar" && locale !== "en") {
    throw new ApiError(422, "VALIDATION_ERROR", "اللغة غير صحيحة", "Invalid locale");
  }
  return {
    propertyId: text(body, "propertyId"),
    unitId: text(body, "unitId"),
    slotId: text(body, "slotId"),
    visitorName: text(body, "visitorName"),
    visitorPhone: text(body, "visitorPhone"),
    visitorEmail: text(body, "visitorEmail"),
    locale,
    idempotencyKey: text(body, "idempotencyKey"),
  };
}

function createSlotInput(body: Record<string, unknown>): CreateViewingSlotInput {
  const input: CreateViewingSlotInput = {
    startAt: text(body, "startAt"),
    endAt: text(body, "endAt"),
    capacity: requiredInteger(body, "capacity"),
    idempotencyKey: text(body, "idempotencyKey"),
  };
  for (const key of ["unitId", "instructionsAr", "instructionsEn"] as const) {
    const value = optionalText(body, key);
    if (value !== undefined) Object.assign(input, { [key]: value });
  }
  return input;
}

function updateSlotInput(body: Record<string, unknown>): UpdateViewingSlotInput {
  const input: UpdateViewingSlotInput = {
    idempotencyKey: text(body, "idempotencyKey"),
  };
  for (const key of ["startAt", "endAt", "status", "instructionsAr", "instructionsEn"] as const) {
    const value = optionalText(body, key);
    if (value !== undefined) Object.assign(input, { [key]: value });
  }
  if (body.capacity !== undefined) input.capacity = requiredInteger(body, "capacity");
  return input;
}

function auditContext(request: Request, source: ViewingAuditContext["source"]): ViewingAuditContext {
  return { source, ip: requestIp(request) };
}

export function createViewingHandlers(dependencies: ViewingHandlerDependencies) {
  return {
    listPublic(request: Request, context: RouteContext<"unitId">) {
      return handle(async () => {
        const { unitId } = await context.params;
        return Response.json({
          items: await dependencies.listPublicSlots(unitId, new Date()),
        });
      });
    },

    bookPublic(request: Request) {
      return handle(async () => Response.json(
        await dependencies.bookPublicAppointment(
          appointmentInput(await jsonBody(request)),
          auditContext(request, "public"),
        ),
        { status: 201 },
      ));
    },

    createSlot(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        return Response.json(
          await dependencies.createSlot(
            principal,
            propertyIdOf(request),
            createSlotInput(await jsonBody(request)),
            auditContext(request, "management"),
          ),
          { status: 201 },
        );
      });
    },

    listSlots(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        return Response.json({
          items: await dependencies.listSlots(principal, propertyIdOf(request)),
        });
      });
    },

    updateSlot(request: Request, context: RouteContext<"slotId">) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const { slotId } = await context.params;
        return Response.json(
          await dependencies.updateSlot(
            principal,
            propertyIdOf(request),
            slotId,
            updateSlotInput(await jsonBody(request)),
            auditContext(request, "management"),
          ),
        );
      });
    },

    listAppointments(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        return Response.json({
          items: await dependencies.listAppointments(principal, propertyIdOf(request)),
        });
      });
    },

    updateAppointmentStatus(
      request: Request,
      context: RouteContext<"appointmentId">,
    ) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const { appointmentId } = await context.params;
        const body = await jsonBody(request);
        const status = text(body, "status");
        const commandKey = text(body, "idempotencyKey");
        if (!["completed", "no_show", "cancelled"].includes(status)) {
          throw new ApiError(
            422,
            "INVALID_VIEWING_APPOINTMENT_STATUS",
            "حالة موعد الزيارة غير صحيحة",
            "Invalid viewing appointment status",
          );
        }
        return Response.json(
          await dependencies.updateAppointmentStatus(
            principal,
            propertyIdOf(request),
            appointmentId,
            status as Exclude<ViewingAppointmentStatus, "confirmed">,
            commandKey,
            auditContext(request, "management"),
          ),
        );
      });
    },
  };
}
