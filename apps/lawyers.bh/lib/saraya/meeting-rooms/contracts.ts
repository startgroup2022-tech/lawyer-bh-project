export type MeetingRoomStatus = "active" | "maintenance" | "inactive";
export type MeetingRoomBookingStatus =
  | "pending"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "completed";

export interface MeetingRoom {
  id: string;
  propertyId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  capacity: number;
  hourlyRate: string;
  openingTime: string;
  closingTime: string;
  minimumMinutes: number;
  bookingIncrementMinutes: number;
  status: MeetingRoomStatus;
}

export interface MeetingRoomBooking {
  id: string;
  propertyId: string;
  roomId: string;
  bookedByUserId: string;
  tenantOrganizationId?: string | null;
  status: MeetingRoomBookingStatus;
  startAt: string;
  endAt: string;
  attendeeCount: number;
  purpose: string;
  amount: string;
  currency: "BHD";
  bookedByNameAr?: string;
  bookedByNameEn?: string;
  bookedByRole?: "tenant" | "owner";
}

export interface MeetingRoomBookingTarget {
  userId: string;
  role: "tenant" | "owner";
  displayNameAr: string;
  displayNameEn: string;
  tenantOrganizationId?: string;
}

export interface CreateMeetingRoomInput {
  code: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  capacity: number;
  hourlyRate: string;
  openingTime?: string;
  closingTime?: string;
  minimumMinutes?: number;
  bookingIncrementMinutes?: 15 | 30 | 60;
  status?: MeetingRoomStatus;
}

export type UpdateMeetingRoomInput = Partial<CreateMeetingRoomInput>;

export interface CreateMeetingRoomBookingInput {
  roomId: string;
  bookedForUserId?: string;
  startAt: string;
  endAt: string;
  attendeeCount: number;
  purpose: string;
  idempotencyKey: string;
}

export type MeetingRoomBookingDecision =
  | { type: "confirm" | "complete" }
  | { type: "reject" | "cancel"; reason?: string };
