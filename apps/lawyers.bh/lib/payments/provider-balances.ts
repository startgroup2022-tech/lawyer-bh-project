export type ProviderBalanceStatus = "draft" | "pending_payment" | "paid" | "expired" | "cancelled";
export type ProviderBalancePublicStatus = ProviderBalanceStatus;

function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export function normalizeTapCustomerPhone(phone: string, dialCode: string) {
  const countryCode = toEnglishDigits(dialCode).replace(/\D/g, "");
  const digits = toEnglishDigits(phone).replace(/\D/g, "");
  const number = countryCode && digits.startsWith(countryCode)
    ? digits.slice(countryCode.length)
    : digits;

  return countryCode && number ? { countryCode, number } : null;
}

export function publicBalanceStatus(
  status: string,
  dueDate: string | null,
  now = new Date(),
): ProviderBalancePublicStatus {
  if (status === "paid" || status === "cancelled") return status;
  const today = now.toISOString().slice(0, 10);
  if (dueDate && dueDate < today) return "expired";
  if (status === "draft" || status === "expired") return status;
  return "pending_payment";
}

export function canDownloadProviderBalanceReceipt(status: string, tapStatus: string | null) {
  return status === "paid" && tapStatus === "CAPTURED";
}

export function validateProviderBalanceDraft(input: Record<string, unknown>) {
  const customerName = String(input.customerName ?? "").trim().slice(0, 180);
  const customerPhone = String(input.customerPhone ?? "").trim().slice(0, 40);
  const customerEmail = String(input.customerEmail ?? "").trim().toLowerCase().slice(0, 180);
  const description = String(input.description ?? "").trim().slice(0, 1000);
  const amountText = String(input.amount ?? "").trim();
  const dueDate = String(input.dueDate ?? "").trim().slice(0, 10);
  if (!customerName || !customerPhone || !description) return { ok: false as const, code: "BALANCE_REQUIRED_FIELDS" as const };
  if (customerEmail && !/^\S+@\S+\.\S+$/.test(customerEmail)) return { ok: false as const, code: "BALANCE_EMAIL_INVALID" as const };
  if (!/^\d+(?:\.\d{1,3})?$/.test(amountText)) return { ok: false as const, code: "BALANCE_AMOUNT_INVALID" as const };
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 999999.999) return { ok: false as const, code: "BALANCE_AMOUNT_INVALID" as const };
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false as const, code: "BALANCE_DUE_DATE_INVALID" as const };
  return { ok: true as const, value: { customerName, customerPhone, customerEmail: customerEmail || null, description, amount: amount.toFixed(3), dueDate: dueDate || null } };
}

export function canCreateProviderBalanceLink(status: string) {
  return status === "draft" || status === "expired";
}

export function canCancelProviderBalance(status: string) {
  return status === "draft" || status === "pending_payment" || status === "expired";
}
