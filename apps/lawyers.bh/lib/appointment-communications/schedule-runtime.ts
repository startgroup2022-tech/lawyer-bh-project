import "server-only";

import { runAppointmentReminders } from "./reminder-runtime";
import { autoCompletePastAppointments } from "./lifecycle";
import { notifyAppointmentCompleted } from "./notifications";

/**
 * One drain pass for the appointment schedule: complete appointments whose end
 * time has passed, then send any reminders that are now due. Both steps are
 * idempotent, so running the cron more often than needed is harmless.
 */
export async function runAppointmentSchedule(now: Date, limit: number) {
  const completedIds = await autoCompletePastAppointments(now, limit);
  for (const bookingRequestId of completedIds) {
    try {
      await notifyAppointmentCompleted(bookingRequestId);
    } catch (error) {
      console.error("[appointment-schedule] completion notify failed", {
        bookingRequestId,
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }

  const reminders = await runAppointmentReminders({ now, limit });
  return { completed: completedIds.length, reminders };
}
