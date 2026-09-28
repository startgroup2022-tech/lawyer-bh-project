export type ViewingSlotStatus = "active" | "disabled" | "cancelled";
export type ViewingAppointmentStatus =
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

export interface PublicViewingSlot {
  id: string;
  startAt: string;
  endAt: string;
  remainingCapacity: number;
  instructionsAr: string | null;
  instructionsEn: string | null;
}

export interface PublicAppointmentInput {
  propertyId: string;
  unitId: string;
  slotId: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string;
  locale: "ar" | "en";
  idempotencyKey: string;
}

export interface ViewingAuditContext {
  source: "public" | "management";
  ip: string;
}

export interface ViewingSlot {
  id: string;
  propertyId: string;
  unitId: string | null;
  startAt: string;
  endAt: string;
  capacity: number;
  bookedCount: number;
  status: ViewingSlotStatus;
  instructionsAr: string | null;
  instructionsEn: string | null;
  createdByUserId: string;
}

export interface CreateViewingSlotInput {
  unitId?: string | null;
  startAt: string;
  endAt: string;
  capacity: number;
  instructionsAr?: string | null;
  instructionsEn?: string | null;
  idempotencyKey: string;
}

export interface UpdateViewingSlotInput {
  startAt?: string;
  endAt?: string;
  capacity?: number;
  status?: ViewingSlotStatus;
  instructionsAr?: string | null;
  instructionsEn?: string | null;
  idempotencyKey: string;
}

export interface ViewingAppointment {
  id: string;
  propertyId: string;
  unitId: string;
  slotId: string;
  reference: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail: string;
  locale: "ar" | "en";
  status: ViewingAppointmentStatus;
  idempotencyKey: string;
  internalNotes: string | null;
  startAt: string;
  endAt: string;
}

export interface PublicAppointmentConfirmation {
  reference: string;
  status: "confirmed";
  startAt: string;
  endAt: string;
}
