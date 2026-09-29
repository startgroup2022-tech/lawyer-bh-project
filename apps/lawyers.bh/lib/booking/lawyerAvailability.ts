/**
 * Pure date/time and slot maths for lawyer availability and appointment
 * booking. Everything here is side-effect free so the rules (working days,
 * blocked periods, overlap, past dates) can be tested without a database.
 *
 * Times are minutes since midnight in the country's local zone; the platform's
 * appointment zone is Asia/Bahrain.
 */

export const APPOINTMENT_ZONE = "Asia/Bahrain";

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type TimeRange = { start: number; end: number };

/** Parses `HH:MM` (or `HH:MM:SS`) into minutes since midnight, or null. */
export function parseTime(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Formats minutes since midnight as `HH:MM`. */
export function formatTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** The local calendar date (`YYYY-MM-DD`) for an instant in Asia/Bahrain. */
export function localDate(now: Date, zone = APPOINTMENT_ZONE): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Minutes since local midnight for an instant in Asia/Bahrain. */
export function localMinutes(now: Date, zone = APPOINTMENT_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  // `hour` can be "24" at midnight in some locales; normalise it.
  const hour = Number(values.hour) % 24;
  return hour * 60 + Number(values.minute);
}

/**
 * Weekday number for a calendar date: 0 = Sunday .. 6 = Saturday. This is the
 * numbering the Flutter app already renders (`AvailabilitySlot.weekdayNames`),
 * so it is the wire format too.
 */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export function isValidWeekday(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6;
}

/** True when the two half-open ranges share any minute. */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Expands a weekly window into the individual bookable slots for a day.
 * A slot fits only when it ends on or before the window end, so a 09:00-17:00
 * window with 30-minute slots yields 09:00..16:30 and never a partial tail.
 */
export function expandWindowSlots(window: TimeRange, durationMinutes: number): TimeRange[] {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];
  const slots: TimeRange[] = [];
  for (let start = window.start; start + durationMinutes <= window.end; start += durationMinutes) {
    slots.push({ start, end: start + durationMinutes });
  }
  return slots;
}

export type AvailabilityWindow = {
  weekday: number;
  start: number;
  end: number;
  slotDurationMinutes: number;
  consultationType: string;
};

export type BlockedPeriod = {
  date: string;
  allDay: boolean;
  start: number | null;
  end: number | null;
};

export type BusyPeriod = { start: number; end: number };

export type AvailableSlot = { start: string; end: string; consultationType: string };

/**
 * The real free slots for a lawyer on a date.
 *
 * A slot is removed when it overlaps a blocked period, an existing appointment,
 * or starts in the past. Past slots are only pruned for *today*; a future date
 * is unaffected by the clock.
 */
export function computeAvailableSlots(input: {
  date: string;
  now: Date;
  windows: AvailabilityWindow[];
  blocked: BlockedPeriod[];
  busy: BusyPeriod[];
  zone?: string;
}): AvailableSlot[] {
  const { date, now, windows, blocked, busy, zone = APPOINTMENT_ZONE } = input;

  const dayBlocks = blocked.filter((block) => block.date === date);
  if (dayBlocks.some((block) => block.allDay)) return [];

  const weekday = weekdayOf(date);
  const dayWindows = windows.filter((window) => window.weekday === weekday);

  const isToday = localDate(now, zone) === date;
  const nowMinutes = isToday ? localMinutes(now, zone) : -1;

  const slots: AvailableSlot[] = [];
  const seen = new Set<string>();

  for (const window of dayWindows) {
    for (const slot of expandWindowSlots(window, window.slotDurationMinutes)) {
      const key = `${slot.start}-${slot.end}`;
      if (seen.has(key)) continue;

      const blockedByRange = dayBlocks.some(
        (block) =>
          !block.allDay &&
          block.start != null &&
          block.end != null &&
          rangesOverlap(slot, { start: block.start, end: block.end }),
      );
      if (blockedByRange) continue;

      if (busy.some((period) => rangesOverlap(slot, period))) continue;

      // A slot that has already started (or starts right now) is not bookable.
      if (isToday && slot.start <= nowMinutes) continue;

      seen.add(key);
      slots.push({
        start: formatTime(slot.start),
        end: formatTime(slot.end),
        consultationType: window.consultationType,
      });
    }
  }

  return slots.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/** True when `slot` is one of the bookable slots the lawyer published for `date`. */
export function isBookableSlot(input: {
  date: string;
  slot: TimeRange;
  now: Date;
  windows: AvailabilityWindow[];
  blocked: BlockedPeriod[];
  busy: BusyPeriod[];
  zone?: string;
}): boolean {
  const available = computeAvailableSlots({
    date: input.date,
    now: input.now,
    windows: input.windows,
    blocked: input.blocked,
    busy: input.busy,
    zone: input.zone,
  });
  const start = formatTime(input.slot.start);
  const end = formatTime(input.slot.end);
  return available.some((item) => item.start === start && item.end === end);
}

export type AvailabilityWindowInput = {
  weekday: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  consultationType: string;
};

export type WindowValidationError =
  | "invalid_weekday"
  | "invalid_time"
  | "invalid_duration"
  | "invalid_range";

/** Validates one window and normalises it to minutes. */
export function validateAvailabilityWindow(
  raw: unknown,
): { ok: true; window: AvailabilityWindow } | { ok: false; error: WindowValidationError } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "invalid_weekday" };
  }
  const record = raw as Record<string, unknown>;
  const weekday = Number(record.weekday);
  if (!isValidWeekday(weekday)) return { ok: false, error: "invalid_weekday" };

  const start = parseTime(record.startTime ?? record.start_time);
  const end = parseTime(record.endTime ?? record.end_time);
  if (start == null || end == null) return { ok: false, error: "invalid_time" };
  if (start >= end) return { ok: false, error: "invalid_range" };

  const duration = Number(record.slotDurationMinutes ?? record.slot_duration_minutes ?? 30);
  if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
    return { ok: false, error: "invalid_duration" };
  }

  const consultationType = String(
    record.consultationType ?? record.consultation_type ?? "any",
  ).trim() || "any";

  return {
    ok: true,
    window: { weekday, start, end, slotDurationMinutes: duration, consultationType },
  };
}

/**
 * Validates a full weekly payload (the app PUTs the whole grid) and rejects
 * overlapping windows on the same weekday, which would otherwise let two
 * windows advertise the same slot.
 */
export function validateAvailabilityPayload(
  raw: unknown,
): { ok: true; windows: AvailabilityWindow[] } | { ok: false; error: WindowValidationError } {
  if (!Array.isArray(raw)) return { ok: false, error: "invalid_weekday" };
  if (raw.length > 7 * 8) return { ok: false, error: "invalid_range" };

  const windows: AvailabilityWindow[] = [];
  for (const item of raw) {
    const validated = validateAvailabilityWindow(item);
    if (!validated.ok) return validated;
    windows.push(validated.window);
  }

  for (let i = 0; i < windows.length; i += 1) {
    for (let j = i + 1; j < windows.length; j += 1) {
      const a = windows[i];
      const b = windows[j];
      if (a.weekday !== b.weekday) continue;
      if (a.start < b.end && b.start < a.end) {
        return { ok: false, error: "invalid_range" };
      }
    }
  }

  return { ok: true, windows };
}
