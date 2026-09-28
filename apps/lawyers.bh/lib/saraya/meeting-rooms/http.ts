import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import { handle, jsonBody, text } from "../auth/http";
import type {
  CreateMeetingRoomBookingInput,
  CreateMeetingRoomInput,
  MeetingRoomBookingDecision,
  UpdateMeetingRoomInput,
} from "./contracts";

interface MeetingRoomHandlerDependencies {
  authenticate(request: Request): Promise<SarayaPrincipal>;
  listRooms(principal: SarayaPrincipal, propertyId: string): Promise<unknown[]>;
  createRoom(
    principal: SarayaPrincipal,
    propertyId: string,
    input: CreateMeetingRoomInput,
  ): Promise<unknown>;
  updateRoom(
    principal: SarayaPrincipal,
    propertyId: string,
    roomId: string,
    input: UpdateMeetingRoomInput,
  ): Promise<unknown>;
  listBookings(principal: SarayaPrincipal, propertyId: string): Promise<unknown[]>;
  listBookingTargets(principal: SarayaPrincipal, propertyId: string): Promise<unknown[]>;
  createBooking(
    principal: SarayaPrincipal,
    propertyId: string,
    input: CreateMeetingRoomBookingInput,
  ): Promise<unknown>;
  decideBooking(
    principal: SarayaPrincipal,
    propertyId: string,
    bookingId: string,
    decision: MeetingRoomBookingDecision,
  ): Promise<unknown>;
}

function propertyIdOf(request: Request) {
  const propertyId = new URL(request.url).searchParams.get("propertyId")?.trim();
  if (!propertyId) {
    throw new ApiError(422, "PROPERTY_REQUIRED", "العقار مطلوب", "Property is required");
  }
  return propertyId;
}

function requiredNumber(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "تحقق من الحقول المطلوبة",
      "Check the required fields",
      { [key]: ["REQUIRED"] },
    );
  }
  return value;
}

function optionalString(body: Record<string, unknown>, key: string) {
  const value = body[key];
  if (value === undefined || value === null) return value;
  if (typeof value !== "string") {
    throw new ApiError(422, "VALIDATION_ERROR", "تحقق من الحقول المطلوبة", "Check the required fields", { [key]: ["INVALID"] });
  }
  return value;
}

export function createMeetingRoomHandlers(
  dependencies: MeetingRoomHandlerDependencies,
) {
  return {
    listRooms(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        return Response.json({
          items: await dependencies.listRooms(principal, propertyIdOf(request)),
        });
      });
    },

    createRoom(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await jsonBody(request);
        const input: CreateMeetingRoomInput = {
          code: text(body, "code"),
          nameAr: text(body, "nameAr"),
          nameEn: text(body, "nameEn"),
          capacity: requiredNumber(body, "capacity"),
          hourlyRate: text(body, "hourlyRate"),
        };
        for (const key of ["descriptionAr", "descriptionEn", "openingTime", "closingTime", "status"] as const) {
          const value = optionalString(body, key);
          if (value !== undefined) Object.assign(input, { [key]: value });
        }
        for (const key of ["minimumMinutes", "bookingIncrementMinutes"] as const) {
          if (body[key] !== undefined) Object.assign(input, { [key]: requiredNumber(body, key) });
        }
        return Response.json(
          await dependencies.createRoom(principal, propertyIdOf(request), input),
          { status: 201 },
        );
      });
    },

    updateRoom(request: Request, roomId: string) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await jsonBody(request);
        return Response.json(
          await dependencies.updateRoom(
            principal,
            propertyIdOf(request),
            roomId,
            body as UpdateMeetingRoomInput,
          ),
        );
      });
    },

    listBookings(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const url = new URL(request.url);
        return Response.json({
          items: url.searchParams.get("targets") === "true"
            ? await dependencies.listBookingTargets(principal, propertyIdOf(request))
            : await dependencies.listBookings(principal, propertyIdOf(request)),
        });
      });
    },

    createBooking(request: Request) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await jsonBody(request);
        const input: CreateMeetingRoomBookingInput = {
            roomId: text(body, "roomId"),
            startAt: text(body, "startAt"),
            endAt: text(body, "endAt"),
            attendeeCount: requiredNumber(body, "attendeeCount"),
            purpose: text(body, "purpose"),
            idempotencyKey: text(body, "idempotencyKey"),
        };
        const bookedForUserId = optionalString(body, "bookedForUserId");
        if (typeof bookedForUserId === "string") input.bookedForUserId = bookedForUserId;
        return Response.json(
          await dependencies.createBooking(principal, propertyIdOf(request), input),
          { status: 201 },
        );
      });
    },

    decideBooking(request: Request, bookingId: string) {
      return handle(async () => {
        const principal = await dependencies.authenticate(request);
        const body = await jsonBody(request);
        const type = text(body, "decision");
        if (!["confirm", "reject", "cancel", "complete"].includes(type)) {
          throw new ApiError(422, "INVALID_BOOKING_DECISION", "قرار الحجز غير صحيح", "Invalid booking decision");
        }
        const reason = optionalString(body, "reason");
        const decision = (type === "reject" || type === "cancel")
          ? { type, ...(typeof reason === "string" ? { reason } : {}) }
          : { type };
        return Response.json(
          await dependencies.decideBooking(
            principal,
            propertyIdOf(request),
            bookingId,
            decision as MeetingRoomBookingDecision,
          ),
        );
      });
    },
  };
}
