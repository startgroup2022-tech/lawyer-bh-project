import { publicBalanceStatus, type ProviderBalancePublicStatus } from "./provider-balances";

export type ProviderBalancePublicSource = {
  publicReference: string;
  providerNameAr: string;
  providerNameEn: string;
  customerName: string;
  description: string;
  amount: string;
  currencyCode: string;
  dueDate: string | null;
  status: string;
  paidAt: Date | string | null;
};

export type PublicProviderBalance = {
  reference: string;
  providerName: string;
  customerName: string;
  description: string;
  amount: string;
  currencyCode: string;
  dueDate: string | null;
  status: ProviderBalancePublicStatus;
  paidAt: string | null;
};

export function toPublicProviderBalance(
  row: ProviderBalancePublicSource,
  locale: "ar" | "en",
  now = new Date(),
): PublicProviderBalance {
  return {
    reference: row.publicReference,
    providerName: locale === "ar" ? row.providerNameAr : row.providerNameEn,
    customerName: row.customerName,
    description: row.description,
    amount: row.amount,
    currencyCode: row.currencyCode,
    dueDate: row.dueDate,
    status: publicBalanceStatus(row.status, row.dueDate, now),
    paidAt: row.paidAt instanceof Date ? row.paidAt.toISOString() : row.paidAt,
  };
}
