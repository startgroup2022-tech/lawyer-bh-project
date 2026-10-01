/**
 * Appointment lifecycle state machine. Pure transition rules so every status
 * change can be unit tested without a database; the route layer is responsible
 * for proving the caller is an authorized participant before calling `can`.
 *
 * The statuses are the ones already stored in `bahrain_booking_requests.admin_status`
 * (the booking flow already writes `pending_review`/`approved`/`cancelled`/
 * `rejected`/`completed`), extended with an in-progress state for a started
 * meeting. No parallel status system is introduced.
 */

export type AppointmentStatus =
  | "pending_review"
  | "approved"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type AppointmentActorRole = "client" | "lawyer" | "admin";

const transitions: Record<AppointmentStatus, ReadonlySet<AppointmentStatus>> = {
  pending_review: new Set(["approved", "confirmed", "rejected", "cancelled"]),
  approved: new Set(["confirmed", "in_progress", "completed", "cancelled", "rejected"]),
  confirmed: new Set(["in_progress", "completed", "cancelled"]),
  in_progress: new Set(["completed", "cancelled"]),
  completed: new Set(),
  cancelled: new Set(),
  rejected: new Set(),
};

/** Statuses from which a client or lawyer may still message or call. */
export const ACTIVE_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "pending_review",
  "approved",
  "confirmed",
  "in_progress",
]);

export const TERMINAL_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  "completed",
  "cancelled",
  "rejected",
]);

// `booked`/`pending` are legacy aliases still present in
// `bahrain_booking_requests.admin_status`; a conversation for such a row must
// stay writable rather than 403 the participant.
const LEGACY_ACTIVE_STATUSES = new Set(["booked", "pending"]);

export function isTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status as AppointmentStatus);
}

export function isActive(status: string): boolean {
  return (
    ACTIVE_STATUSES.has(status as AppointmentStatus) || LEGACY_ACTIVE_STATUSES.has(status)
  );
}

/**
 * Whether `role` may move an appointment from `from` to `to`.
 *
 * Business rules encoded here:
 * - only an admin may reject a pending request;
 * - a client or lawyer may cancel while the appointment is still active;
 * - neither may complete an appointment that has not started;
 * - only the lawyer (or admin) starts and completes a consultation;
 * - a cancelled/rejected appointment can never be started;
 * - a completed appointment can never change again.
 */
export function canTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
  role: AppointmentActorRole,
): boolean {
  if (from === to) return true;
  if (!transitions[from].has(to)) return false;

  if (to === "rejected") return role === "admin";
  if (to === "in_progress") return role === "lawyer" || role === "admin";
  if (to === "completed") return role === "lawyer" || role === "admin";
  if (to === "cancelled") return role === "client" || role === "lawyer" || role === "admin";
  if (to === "approved" || to === "confirmed") return role === "admin" || role === "lawyer";
  return false;
}

export class AppointmentTransitionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
