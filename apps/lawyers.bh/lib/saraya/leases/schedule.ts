import type { LeaseTerms, RentScheduleItem } from "./contracts";
import { LeaseError } from "./contracts";

const DAY_MS = 86_400_000;
const moneyPattern = /^\d{1,11}(?:\.\d{1,3})?$/;
const parseMoney = (value: string) => {
  if (!moneyPattern.test(value)) throw new LeaseError("INVALID_MONEY");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, "0"));
};
const iso = (date: Date) => date.toISOString().slice(0, 10);
const parseDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new LeaseError("INVALID_DATE");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || iso(date) !== value) throw new LeaseError("INVALID_DATE");
  return date;
};
const addDays = (date: Date, days: number) => new Date(date.valueOf() + days * DAY_MS);
const daysInclusive = (start: Date, end: Date) => Math.round((end.valueOf() - start.valueOf()) / DAY_MS) + 1;
const endOfMonth = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
const periodBounds = (date: Date, frequency: LeaseTerms["frequency"]) => {
  const year = date.getUTCFullYear(), month = date.getUTCMonth();
  if (frequency === "monthly") return [new Date(Date.UTC(year, month, 1)), endOfMonth(date)] as const;
  if (frequency === "quarterly") {
    const firstMonth = Math.floor(month / 3) * 3;
    return [new Date(Date.UTC(year, firstMonth, 1)), new Date(Date.UTC(year, firstMonth + 3, 0))] as const;
  }
  return [new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year, 11, 31))] as const;
};
const dueDate = (periodStart: Date, day: number) => new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), Math.min(day, endOfMonth(periodStart).getUTCDate())));
const prorate = (amount: bigint, occupied: number, full: number) => (amount * BigInt(occupied) + BigInt(Math.floor(full / 2))) / BigInt(full);

export function buildRentSchedule(terms: LeaseTerms): RentScheduleItem[] {
  const start = parseDate(terms.startDate), end = parseDate(terms.endDate);
  if (end < start) throw new LeaseError("INVALID_DATE_RANGE");
  if (!(["monthly", "quarterly", "annual"] as const).includes(terms.frequency)) throw new LeaseError("INVALID_FREQUENCY");
  if (!Number.isInteger(terms.dueDay) || terms.dueDay < 1 || terms.dueDay > 31) throw new LeaseError("INVALID_DUE_DAY");
  if (!Number.isInteger(terms.graceDays) || terms.graceDays < 0 || terms.graceDays > 365) throw new LeaseError("INVALID_GRACE_DAYS");
  const rent = parseMoney(terms.rentAmount), deposit = parseMoney(terms.depositAmount), discount = parseMoney(terms.discountAmount), fee = parseMoney(terms.feeAmount);
  if (rent === BigInt(0)) throw new LeaseError("INVALID_MONEY");
  if (deposit < BigInt(0)) throw new LeaseError("INVALID_MONEY");
  const result: RentScheduleItem[] = [];
  let cursor = start;
  while (cursor <= end) {
    const [fullStart, fullEnd] = periodBounds(cursor, terms.frequency);
    const periodEnd = fullEnd < end ? fullEnd : end;
    const base = prorate(rent, daysInclusive(cursor, periodEnd), daysInclusive(fullStart, fullEnd));
    const total = base - discount + fee;
    if (total < BigInt(0)) throw new LeaseError("NEGATIVE_INSTALLMENT");
    const candidateDue = dueDate(cursor, terms.dueDay);
    const due = candidateDue < cursor ? cursor : candidateDue;
    result.push({ sequence: result.length + 1, periodStart: iso(cursor), periodEnd: iso(periodEnd), dueDate: iso(due), graceUntil: iso(addDays(due, terms.graceDays)), baseMinor: String(base), discountMinor: String(discount), feeMinor: String(fee), totalMinor: String(total) });
    cursor = addDays(periodEnd, 1);
  }
  return result;
}
