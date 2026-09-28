import { ApiError, type SarayaPrincipal } from "../auth/contracts";
import type {
  CreateMeetingRoomBookingInput,
  CreateMeetingRoomInput,
  MeetingRoom,
  MeetingRoomBooking,
  MeetingRoomBookingDecision,
  MeetingRoomBookingStatus,
  MeetingRoomBookingTarget,
  UpdateMeetingRoomInput,
} from "./contracts";

export type { MeetingRoom, MeetingRoomBooking } from "./contracts";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isoTimestampPattern = /T.*(?:Z|[+-]\d{2}:\d{2})$/;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const moneyPattern = /^\d{1,11}(?:\.\d{1,3})?$/;
const managementRoles = new Set(["super_admin", "property_manager"]);

export interface MeetingRoomRepository {
  listRooms(propertyId: string): Promise<MeetingRoom[]>;
  createRoom(input: Omit<MeetingRoom, "id">): Promise<MeetingRoom>;
  updateRoom(
    propertyId: string,
    roomId: string,
    input: Partial<Omit<MeetingRoom, "id" | "propertyId">>,
  ): Promise<MeetingRoom | null>;
  getRoom(propertyId: string, roomId: string): Promise<MeetingRoom | null>;
  findBookingByIdempotency(
    bookedByUserId: string,
    idempotencyKey: string,
  ): Promise<MeetingRoomBooking | null>;
  listBookings(scope: {
    propertyId: string;
    bookedByUserId?: string;
  }): Promise<MeetingRoomBooking[]>;
  listBookingTargets(propertyId: string): Promise<MeetingRoomBookingTarget[]>;
  getBookingTarget(propertyId: string, userId: string): Promise<MeetingRoomBookingTarget | null>;
  createBooking(input: {
    propertyId: string;
    roomId: string;
    bookedByUserId: string;
    actorUserId: string;
    tenantOrganizationId?: string;
    startAt: string;
    endAt: string;
    attendeeCount: number;
    purpose: string;
    amount: string;
    currency: "BHD";
    idempotencyKey: string;
  }): Promise<MeetingRoomBooking>;
  getBooking(
    propertyId: string,
    bookingId: string,
  ): Promise<MeetingRoomBooking | null>;
  transitionBooking(input: {
    propertyId: string;
    bookingId: string;
    status: MeetingRoomBookingStatus;
    actorUserId: string;
    reason: string | null;
  }): Promise<MeetingRoomBooking>;
}

function invalid(field: string) {
  throw new ApiError(
    422,
    "INVALID_MEETING_ROOM_BOOKING",
    "بيانات حجز قاعة الاجتماعات غير صحيحة",
    "Invalid meeting-room booking",
    { [field]: ["invalid"] },
  );
}

function membershipFor(principal: SarayaPrincipal, propertyId: string) {
  const membership = principal.memberships.find(
    (candidate) => candidate.propertyId === propertyId,
  );
  if (!membership) {
    throw new ApiError(
      403,
      "PROPERTY_ACCESS_DENIED",
      "لا تملك صلاحية لهذا العقار",
      "Property access denied",
    );
  }
  return membership;
}

function requireManagement(principal: SarayaPrincipal, propertyId: string) {
  const membership = membershipFor(principal, propertyId);
  if (!managementRoles.has(membership.role)) {
    throw new ApiError(
      403,
      "MEETING_ROOM_MANAGEMENT_DENIED",
      "ليست لديك صلاحية إدارة قاعات الاجتماعات",
      "Meeting-room management denied",
    );
  }
}

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bahrain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    dateKey: `${value("year")}-${value("month")}-${value("day")}`,
    minuteOfDay: value("hour") * 60 + value("minute"),
    second: value("second"),
  };
}

function timeMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function moneyToMills(value: string) {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) {
    throw new ApiError(
      500,
      "INVALID_STORED_AMOUNT",
      "قيمة مالية غير صحيحة",
      "Invalid stored amount",
    );
  }
  return BigInt(match[1]) * BigInt(1000) + BigInt((match[2] ?? "").padEnd(3, "0"));
}

function millsToMoney(value: bigint) {
  return `${value / BigInt(1000)}.${(value % BigInt(1000)).toString().padStart(3, "0")}`;
}

function normalizedRoomInput(input: CreateMeetingRoomInput) {
  const code = input.code.trim().toUpperCase();
  const nameAr = input.nameAr.trim();
  const nameEn = input.nameEn.trim();
  const openingTime = input.openingTime ?? "08:00:00";
  const closingTime = input.closingTime ?? "22:00:00";
  const minimumMinutes = input.minimumMinutes ?? 60;
  const bookingIncrementMinutes = input.bookingIncrementMinutes ?? 30;
  if (!code || code.length > 32) invalid("code");
  if (!nameAr) invalid("nameAr");
  if (!nameEn) invalid("nameEn");
  if (!Number.isInteger(input.capacity) || input.capacity < 1) invalid("capacity");
  if (!moneyPattern.test(input.hourlyRate)) invalid("hourlyRate");
  if (!timePattern.test(openingTime) || !timePattern.test(closingTime)) invalid("openingTime");
  if (timeMinutes(closingTime) <= timeMinutes(openingTime)) invalid("closingTime");
  if (!Number.isInteger(minimumMinutes) || minimumMinutes < 30 || minimumMinutes > 1440) {
    invalid("minimumMinutes");
  }
  if (![15, 30, 60].includes(bookingIncrementMinutes)) invalid("bookingIncrementMinutes");
  return {
    code,
    nameAr,
    nameEn,
    descriptionAr: input.descriptionAr?.trim() || null,
    descriptionEn: input.descriptionEn?.trim() || null,
    capacity: input.capacity,
    hourlyRate: millsToMoney(moneyToMills(input.hourlyRate)),
    openingTime,
    closingTime,
    minimumMinutes,
    bookingIncrementMinutes,
    status: input.status ?? ("active" as const),
  };
}

function normalizedRoomPatch(input: UpdateMeetingRoomInput) {
  const patch: Partial<Omit<MeetingRoom, "id" | "propertyId">> = {};
  if (!Object.keys(input).length) invalid("room");
  if (input.code !== undefined) {
    const value = input.code.trim().toUpperCase();
    if (!value || value.length > 32) invalid("code");
    patch.code = value;
  }
  if (input.nameAr !== undefined) {
    const value = input.nameAr.trim();
    if (!value) invalid("nameAr");
    patch.nameAr = value;
  }
  if (input.nameEn !== undefined) {
    const value = input.nameEn.trim();
    if (!value) invalid("nameEn");
    patch.nameEn = value;
  }
  if (input.descriptionAr !== undefined) patch.descriptionAr = input.descriptionAr?.trim() || null;
  if (input.descriptionEn !== undefined) patch.descriptionEn = input.descriptionEn?.trim() || null;
  if (input.capacity !== undefined) {
    if (!Number.isInteger(input.capacity) || input.capacity < 1) invalid("capacity");
    patch.capacity = input.capacity;
  }
  if (input.hourlyRate !== undefined) {
    if (!moneyPattern.test(input.hourlyRate)) invalid("hourlyRate");
    patch.hourlyRate = millsToMoney(moneyToMills(input.hourlyRate));
  }
  if (input.openingTime !== undefined) {
    if (!timePattern.test(input.openingTime)) invalid("openingTime");
    patch.openingTime = input.openingTime;
  }
  if (input.closingTime !== undefined) {
    if (!timePattern.test(input.closingTime)) invalid("closingTime");
    patch.closingTime = input.closingTime;
  }
  if (
    patch.openingTime &&
    patch.closingTime &&
    timeMinutes(patch.closingTime) <= timeMinutes(patch.openingTime)
  ) invalid("closingTime");
  if (input.minimumMinutes !== undefined) {
    if (!Number.isInteger(input.minimumMinutes) || input.minimumMinutes < 30 || input.minimumMinutes > 1440) invalid("minimumMinutes");
    patch.minimumMinutes = input.minimumMinutes;
  }
  if (input.bookingIncrementMinutes !== undefined) {
    if (![15, 30, 60].includes(input.bookingIncrementMinutes)) invalid("bookingIncrementMinutes");
    patch.bookingIncrementMinutes = input.bookingIncrementMinutes;
  }
  if (input.status !== undefined) {
    if (!["active", "maintenance", "inactive"].includes(input.status)) invalid("status");
    patch.status = input.status;
  }
  return patch;
}

export function createMeetingRoomService(
  repository: MeetingRoomRepository,
  clock: () => Date = () => new Date(),
) {
  return {
    async listRooms(principal: SarayaPrincipal, propertyId: string) {
      membershipFor(principal, propertyId);
      return repository.listRooms(propertyId);
    },

    async createRoom(
      principal: SarayaPrincipal,
      propertyId: string,
      input: CreateMeetingRoomInput,
    ) {
      requireManagement(principal, propertyId);
      return repository.createRoom({ propertyId, ...normalizedRoomInput(input) });
    },

    async updateRoom(
      principal: SarayaPrincipal,
      propertyId: string,
      roomId: string,
      input: UpdateMeetingRoomInput,
    ) {
      requireManagement(principal, propertyId);
      if (!uuidPattern.test(roomId)) invalid("roomId");
      const updated = await repository.updateRoom(
        propertyId,
        roomId,
        normalizedRoomPatch(input),
      );
      if (!updated) {
        throw new ApiError(404, "MEETING_ROOM_NOT_FOUND", "قاعة الاجتماعات غير موجودة", "Meeting room not found");
      }
      return updated;
    },

    async listBookings(principal: SarayaPrincipal, propertyId: string) {
      const membership = membershipFor(principal, propertyId);
      return repository.listBookings({
        propertyId,
        ...(membership.role === "tenant" ? { bookedByUserId: principal.userId } : {}),
      });
    },

    async listBookingTargets(principal: SarayaPrincipal, propertyId: string) {
      requireManagement(principal, propertyId);
      return repository.listBookingTargets(propertyId);
    },

    async createBooking(
      principal: SarayaPrincipal,
      propertyId: string,
      input: CreateMeetingRoomBookingInput,
    ) {
      const membership = membershipFor(principal, propertyId);
      if (!uuidPattern.test(input.roomId)) invalid("roomId");
      let bookedByUserId = principal.userId;
      let tenantOrganizationId = membership.role === "tenant" ? membership.tenantId : undefined;
      if (input.bookedForUserId !== undefined) {
        if (!managementRoles.has(membership.role)) {
          throw new ApiError(403, "BOOKING_ON_BEHALF_DENIED", "لا يمكنك الحجز نيابة عن مستخدم آخر", "Booking on behalf denied");
        }
        if (!uuidPattern.test(input.bookedForUserId)) invalid("bookedForUserId");
        const target = await repository.getBookingTarget(propertyId, input.bookedForUserId);
        if (!target) {
          throw new ApiError(404, "BOOKING_USER_NOT_FOUND", "المستخدم المختار غير مرتبط بهذا العقار", "Selected user is not assigned to this property");
        }
        bookedByUserId = target.userId;
        tenantOrganizationId = target.role === "tenant" ? target.tenantOrganizationId : undefined;
      }
      const idempotencyKey = input.idempotencyKey.trim();
      if (!idempotencyKey || idempotencyKey.length > 128) invalid("idempotencyKey");
      const existing = await repository.findBookingByIdempotency(
        bookedByUserId,
        idempotencyKey,
      );
      if (existing) return existing;

      if (!isoTimestampPattern.test(input.startAt) || !isoTimestampPattern.test(input.endAt)) {
        invalid("startAt");
      }
      const start = new Date(input.startAt);
      const end = new Date(input.endAt);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
        invalid("endAt");
      }
      if (start <= clock()) {
        throw new ApiError(422, "BOOKING_MUST_BE_FUTURE", "يجب أن يكون الحجز في المستقبل", "Booking must be in the future");
      }
      if (!Number.isInteger(input.attendeeCount) || input.attendeeCount < 1) {
        invalid("attendeeCount");
      }
      const purpose = input.purpose.trim();
      if (!purpose || purpose.length > 1000) invalid("purpose");

      const room = await repository.getRoom(propertyId, input.roomId);
      if (!room || room.status !== "active") {
        throw new ApiError(409, "MEETING_ROOM_UNAVAILABLE", "قاعة الاجتماعات غير متاحة", "Meeting room is unavailable");
      }
      if (input.attendeeCount > room.capacity) {
        throw new ApiError(422, "ROOM_CAPACITY_EXCEEDED", "عدد الحضور يتجاوز سعة القاعة", "Room capacity exceeded");
      }

      const localStart = localParts(start);
      const localEnd = localParts(end);
      if (localStart.dateKey !== localEnd.dateKey) {
        throw new ApiError(422, "BOOKING_MUST_END_SAME_DAY", "يجب أن ينتهي الحجز في اليوم نفسه", "Booking must end on the same day");
      }
      const durationMinutes = (end.getTime() - start.getTime()) / 60_000;
      if (!Number.isInteger(durationMinutes) || durationMinutes < room.minimumMinutes) {
        throw new ApiError(422, "BOOKING_TOO_SHORT", "مدة الحجز أقصر من الحد الأدنى", "Booking is shorter than the minimum duration");
      }
      if (
        localStart.second !== 0 ||
        localEnd.second !== 0 ||
        localStart.minuteOfDay % room.bookingIncrementMinutes !== 0 ||
        localEnd.minuteOfDay % room.bookingIncrementMinutes !== 0
      ) {
        throw new ApiError(422, "INVALID_BOOKING_INCREMENT", "وقت الحجز لا يطابق فواصل القاعة", "Booking time does not match the room increment");
      }
      if (
        localStart.minuteOfDay < timeMinutes(room.openingTime) ||
        localEnd.minuteOfDay > timeMinutes(room.closingTime)
      ) {
        throw new ApiError(422, "OUTSIDE_ROOM_HOURS", "الحجز خارج ساعات عمل القاعة", "Booking is outside room hours");
      }

      const amountMills =
        (moneyToMills(room.hourlyRate) * BigInt(durationMinutes) + BigInt(30)) /
        BigInt(60);
      return repository.createBooking({
        propertyId,
        roomId: input.roomId,
        bookedByUserId,
        actorUserId: principal.userId,
        ...(tenantOrganizationId ? { tenantOrganizationId } : {}),
        startAt: input.startAt,
        endAt: input.endAt,
        attendeeCount: input.attendeeCount,
        purpose,
        amount: millsToMoney(amountMills),
        currency: "BHD",
        idempotencyKey,
      });
    },

    async decideBooking(
      principal: SarayaPrincipal,
      propertyId: string,
      bookingId: string,
      decision: MeetingRoomBookingDecision,
    ) {
      const membership = membershipFor(principal, propertyId);
      if (!uuidPattern.test(bookingId)) invalid("bookingId");
      const booking = await repository.getBooking(propertyId, bookingId);
      if (!booking) {
        throw new ApiError(404, "MEETING_ROOM_BOOKING_NOT_FOUND", "حجز قاعة الاجتماعات غير موجود", "Meeting-room booking not found");
      }
      const isManager = managementRoles.has(membership.role);
      const selfCancellation =
        decision.type === "cancel" && booking.bookedByUserId === principal.userId;
      if (!isManager && !selfCancellation) {
        throw new ApiError(403, "BOOKING_DECISION_DENIED", "ليست لديك صلاحية اتخاذ هذا القرار", "Booking decision denied");
      }

      const nextStatus: MeetingRoomBookingStatus =
        decision.type === "confirm"
          ? "confirmed"
          : decision.type === "reject"
            ? "rejected"
            : decision.type === "cancel"
              ? "cancelled"
              : "completed";
      const allowed =
        booking.status === "pending"
          ? new Set(["confirmed", "rejected", "cancelled"])
          : booking.status === "confirmed"
            ? new Set(["cancelled", "completed"])
            : new Set<MeetingRoomBookingStatus>();
      if (!allowed.has(nextStatus)) {
        throw new ApiError(409, "BOOKING_ALREADY_DECIDED", "لا يمكن تغيير حالة هذا الحجز", "Booking status cannot be changed");
      }
      return repository.transitionBooking({
        propertyId,
        bookingId,
        status: nextStatus,
        actorUserId: principal.userId,
        reason: "reason" in decision ? decision.reason?.trim() || null : null,
      });
    },
  };
}
