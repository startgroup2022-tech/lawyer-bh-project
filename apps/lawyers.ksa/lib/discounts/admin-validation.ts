import { normalizeDiscountCode } from "./pricing";

export type DiscountPayload = {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  totalUsageLimit: number | null;
  perUserUsageLimit: number | null;
};

export function parseDiscountPayload(value: unknown): DiscountPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_payload");
  const data = value as Record<string, unknown>;
  const code = normalizeDiscountCode(data.code);
  const discountType: "fixed" | "percentage" | null = data.discountType === "fixed" ? "fixed" : data.discountType === "percentage" ? "percentage" : null;
  const discountValue = String(data.discountValue ?? "").trim();
  const numericValue = Number(discountValue);
  const startsAt = data.startsAt ? new Date(String(data.startsAt)) : null;
  const endsAt = data.endsAt ? new Date(String(data.endsAt)) : null;
  const totalUsageLimit = data.totalUsageLimit === null || data.totalUsageLimit === "" || data.totalUsageLimit === undefined ? null : Number(data.totalUsageLimit);
  const perUserUsageLimit = data.perUserUsageLimit === null || data.perUserUsageLimit === "" || data.perUserUsageLimit === undefined ? null : Number(data.perUserUsageLimit);
  if (!code || !discountType || !Number.isFinite(numericValue) || numericValue <= 0 || (discountType === "percentage" && numericValue > 100)) throw new Error("invalid_discount");
  if ((startsAt && Number.isNaN(startsAt.valueOf())) || (endsAt && Number.isNaN(endsAt.valueOf())) || (startsAt && endsAt && endsAt <= startsAt)) throw new Error("invalid_window");
  if ((totalUsageLimit !== null && (!Number.isInteger(totalUsageLimit) || totalUsageLimit <= 0)) || (perUserUsageLimit !== null && (!Number.isInteger(perUserUsageLimit) || perUserUsageLimit <= 0))) throw new Error("invalid_limit");
  return { code, discountType, discountValue, isActive: data.isActive !== false, startsAt, endsAt, totalUsageLimit, perUserUsageLimit };
}
