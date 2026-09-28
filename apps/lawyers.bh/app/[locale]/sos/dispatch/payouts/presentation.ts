const labels: Record<string, { ar: string; en: string }> = {
  bank_pending: { ar: "بانتظار التحويل", en: "Bank pending" },
  processing: { ar: "قيد المعالجة", en: "Processing" },
  paid_bank: { ar: "محول بنكيًا", en: "Paid by bank" },
  paid_tap: { ar: "محول عبر Tap", en: "Paid by Tap" },
  failed: { ar: "فشل التحويل", en: "Failed" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
};

export function formatBhd(value: number) { return `${value.toFixed(3)} BHD`; }
export function settlementStatusLabel(status: string, locale: string) {
  const item = labels[status];
  return item ? item[locale === "ar" ? "ar" : "en"] : status;
}
