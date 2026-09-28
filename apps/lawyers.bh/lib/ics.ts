import { randomBytes } from "node:crypto";

export interface IcsInput {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
  url?: string;
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcs({
  uid,
  title,
  description,
  location,
  start,
  end,
  organizer,
  attendee,
  url,
}: IcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lawyers.bh//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@lawyers.bh`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `LOCATION:${escapeIcs(location)}`,
    `ORGANIZER;CN=${escapeIcs(organizer.name)}:MAILTO:${organizer.email}`,
    `ATTENDEE;CN=${escapeIcs(attendee.name)};RSVP=FALSE:MAILTO:${attendee.email}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "TRANSP:OPAQUE",
  ];
  if (url) lines.push(`URL:${url}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

const BAHRAIN_UTC_OFFSET_HOURS = 3;

export function bahrainLocalToUtc(dateStr: string, timeStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) return null;
  const utcMs = Date.UTC(y, m - 1, d, hh, mm) - BAHRAIN_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  const result = new Date(utcMs);
  if (Number.isNaN(result.getTime())) return null;
  return result;
}

export function generateBookingId(): string {
  return "LBH-" + randomBytes(3).toString("hex").toUpperCase();
}

export function generateVideoRoomName(bookingId: string): string {
  const suffix = randomBytes(8).toString("hex");
  return `LawyersBH-${bookingId}-${suffix}`;
}
