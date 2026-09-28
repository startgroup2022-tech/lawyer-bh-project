export type DiscountType = "percentage" | "fixed";

export type DiscountAmounts = {
  originalFils: number;
  discountFils: number;
  finalFils: number;
};

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;
const SAR_PATTERN = /^(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/;

export function normalizeDiscountCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

export function parseSarToHalalas(value: string | number): number {
  const normalized = String(value).trim();
  const match = SAR_PATTERN.exec(normalized);
  if (!match) throw new Error("invalid_sar_amount");
  const [whole, fraction = ""] = normalized.split(".");
  const halalas = Number(whole) * 100 + Number(fraction.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(halalas)) throw new Error("invalid_sar_amount");
  return halalas;
}

export function formatHalalas(halalas: number): string {
  if (!Number.isSafeInteger(halalas) || halalas < 0) throw new Error("invalid_halala_amount");
  return `${Math.floor(halalas / 100)}.${String(halalas % 100).padStart(2, "0")}`;
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
    requestedDiscount = parseSarToHalalas(input.value);
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
