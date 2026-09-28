// Client-side legal calculation utilities for the Legal Tools page.
// Formulas were reverse-engineered from hassanradhi.com/en/legal_tools against
// observed outputs; figures are indicative and not a substitute for a Ministry
// of Justice quote.

export function calculateCourtFees(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount <= 500) return 30;
  if (amount <= 1000) return 31.5 + ((amount - 500) * (65.5 - 31.5)) / 500;
  if (amount <= 2000) return 65.5 + ((amount - 1000) * (118.5 - 65.5)) / 1000;
  if (amount <= 3000) return 118.5 + ((amount - 2000) * (156.5 - 118.5)) / 1000;
  if (amount <= 4000) return 156.5 + ((amount - 3000) * (175.5 - 156.5)) / 1000;
  if (amount <= 5000) return 175.5 + ((amount - 4000) * (194.5 - 175.5)) / 1000;
  return 94.5 + 0.02 * amount;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(start: Date, end: Date): number {
  const MS = 1000 * 60 * 60 * 24;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((b - a) / MS);
}

export function durationBreakdown(start: Date, end: Date): { years: number; months: number; days: number } {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prev.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export interface IndemnityBreakdown {
  years: number;
  months: number;
  days: number;
  firstThreeYears: number;
  beyondThreeYears: number;
  monthsIndemnity: number;
  daysIndemnity: number;
  total: number;
}

// Bahrain private-sector end-of-service indemnity (Law 36/2012 art 116):
//   First 3 years: 15 days per year
//   Beyond 3 years: 30 days (one month) per year
export function calculateIndemnity(salary: number, start: Date, end: Date): IndemnityBreakdown {
  const { years, months, days } = durationBreakdown(start, end);
  let firstThreeYears = 0;
  let beyondThreeYears = 0;
  let monthsIndemnity = 0;
  let daysIndemnity = 0;

  if (years >= 3) {
    firstThreeYears = salary * 0.5 * 3;
    beyondThreeYears = Math.max(0, years - 3) * salary;
    monthsIndemnity = (months / 12) * salary;
    daysIndemnity = (days / 360) * salary;
  } else {
    firstThreeYears = salary * years * 0.5;
    monthsIndemnity = (months / 12) * salary * 0.5;
    daysIndemnity = (days / 360) * salary * 0.5;
  }

  const total = firstThreeYears + beyondThreeYears + monthsIndemnity + daysIndemnity;
  return { years, months, days, firstThreeYears, beyondThreeYears, monthsIndemnity, daysIndemnity, total };
}

export interface InterestEntry {
  amountPaid: number;
  from: Date;
  to: Date;
}

export interface InterestRow {
  index: number;
  amountPaid: number;
  from: Date;
  to: Date;
  days: number;
  residualBalance: number;
  interest: number;
}

// Legal interest — matches the hassanradhi calculator: simple interest on the
// residual balance (judgment minus sum of prior payments) across each period,
// using a 360-day year.
export function calculateLegalInterest(
  judgmentAmount: number,
  interestRatePercent: number,
  entries: InterestEntry[]
): { rows: InterestRow[]; total: number } {
  const rate = interestRatePercent / 100;
  let cumulativePaid = 0;
  const rows: InterestRow[] = [];
  let total = 0;
  entries.forEach((e, i) => {
    const days = Math.max(0, daysBetween(e.from, e.to));
    const residualBalance = Math.max(0, judgmentAmount - cumulativePaid);
    const interest = residualBalance * rate * (days / 360);
    rows.push({
      index: i + 1,
      amountPaid: e.amountPaid,
      from: e.from,
      to: e.to,
      days,
      residualBalance,
      interest,
    });
    total += interest;
    cumulativePaid += e.amountPaid;
  });
  return { rows, total };
}

export function formatBD(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function formatDate(date: Date, locale: "en" | "ar" = "en"): string {
  return date.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
