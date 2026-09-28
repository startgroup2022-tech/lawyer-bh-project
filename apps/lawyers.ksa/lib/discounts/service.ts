import { calculateDiscount, formatHalalas, type DiscountType } from "./pricing";

export type DiscountErrorCode =
  | "invalid"
  | "inactive"
  | "not_started"
  | "expired"
  | "total_limit"
  | "user_limit"
  | "zero_total";

export class DiscountError extends Error {
  constructor(public readonly code: DiscountErrorCode) {
    super(code);
    this.name = "DiscountError";
  }
}

export type DiscountRecord = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  totalUsageLimit: number | null;
  perUserUsageLimit: number | null;
};

export type DiscountQuote = {
  codeId: string;
  code: string;
  originalAmountBd: string;
  discountAmountBd: string;
  finalAmountBd: string;
};

export function evaluateDiscount(input: {
  code: DiscountRecord;
  originalFils: number;
  totalUsed: number;
  userUsed: number;
  now: Date;
}): DiscountQuote {
  const { code, now } = input;
  if (!code.isActive) throw new DiscountError("inactive");
  if (code.startsAt && now < code.startsAt) throw new DiscountError("not_started");
  if (code.endsAt && now > code.endsAt) throw new DiscountError("expired");
  if (code.totalUsageLimit !== null && input.totalUsed >= code.totalUsageLimit) {
    throw new DiscountError("total_limit");
  }
  if (code.perUserUsageLimit !== null && input.userUsed >= code.perUserUsageLimit) {
    throw new DiscountError("user_limit");
  }

  const amounts = calculateDiscount({
    originalFils: input.originalFils,
    type: code.discountType,
    value: code.discountValue,
  });
  if (amounts.finalFils === 0) throw new DiscountError("zero_total");

  return {
    codeId: code.id,
    code: code.code,
    originalAmountBd: formatHalalas(amounts.originalFils),
    discountAmountBd: formatHalalas(amounts.discountFils),
    finalAmountBd: formatHalalas(amounts.finalFils),
  };
}
