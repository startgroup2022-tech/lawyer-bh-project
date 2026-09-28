import { setRequestLocale } from "next-intl/server";

import { sqlClient } from "@/lib/db/client";
import PayoutsView from "./PayoutsView";

export const dynamic = "force-dynamic";

type PayableRow = {
  id: string;
  provider_id: string | null;
  provider_name_snapshot: string | null;
  provider_iban_snapshot: string | null;
  booking_request_id: string | null;
  emergency_request_id: string | null;
  gross_amount: string;
  platform_percentage: string;
  provider_percentage: string;
  platform_amount: string;
  provider_amount: string;
  captured_at: Date | string;
  settlement_status: string;
  settlement_method: string | null;
  settlement_reference: string | null;
  settlement_transferred_at: Date | string | null;
};

export default async function PayoutsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const rows = await sqlClient<PayableRow[]>`
    SELECT id, provider_id, provider_name_snapshot, provider_iban_snapshot,
      booking_request_id, emergency_request_id, gross_amount,
      platform_percentage, provider_percentage, platform_amount, provider_amount,
      captured_at, settlement_status, settlement_method, settlement_reference,
      settlement_transferred_at
    FROM public.bahrain_payment_allocations
    WHERE split_mode = 'delayed'
    ORDER BY captured_at DESC
  `;

  const payables = rows.map((row) => ({
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name_snapshot || row.provider_id || "-",
    iban: row.provider_iban_snapshot,
    requestType: row.emergency_request_id ? "emergency" as const : "booking" as const,
    requestId: row.emergency_request_id || row.booking_request_id || "-",
    grossAmount: Number(row.gross_amount),
    platformPercentage: Number(row.platform_percentage),
    providerPercentage: Number(row.provider_percentage),
    platformAmount: Number(row.platform_amount),
    providerAmount: Number(row.provider_amount),
    capturedAt: new Date(row.captured_at).toISOString(),
    settlementStatus: row.settlement_status,
    settlementMethod: row.settlement_method,
    settlementReference: row.settlement_reference,
    settlementTransferredAt: row.settlement_transferred_at
      ? new Date(row.settlement_transferred_at).toISOString()
      : null,
  }));

  const totals = payables.reduce((sum, item) => ({
    gross: sum.gross + item.grossAmount,
    platform: sum.platform + item.platformAmount,
    provider: sum.provider + item.providerAmount,
    pending: sum.pending + (["bank_pending", "failed", "processing"].includes(item.settlementStatus) ? item.providerAmount : 0),
  }), { gross: 0, platform: 0, provider: 0, pending: 0 });

  return <PayoutsView locale={locale} payables={payables} totals={totals} />;
}
