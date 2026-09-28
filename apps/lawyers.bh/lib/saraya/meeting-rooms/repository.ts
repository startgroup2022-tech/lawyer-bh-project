import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sarayaAuditLogs,
  sarayaMeetingRoomBookings,
  sarayaMeetingRooms,
} from "@/lib/db/saraya-schema";
import { ApiError } from "../auth/contracts";
import type {
  MeetingRoom,
  MeetingRoomBooking,
  MeetingRoomBookingStatus,
  MeetingRoomBookingTarget,
} from "./contracts";
import type { MeetingRoomRepository } from "./service";

function bookingDto(
  row: typeof sarayaMeetingRoomBookings.$inferSelect,
): MeetingRoomBooking {
  return {
    id: row.id,
    propertyId: row.propertyId,
    roomId: row.roomId,
    bookedByUserId: row.bookedByUserId,
    tenantOrganizationId: row.tenantOrganizationId,
    status: row.status,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    attendeeCount: row.attendeeCount,
    purpose: row.purpose,
    amount: row.amount,
    currency: "BHD",
  };
}

function bookingViewDto(row: Record<string, unknown>): MeetingRoomBooking {
  return {
    id: String(row.id),
    propertyId: String(row.propertyId),
    roomId: String(row.roomId),
    bookedByUserId: String(row.bookedByUserId),
    tenantOrganizationId: row.tenantOrganizationId ? String(row.tenantOrganizationId) : null,
    status: row.status as MeetingRoomBookingStatus,
    startAt: new Date(row.startAt as string | Date).toISOString(),
    endAt: new Date(row.endAt as string | Date).toISOString(),
    attendeeCount: Number(row.attendeeCount),
    purpose: String(row.purpose),
    amount: String(row.amount),
    currency: "BHD",
    bookedByNameAr: String(row.bookedByNameAr),
    bookedByNameEn: String(row.bookedByNameEn),
    ...(row.bookedByRole === "tenant" || row.bookedByRole === "owner"
      ? { bookedByRole: row.bookedByRole }
      : {}),
  };
}

function bookingTarget(row: Record<string, unknown>): MeetingRoomBookingTarget {
  return {
    userId: String(row.userId),
    role: row.role as "tenant" | "owner",
    displayNameAr: String(row.displayNameAr),
    displayNameEn: String(row.displayNameEn),
    ...(row.tenantOrganizationId ? { tenantOrganizationId: String(row.tenantOrganizationId) } : {}),
  };
}

function roomDto(row: typeof sarayaMeetingRooms.$inferSelect): MeetingRoom {
  return {
    id: row.id,
    propertyId: row.propertyId,
    code: row.code,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    descriptionAr: row.descriptionAr,
    descriptionEn: row.descriptionEn,
    capacity: row.capacity,
    hourlyRate: row.hourlyRate,
    openingTime: row.openingTime,
    closingTime: row.closingTime,
    minimumMinutes: row.minimumMinutes,
    bookingIncrementMinutes: row.bookingIncrementMinutes,
    status: row.status,
  };
}

function activeStatusesFor(next: MeetingRoomBookingStatus) {
  if (next === "confirmed" || next === "rejected") return ["pending"] as const;
  if (next === "cancelled") return ["pending", "confirmed"] as const;
  if (next === "completed") return ["confirmed"] as const;
  return [] as const;
}

function isOverlapError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      (("code" in error && error.code === "23P01") ||
        ("message" in error && String(error.message).includes("BOOKING_TIME_CONFLICT"))),
  );
}

export const meetingRoomRepository: MeetingRoomRepository = {
  async listRooms(propertyId) {
    const rows = await db
      .select()
      .from(sarayaMeetingRooms)
      .where(eq(sarayaMeetingRooms.propertyId, propertyId))
      .orderBy(asc(sarayaMeetingRooms.code));
    return rows.map(roomDto);
  },

  async createRoom(input) {
    const [row] = await db.insert(sarayaMeetingRooms).values(input).returning();
    return roomDto(row);
  },

  async updateRoom(propertyId, roomId, input) {
    const [row] = await db
      .update(sarayaMeetingRooms)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(sarayaMeetingRooms.propertyId, propertyId), eq(sarayaMeetingRooms.id, roomId)))
      .returning();
    return row ? roomDto(row) : null;
  },

  async getRoom(propertyId, roomId) {
    const [row] = await db
      .select()
      .from(sarayaMeetingRooms)
      .where(and(eq(sarayaMeetingRooms.propertyId, propertyId), eq(sarayaMeetingRooms.id, roomId)))
      .limit(1);
    return row ? roomDto(row) : null;
  },

  async findBookingByIdempotency(bookedByUserId, idempotencyKey) {
    const [row] = await db
      .select()
      .from(sarayaMeetingRoomBookings)
      .where(
        and(
          eq(sarayaMeetingRoomBookings.bookedByUserId, bookedByUserId),
          eq(sarayaMeetingRoomBookings.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return row ? bookingDto(row) : null;
  },

  async listBookings(scope) {
    const rows = await db.execute(sql`
      SELECT b.id, b.property_id AS "propertyId", b.room_id AS "roomId",
             b.booked_by_user_id AS "bookedByUserId",
             b.tenant_organization_id AS "tenantOrganizationId", b.status,
             b.start_at AS "startAt", b.end_at AS "endAt",
             b.attendee_count AS "attendeeCount", b.purpose,
             b.amount::text AS amount,
             u.display_name_ar AS "bookedByNameAr",
             u.display_name_en AS "bookedByNameEn", m.role AS "bookedByRole"
      FROM saraya_meeting_room_bookings b
      JOIN saraya_users u ON u.id=b.booked_by_user_id
      LEFT JOIN saraya_property_memberships m
        ON m.property_id=b.property_id AND m.user_id=b.booked_by_user_id
      WHERE b.property_id=${scope.propertyId}
        AND (${scope.bookedByUserId ?? null}::uuid IS NULL OR b.booked_by_user_id=${scope.bookedByUserId ?? null})
      ORDER BY b.start_at DESC
    `);
    return (rows as unknown as Record<string, unknown>[]).map(bookingViewDto);
  },

  async listBookingTargets(propertyId) {
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (m.user_id)
             m.user_id AS "userId", m.role,
             u.display_name_ar AS "displayNameAr", u.display_name_en AS "displayNameEn",
             CASE WHEN m.role='tenant' THEN c.tenant_organization_id END AS "tenantOrganizationId"
      FROM saraya_property_memberships m
      JOIN saraya_users u ON u.id=m.user_id AND u.is_active=true
      LEFT JOIN saraya_contacts c
        ON c.property_id=m.property_id AND c.user_id=m.user_id
      WHERE m.property_id=${propertyId} AND m.is_active=true AND m.role IN ('tenant', 'owner')
      ORDER BY m.user_id, c.is_primary DESC, c.created_at DESC
    `);
    return (rows as unknown as Record<string, unknown>[]).map(bookingTarget);
  },

  async getBookingTarget(propertyId, userId) {
    const rows = await db.execute(sql`
      SELECT m.user_id AS "userId", m.role,
             u.display_name_ar AS "displayNameAr", u.display_name_en AS "displayNameEn",
             CASE WHEN m.role='tenant' THEN c.tenant_organization_id END AS "tenantOrganizationId"
      FROM saraya_property_memberships m
      JOIN saraya_users u ON u.id=m.user_id AND u.is_active=true
      LEFT JOIN saraya_contacts c
        ON c.property_id=m.property_id AND c.user_id=m.user_id
      WHERE m.property_id=${propertyId} AND m.user_id=${userId}
        AND m.is_active=true AND m.role IN ('tenant', 'owner')
      ORDER BY c.is_primary DESC, c.created_at DESC
      LIMIT 1
    `);
    const row = (rows as unknown as Record<string, unknown>[])[0];
    return row ? bookingTarget(row) : null;
  },

  async createBooking(input) {
    try {
      return await db.transaction(async (tx) => {
        const { actorUserId, ...bookingInput } = input;
        const [row] = await tx
          .insert(sarayaMeetingRoomBookings)
          .values({
            ...bookingInput,
            startAt: new Date(input.startAt),
            endAt: new Date(input.endAt),
          })
          .returning();
        await tx.insert(sarayaAuditLogs).values({
          propertyId: input.propertyId,
          actorUserId,
          action: "meeting_room_booking.created",
          entityType: "meeting_room_booking",
          entityId: row.id,
          after: { status: row.status, roomId: row.roomId, startAt: input.startAt, endAt: input.endAt },
        });
        return bookingDto(row);
      });
    } catch (error) {
      if (isOverlapError(error)) {
        throw new ApiError(409, "BOOKING_TIME_CONFLICT", "هذا الوقت محجوز بالفعل", "This time is already booked");
      }
      throw error;
    }
  },

  async getBooking(propertyId, bookingId) {
    const rows = await db.execute(sql`
      SELECT b.id, b.property_id AS "propertyId", b.room_id AS "roomId",
             b.booked_by_user_id AS "bookedByUserId",
             b.tenant_organization_id AS "tenantOrganizationId", b.status,
             b.start_at AS "startAt", b.end_at AS "endAt",
             b.attendee_count AS "attendeeCount", b.purpose,
             b.amount::text AS amount,
             u.display_name_ar AS "bookedByNameAr", u.display_name_en AS "bookedByNameEn",
             m.role AS "bookedByRole"
      FROM saraya_meeting_room_bookings b
      JOIN saraya_users u ON u.id=b.booked_by_user_id
      LEFT JOIN saraya_property_memberships m
        ON m.property_id=b.property_id AND m.user_id=b.booked_by_user_id
      WHERE b.property_id=${propertyId} AND b.id=${bookingId}
      LIMIT 1
    `);
    const row = (rows as unknown as Record<string, unknown>[])[0];
    return row ? bookingViewDto(row) : null;
  },

  async transitionBooking(input) {
    const allowedStatuses = activeStatusesFor(input.status);
    return db.transaction(async (tx) => {
      const [row] = await tx
        .update(sarayaMeetingRoomBookings)
        .set({
          status: input.status,
          decisionReason: input.reason,
          decidedByUserId: input.actorUserId,
          decidedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(sarayaMeetingRoomBookings.propertyId, input.propertyId),
            eq(sarayaMeetingRoomBookings.id, input.bookingId),
            inArray(sarayaMeetingRoomBookings.status, [...allowedStatuses]),
          ),
        )
        .returning();
      if (!row) {
        throw new ApiError(409, "BOOKING_ALREADY_DECIDED", "لا يمكن تغيير حالة هذا الحجز", "Booking status cannot be changed");
      }
      await tx.insert(sarayaAuditLogs).values({
        propertyId: input.propertyId,
        actorUserId: input.actorUserId,
        action: `meeting_room_booking.${input.status}`,
        entityType: "meeting_room_booking",
        entityId: input.bookingId,
        after: { status: input.status, reason: input.reason },
      });
      return bookingDto(row);
    });
  },
};
