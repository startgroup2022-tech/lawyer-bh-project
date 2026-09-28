import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { AdvocateShiftRow } from "@/lib/db/schema";

/** Returns true when `nowMinute` falls inside `[start, end)` on the
 *  shift's day, accounting for shifts that wrap past midnight (e.g.
 *  22:00–02:00 covers 22:00 of `dayOfWeek` AND 00:00–02:00 of the
 *  next day). All times are minute-of-UTC-day. */
export function isMinuteInsideShift(
  nowDay: number,
  nowMinute: number,
  shift: { dayOfWeek: number; startMinuteUtc: number; endMinuteUtc: number },
): boolean {
  const wraps = shift.endMinuteUtc <= shift.startMinuteUtc;
  if (!wraps) {
    return (
      nowDay === shift.dayOfWeek &&
      nowMinute >= shift.startMinuteUtc &&
      nowMinute < shift.endMinuteUtc
    );
  }
  // Overnight: pre-midnight portion belongs to dayOfWeek, post-midnight
  // portion belongs to the next day.
  const sameDayCovered =
    nowDay === shift.dayOfWeek && nowMinute >= shift.startMinuteUtc;
  const nextDay = (shift.dayOfWeek + 1) % 7;
  const nextDayCovered =
    nowDay === nextDay && nowMinute < shift.endMinuteUtc;
  return sameDayCovered || nextDayCovered;
}

/** Returns the IDs of advocates who are on-shift right now. Caller
 *  combines this with the Saudi lawyer emergency-ready flag to
 *  decide who's available — an advocate is matchable if EITHER
 *  condition holds. */
export async function getOnShiftAdvocateIds(
  countryCode = "SA",
  now: Date = new Date(),
): Promise<Set<string>> {
  const day = now.getUTCDay();
  const minute = now.getUTCHours() * 60 + now.getUTCMinutes();

  const shifts = await db
    .select({
      advocateId: schema.advocateShifts.advocateId,
      dayOfWeek: schema.advocateShifts.dayOfWeek,
      startMinuteUtc: schema.advocateShifts.startMinuteUtc,
      endMinuteUtc: schema.advocateShifts.endMinuteUtc,
    })
    .from(schema.advocateShifts)
    .where(
      and(
        eq(schema.advocateShifts.countryCode, countryCode),
        eq(schema.advocateShifts.isActive, true),
      ),
    );

  const out = new Set<string>();
  for (const s of shifts) {
    if (isMinuteInsideShift(day, minute, s)) out.add(s.advocateId);
  }
  return out;
}

/** Loads every shift for a given advocate ordered by day + start. */
export async function listAdvocateShifts(
  advocateId: string,
  countryCode?: string,
): Promise<AdvocateShiftRow[]> {
  const rows = await db
    .select()
    .from(schema.advocateShifts)
    .where(
      countryCode
        ? and(
            eq(schema.advocateShifts.advocateId, advocateId),
            eq(schema.advocateShifts.countryCode, countryCode),
          )
        : eq(schema.advocateShifts.advocateId, advocateId),
    );
  rows.sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek || a.startMinuteUtc - b.startMinuteUtc,
  );
  return rows;
}
