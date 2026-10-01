import { describe, expect, it } from "vitest";

import {
  REMINDER_KINDS,
  appointmentStart,
  planReminders,
  reminderDueAt,
} from "./reminder-schedule";

describe("appointment reminder scheduling", () => {
  it("derives the appointment instant from the Bahrain wall clock", () => {
    // Asia/Bahrain is a fixed UTC+3 offset with no DST.
    const start = appointmentStart("2026-03-01", "09:30");
    expect(start?.toISOString()).toBe("2026-03-01T06:30:00.000Z");
  });

  it("accepts a start time that carries seconds", () => {
    expect(appointmentStart("2026-03-01", "09:30:00")?.toISOString()).toBe(
      "2026-03-01T06:30:00.000Z",
    );
  });

  it("returns null for a malformed date or time", () => {
    expect(appointmentStart("2026/03/01", "09:30")).toBeNull();
    expect(appointmentStart("2026-03-01", "9:30")).toBeNull();
    expect(appointmentStart("2026-03-01", "later")).toBeNull();
  });

  it("offsets each reminder kind relative to the appointment start", () => {
    const start = appointmentStart("2026-03-01", "09:30")!;
    expect(reminderDueAt("reminder_24h", start).toISOString()).toBe("2026-02-28T06:30:00.000Z");
    expect(reminderDueAt("reminder_1h", start).toISOString()).toBe("2026-03-01T05:30:00.000Z");
    expect(reminderDueAt("reminder_15m", start).toISOString()).toBe("2026-03-01T06:15:00.000Z");
    expect(reminderDueAt("starting", start).toISOString()).toBe("2026-03-01T06:30:00.000Z");
  });

  it("plans every future reminder for a distant appointment", () => {
    const start = appointmentStart("2026-03-01", "09:30")!;
    const planned = planReminders(start, new Date("2026-02-20T00:00:00.000Z"));
    expect(planned.map((reminder) => reminder.kind)).toEqual([...REMINDER_KINDS]);
  });

  it("keeps only reminders that are still ahead or barely missed", () => {
    const start = appointmentStart("2026-03-01", "09:30")!;
    // 20 minutes before start: 24h/1h/15m are past, "starting" is still ahead.
    const planned = planReminders(start, new Date("2026-03-01T06:20:00.000Z"));
    expect(planned.map((reminder) => reminder.kind)).toEqual(["starting"]);
  });

  it("keeps a just-missed reminder inside the grace window", () => {
    const start = appointmentStart("2026-03-01", "09:30")!;
    // The 15m reminder fired at 06:15Z; now is 06:18Z, inside a 5-minute grace.
    const planned = planReminders(start, new Date("2026-03-01T06:18:00.000Z"), { graceMinutes: 5 });
    expect(planned.map((reminder) => reminder.kind)).toEqual(["reminder_15m", "starting"]);
  });

  it("moves reminders when the appointment is rescheduled", () => {
    const before = appointmentStart("2026-03-01", "09:30")!;
    const after = appointmentStart("2026-03-01", "11:00")!;
    expect(reminderDueAt("reminder_1h", after).getTime()).toBeGreaterThan(
      reminderDueAt("reminder_1h", before).getTime(),
    );
  });
});
