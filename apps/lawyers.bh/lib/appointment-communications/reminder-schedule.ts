/**
 * Pure scheduling maths for appointment reminders. A reminder's `due_at` is
 * always derived from the real appointment timestamp (date + start time in the
 * country's appointment zone), never from a client timer, so a reschedule or a
 * cancellation changes the queue without any client involvement.
 */

export const REMINDER_KINDS = ["reminder_24h", "reminder_1h", "reminder_15m", "starting"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

/** Minutes before the appointment start that each reminder fires. */
const OFFSET_MINUTES: Record<ReminderKind, number> = {
  reminder_24h: 24 * 60,
  reminder_1h: 60,
  reminder_15m: 15,
  starting: 0,
};

/**
 * The instant an appointment starts, interpreted in `zone`. `date` is
 * `YYYY-MM-DD` and `time` is `HH:MM` (optionally with seconds).
 */
export function appointmentStart(date: string, time: string, zone = "Asia/Bahrain"): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!match) return null;
  // Build the wall-clock time in the target zone by formatting a UTC guess and
  // correcting with the zone offset at that instant (handles DST/offset).
  const naive = Date.UTC(
    Number(date.slice(0, 4)),
    Number(date.slice(5, 7)) - 1,
    Number(date.slice(8, 10)),
    Number(match[1]),
    Number(match[2]),
  );
  let candidate = new Date(naive);
  for (let i = 0; i < 2; i += 1) {
    const offset = zoneOffsetMs(candidate, zone);
    candidate = new Date(naive - offset);
  }
  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

function zoneOffsetMs(instant: Date, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour) % 24,
    Number(values.minute),
    Number(values.second),
  );
  return asUtc - instant.getTime();
}

/** The instant a given reminder kind is due, relative to the appointment start. */
export function reminderDueAt(kind: ReminderKind, start: Date): Date {
  return new Date(start.getTime() - OFFSET_MINUTES[kind] * 60_000);
}

export type PlannedReminder = { kind: ReminderKind; dueAt: Date };

/**
 * Reminders that should still exist for an appointment at `now`. A reminder
 * whose due time has already passed is only planned if it is in the recent past
 * (`graceMinutes`), which stops a long-overdue reminder from firing the moment
 * a booking is created for a near-term slot.
 */
export function planReminders(
  start: Date,
  now: Date,
  options: { graceMinutes?: number } = {},
): PlannedReminder[] {
  const grace = (options.graceMinutes ?? 0) * 60_000;
  return REMINDER_KINDS.map((kind) => ({ kind, dueAt: reminderDueAt(kind, start) }))
    .filter((reminder) => reminder.dueAt.getTime() >= now.getTime() - grace)
    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
}
