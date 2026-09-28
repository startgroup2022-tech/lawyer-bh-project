import "server-only";

import { sqlClient } from "@/lib/db/client";
import { buildCountryTableSet, getActiveCountry } from "@/lib/db/country-tables";
import { toSqlTimestamp } from "@/lib/db/sql-timestamp";

export class SettlementError extends Error {
  constructor(public code: "invalid" | "not_found" | "conflict", message: string) {
    super(message);
  }
}

export type SettlementInput = {
  allocationId: string;
  countryCode?: string;
  method: "bank" | "tap";
  reference: string;
  transferredAt: Date;
  adminId: string;
};

export type SettledAllocation = {
  id: string;
  settlementStatus: "paid_bank" | "paid_tap";
  settlementReference: string;
  settlementTransferredAt: string;
  settlementRecordedBy: string;
};

export async function settleDelayedAllocation(input: SettlementInput): Promise<SettledAllocation> {
  const reference = input.reference.trim();
  if (!reference) throw new SettlementError("invalid", "Settlement reference is required");
  if (Number.isNaN(input.transferredAt.getTime())) {
    throw new SettlementError("invalid", "Transfer date is invalid");
  }
  if (!input.allocationId.trim() || !input.adminId.trim()) {
    throw new SettlementError("invalid", "Allocation and administrator are required");
  }

  const country = await getActiveCountry(input.countryCode ?? "BH");
  if (!country) throw new SettlementError("invalid", "Country is not active");
  const table = buildCountryTableSet(country).payment_allocations;

  const currentRows = await sqlClient<{
    id: string;
    settlement_status: string;
    provider_iban_snapshot: string | null;
  }[]>`
    SELECT id, settlement_status, provider_iban_snapshot
    FROM ${sqlClient(table)}
    WHERE id = ${input.allocationId}::uuid
      AND split_mode = 'delayed'
    LIMIT 1
  `;
  const current = currentRows[0];
  if (!current) throw new SettlementError("not_found", "Delayed allocation was not found");
  if (input.method === "bank" && !current.provider_iban_snapshot?.trim()) {
    throw new SettlementError("invalid", "IBAN is required for bank settlement");
  }

  const paidStatus = input.method === "bank" ? "paid_bank" : "paid_tap";
  const rows = await sqlClient<{
    id: string;
    settlement_status: "paid_bank" | "paid_tap";
    settlement_reference: string;
    settlement_transferred_at: Date | string;
    settlement_recorded_by: string;
  }[]>`
    UPDATE ${sqlClient(table)}
    SET settlement_status = ${paidStatus},
        settlement_method = ${input.method},
        settlement_reference = ${reference},
        settlement_transferred_at = ${toSqlTimestamp(input.transferredAt)}::timestamptz,
        settlement_recorded_at = NOW(),
        settlement_recorded_by = ${input.adminId}::uuid,
        payout_status = 'paid',
        paid_out_at = NOW(),
        updated_at = NOW()
    WHERE id = ${input.allocationId}::uuid
      AND split_mode = 'delayed'
      AND settlement_status IN ('bank_pending', 'failed')
    RETURNING id, settlement_status, settlement_reference,
      settlement_transferred_at, settlement_recorded_by
  `;
  const settled = rows[0];
  if (!settled) throw new SettlementError("conflict", "Allocation was already settled or changed");

  return {
    id: settled.id,
    settlementStatus: settled.settlement_status,
    settlementReference: settled.settlement_reference,
    settlementTransferredAt:
      settled.settlement_transferred_at instanceof Date
        ? settled.settlement_transferred_at.toISOString()
        : String(settled.settlement_transferred_at),
    settlementRecordedBy: settled.settlement_recorded_by,
  };
}
