export type DiscountType = "percentage" | "fixed";

export type DiscountAmounts = {
  originalFils: number;
  discountFils: number;
  finalFils: number;
};

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const BHD_PATTERN = /^(?:0|[1-9]\d*)(?:\.(\d{1,3}))?$/;

export function normalizeDiscountCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function parseBhdToFils(value: string | number): number {
  const normalized = String(value).trim();
  const match = BHD_PATTERN.exec(normalized);
  if (!match) throw new Error("invalid_bhd_amount");
  const [whole, fraction = ""] = normalized.split(".");
  const fils = Number(whole) * 1000 + Number(fraction.padEnd(3, "0") || "0");
  if (!Number.isSafeInteger(fils)) throw new Error("invalid_bhd_amount");
  return fils;
}

export function formatFils(fils: number): string {
  if (!Number.isSafeInteger(fils) || fils < 0) throw new Error("invalid_fils_amount");
  return `${Math.floor(fils / 1000)}.${String(fils % 1000).padStart(3, "0")}`;
}

export function calculateDiscount(input: {
  originalFils: number;
  type: DiscountType;
  value: string;
}): DiscountAmounts {
  if (!Number.isSafeInteger(input.originalFils) || input.originalFils <= 0) {
    throw new Error("invalid_original_amount");
  }

  let requestedDiscount: number;
  if (input.type === "fixed") {
    requestedDiscount = parseBhdToFils(input.value);
  } else {
    const percentage = Number(input.value);
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      throw new Error("invalid_percentage");
    }
    requestedDiscount = Math.round((input.originalFils * percentage) / 100);
  }

  if (requestedDiscount <= 0) throw new Error("invalid_discount_value");
  const discountFils = Math.min(input.originalFils, requestedDiscount);
  return {
    originalFils: input.originalFils,
    discountFils,
    finalFils: input.originalFils - discountFils,
  };
}
