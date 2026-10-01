import "server-only";

import { notifyAppointmentReminder } from "./notifications";
import {
  claimDueAppointmentReminders,
  completeAppointmentReminder,
  failAppointmentReminder,
} from "./reminder-store";

/**
 * Sends the reminders that are due. Each claimed row is delivered, then marked
 * sent; a delivery failure returns the row to `pending` (up to a retry cap) so
 * it is retried on the next run without ever duplicating a delivered reminder.
 */
export async function runAppointmentReminders(input: { now: Date; limit: number }) {
  const due = await claimDueAppointmentReminders(input.now, input.limit);
  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    try {
      await notifyAppointmentReminder({
        bookingRequestId: reminder.bookingRequestId,
        reminderKind: reminder.reminderKind,
      });
      await completeAppointmentReminder(reminder.id, input.now);
      sent += 1;
    } catch (error) {
      failed += 1;
      await failAppointmentReminder(
        reminder.id,
        error instanceof Error ? error.message : "unknown_error",
      );
    }
  }

  return { claimed: due.length, sent, failed };
}
