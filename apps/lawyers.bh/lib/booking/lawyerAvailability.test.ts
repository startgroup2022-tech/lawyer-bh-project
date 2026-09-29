import { describe, expect, it } from "vitest";

import {
  computeAvailableSlots,
  expandWindowSlots,
  formatTime,
  isBookableSlot,
  isValidDate,
  localDate,
  localMinutes,
  parseTime,
  rangesOverlap,
  validateAvailabilityPayload,
  validateAvailabilityWindow,
  weekdayOf,
  type AvailabilityWindow,
} from "./lawyerAvailability";

const window = (
  overrides: Partial<AvailabilityWindow> = {},
): AvailabilityWindow => ({
  weekday: 0,
  start: 9 * 60,
  end: 17 * 60,
  slotDurationMinutes: 30,
  consultationType: "any",
  ...overrides,
});

describe("time parsing and formatting", () => {
  it("accepts HH:MM and HH:MM:SS and rejects anything else", () => {
    expect(parseTime("09:30")).toBe(570);
    expect(parseTime("09:30:00")).toBe(570);
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("9:30")).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime(930)).toBeNull();
  });

  it("round-trips through formatTime and clamps out-of-range minutes", () => {
    expect(formatTime(570)).toBe("09:30");
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(-5)).toBe("00:00");
    expect(formatTime(2000)).toBe("24:00");
  });
});

describe("dates", () => {
  it("validates calendar dates and rejects impossible ones", () => {
    expect(isValidDate("2026-09-13")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-9-3")).toBe(false);
    expect(isValidDate("nope")).toBe(false);
  });

  it("derives the Bahrain local calendar date and minutes", () => {
    const instant = new Date("2026-09-10T09:00:00+03:00");
    expect(localDate(instant)).toBe("2026-09-10");
    expect(localMinutes(instant)).toBe(9 * 60);
  });

  it("numbers weekdays Sunday-first, matching the app", () => {
    expect(weekdayOf("2026-09-13")).toBe(0); // Sunday
    expect(weekdayOf("2026-09-12")).toBe(6); // Saturday
  });
});

describe("window expansion and overlap", () => {
  it("never emits a partial tail slot", () => {
    expect(expandWindowSlots({ start: 540, end: 570 }, 30)).toEqual([
      { start: 540, end: 570 },
    ]);
    expect(expandWindowSlots({ start: 540, end: 560 }, 30)).toEqual([]);
  });

  it("treats touching ranges as non-overlapping but shared minutes as overlapping", () => {
    expect(rangesOverlap({ start: 540, end: 570 }, { start: 570, end: 600 })).toBe(false);
    expect(rangesOverlap({ start: 540, end: 600 }, { start: 570, end: 630 })).toBe(true);
  });
});

describe("available slot computation", () => {
  const future = new Date("2026-09-01T00:00:00+03:00");

  it("expands the matching weekday window into slots", () => {
    const slots = computeAvailableSlots({
      date: "2026-09-13", // Sunday
      now: future,
      windows: [window()],
      blocked: [],
      busy: [],
    });
    expect(slots.map((slot) => slot.start)).toEqual([
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30",
    ]);
  });

  it("returns nothing for an all-day block", () => {
    expect(
      computeAvailableSlots({
        date: "2026-09-13",
        now: future,
        windows: [window()],
        blocked: [{ date: "2026-09-13", allDay: true, start: null, end: null }],
        busy: [],
      }),
    ).toEqual([]);
  });

  it("removes only the slots a partial block overlaps", () => {
    const slots = computeAvailableSlots({
      date: "2026-09-13",
      now: future,
      windows: [window()],
      blocked: [
        { date: "2026-09-13", allDay: false, start: 10 * 60, end: 11 * 60 },
      ],
      busy: [],
    });
    expect(slots.some((slot) => slot.start === "10:00")).toBe(false);
    expect(slots.some((slot) => slot.start === "10:30")).toBe(false);
    expect(slots.some((slot) => slot.start === "11:00")).toBe(true);
  });

  it("removes slots already taken by a booking", () => {
    const slots = computeAvailableSlots({
      date: "2026-09-13",
      now: future,
      windows: [window()],
      blocked: [],
      busy: [{ start: 12 * 60, end: 13 * 60 }],
    });
    expect(slots.map((slot) => slot.start)).not.toContain("12:00");
    expect(slots.map((slot) => slot.start)).not.toContain("12:30");
  });

  it("drops today's past slots but leaves future dates untouched", () => {
    const now = new Date("2026-09-13T11:15:00+03:00");
    const today = computeAvailableSlots({
      date: "2026-09-13",
      now,
      windows: [window()],
      blocked: [],
      busy: [],
    });
    expect(today.map((slot) => slot.start)).not.toContain("11:00");
    expect(today.map((slot) => slot.start)[0]).toBe("11:30");

    const tomorrow = computeAvailableSlots({
      date: "2026-09-14",
      now,
      windows: [window({ weekday: 1 })],
      blocked: [],
      busy: [],
    });
    expect(tomorrow.map((slot) => slot.start)[0]).toBe("09:00");
  });

  it("de-duplicates a slot advertised by two windows", () => {
    const slots = computeAvailableSlots({
      date: "2026-09-13",
      now: future,
      windows: [window(), window({ start: 9 * 60, end: 10 * 60 })],
      blocked: [],
      busy: [],
    });
    expect(slots.filter((slot) => slot.start === "09:00")).toHaveLength(1);
  });
});

describe("isBookableSlot", () => {
  it("accepts a published slot and rejects an unpublished one", () => {
    const base = {
      date: "2026-09-13",
      now: new Date("2026-09-01T00:00:00+03:00"),
      windows: [window()],
      blocked: [],
      busy: [],
    };
    expect(isBookableSlot({ ...base, slot: { start: 9 * 60, end: 9 * 60 + 30 } })).toBe(true);
    expect(isBookableSlot({ ...base, slot: { start: 9 * 60 + 15, end: 9 * 60 + 45 } })).toBe(false);
  });
});

describe("payload validation", () => {
  it("normalises a valid window", () => {
    const result = validateAvailabilityWindow({
      weekday: 2,
      start_time: "09:00",
      end_time: "13:00",
      slot_duration_minutes: 45,
      consultation_type: "video",
    });
    expect(result).toEqual({
      ok: true,
      window: {
        weekday: 2,
        start: 540,
        end: 780,
        slotDurationMinutes: 45,
        consultationType: "video",
      },
    });
  });

  it("rejects a reversed range and an out-of-range duration", () => {
    expect(
      validateAvailabilityWindow({ weekday: 0, start_time: "13:00", end_time: "09:00" }),
    ).toEqual({ ok: false, error: "invalid_range" });
    expect(
      validateAvailabilityWindow({
        weekday: 0,
        start_time: "09:00",
        end_time: "13:00",
        slot_duration_minutes: 2,
      }),
    ).toEqual({ ok: false, error: "invalid_duration" });
  });

  it("rejects a weekday outside the app's 0..6 numbering", () => {
    expect(
      validateAvailabilityWindow({ weekday: 7, start_time: "09:00", end_time: "13:00" }),
    ).toEqual({ ok: false, error: "invalid_weekday" });
  });

  it("rejects two overlapping windows on the same weekday", () => {
    const overlap = validateAvailabilityPayload([
      { weekday: 0, start_time: "09:00", end_time: "13:00" },
      { weekday: 0, start_time: "12:00", end_time: "15:00" },
    ]);
    expect(overlap).toEqual({ ok: false, error: "invalid_range" });

    const adjacent = validateAvailabilityPayload([
      { weekday: 0, start_time: "09:00", end_time: "13:00" },
      { weekday: 0, start_time: "13:00", end_time: "17:00" },
    ]);
    expect(adjacent.ok).toBe(true);
  });

  it("allows the same times on different weekdays", () => {
    const result = validateAvailabilityPayload([
      { weekday: 0, start_time: "09:00", end_time: "13:00" },
      { weekday: 1, start_time: "09:00", end_time: "13:00" },
    ]);
    expect(result.ok).toBe(true);
  });
});
