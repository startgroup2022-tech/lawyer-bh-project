import { toArabicDigits } from "./formatUtils";

export function formatTime12Hour(time: string, isAr: boolean) {
  const cleanTime = time.trim();
  const [hourPart, minutePart = "00"] = cleanTime.split(":");

  const hour24 = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return cleanTime;
  }

  const period = hour24 >= 12 ? (isAr ? "م" : "PM") : isAr ? "ص" : "AM";
  const hour12 = hour24 % 12 || 12;
  const formatted = `${hour12}:${String(minute).padStart(2, "0")} ${period}`;

  return isAr ? toArabicDigits(formatted) : formatted;
}

export function formatTimeRange12Hour(value: string | null | undefined, isAr: boolean) {
  if (!value) return "--";

  const normalized = value
    .replace("–", "-")
    .replace("—", "-")
    .replace(/\s+/g, "");

  const [start, end] = normalized.split("-");

  if (!start || !end) return value;

  return `${formatTime12Hour(start, isAr)} - ${formatTime12Hour(end, isAr)}`;
}

export function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function isWeekend(date: Date) {
  const day = date.getDay();
  return day === 5 || day === 6;
}

export function isAfterDayCutoff(now: Date) {
  const cutoff = new Date(now);
  cutoff.setHours(16, 30, 0, 0);
  return now >= cutoff;
}

export function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function addDays(date: Date, days: number) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getAllowedBookingDates(now: Date) {
  const allowed: Date[] = [];
  let cursor = startOfDay(now);

  if (!isAfterDayCutoff(now) && !isWeekend(cursor)) {
    allowed.push(new Date(cursor));
  }

  cursor = addDays(cursor, 1);

  while (allowed.length < 3) {
    if (!isWeekend(cursor)) allowed.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }

  return allowed;
}

function parseTimeOnDate(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute = 0] = time.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const date = new Date();
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function getTimePeriodEnd(value: string, dateKey: string) {
  const normalized = value.replace("–", "-").replace("—", "-").replace(/\s+/g, "");
  const [, end] = normalized.split("-");
  return end ? parseTimeOnDate(dateKey, end) : null;
}

export function isTimePeriodAvailableForDate(value: string, dateKey: string, now: Date) {
  if (dateKey !== formatDateKey(now)) return true;

  const endDate = getTimePeriodEnd(value, dateKey);
  if (!endDate) return true;

  const hideAt = new Date(endDate.getTime() - 30 * 60 * 1000);
  return now < hideAt;
}
