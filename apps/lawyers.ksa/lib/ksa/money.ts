import { KSA_CURRENCY_CODE } from "./constants";

export function assertSarCurrency(value: unknown): typeof KSA_CURRENCY_CODE {
  const normalized = String(value ?? KSA_CURRENCY_CODE).trim().toUpperCase();
  if (normalized !== KSA_CURRENCY_CODE) {
    throw new Error("KSA_CURRENCY_REQUIRED");
  }
  return KSA_CURRENCY_CODE;
}

export function formatSar(amount: number, locale: "ar" | "en"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-SA", {
    style: "currency",
    currency: KSA_CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
