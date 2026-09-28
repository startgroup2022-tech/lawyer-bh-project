export type DiscountPresentationRow = {
  id: string;
  code: string;
  isActive: boolean;
  startsAt: string | Date | null;
  endsAt: string | Date | null;
  redeemedCount: number;
};

export type DiscountStatus = "active" | "scheduled" | "expired" | "disabled";
export type DiscountFilter = "all" | DiscountStatus;

export function getDiscountStatus(row: DiscountPresentationRow, now = new Date()): DiscountStatus {
  if (!row.isActive) return "disabled";
  if (row.startsAt && new Date(row.startsAt) > now) return "scheduled";
  if (row.endsAt && new Date(row.endsAt) < now) return "expired";
  return "active";
}

export function filterDiscountCodes<T extends DiscountPresentationRow>(rows: T[], query: string, status: DiscountFilter, now = new Date()): T[] {
  const normalizedQuery = query.trim().toUpperCase();
  return rows.filter((row) => (!normalizedQuery || row.code.includes(normalizedQuery)) && (status === "all" || getDiscountStatus(row, now) === status));
}

export function summarizeDiscountCodes(rows: DiscountPresentationRow[], now = new Date()) {
  let active = 0;
  let expired = 0;
  let redeemed = 0;
  for (const row of rows) {
    const status = getDiscountStatus(row, now);
    if (status === "active") active += 1;
    if (status === "expired") expired += 1;
    redeemed += Number(row.redeemedCount) || 0;
  }
  return { total: rows.length, active, expired, redeemed };
}
