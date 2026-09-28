export type BalanceForCapture = {
  id: string;
  tapChargeId: string | null;
  amount: string | number;
  currencyCode: string;
  status: string;
};

export type ChargeForBalanceCapture = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, string>;
};

export function validateProviderBalanceCapture(
  balance: BalanceForCapture,
  charge: ChargeForBalanceCapture,
): { ok: true; alreadyPaid: boolean } | { ok: false; code: string } {
  if (balance.status === "paid") return { ok: true, alreadyPaid: true };
  if (charge.status !== "CAPTURED") return { ok: false, code: "CHARGE_NOT_CAPTURED" };
  if (!balance.tapChargeId || balance.tapChargeId !== charge.id) return { ok: false, code: "CHARGE_MISMATCH" };
  if (charge.metadata?.provider_balance_id !== balance.id) return { ok: false, code: "BALANCE_MISMATCH" };
  if (charge.currency.toUpperCase() !== balance.currencyCode.toUpperCase()) return { ok: false, code: "CURRENCY_MISMATCH" };
  if (Math.round(charge.amount * 1000) !== Math.round(Number(balance.amount) * 1000)) return { ok: false, code: "AMOUNT_MISMATCH" };
  return { ok: true, alreadyPaid: false };
}
