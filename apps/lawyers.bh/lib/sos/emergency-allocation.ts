import "server-only";

import { sqlClient } from "@/lib/db/client";
import { buildCountryTableSet, getActiveCountry } from "@/lib/db/country-tables";
import { getBookingAllocationMode } from "@/lib/payments/allocation-policy";
import { recordPaymentAllocation } from "@/lib/payments/commission";
import { getTapMode } from "@/lib/tap/config";

export async function ensureEmergencyAllocation(input: {
  emergencyRequestId: string;
  lawyerId: string;
  countryCode: string;
  tapChargeId: string;
  grossAmount: number;
}) {
  const country = await getActiveCountry(input.countryCode);
  if (!country) throw new Error("Emergency country is not active");
  const tables = buildCountryTableSet(country);
  const rows = await sqlClient<{
    full_name_ar: string | null;
    full_name_en: string | null;
    iban_number: string | null;
    payout_ready: boolean;
    reviewed_at: Date | null;
    created_at: Date;
  }[]>`
    SELECT lawyers.full_name_ar, lawyers.full_name_en, lawyers.iban_number,
      lawyers.reviewed_at, lawyers.created_at,
      (onboarding.stage = 'active' AND onboarding.payout_enabled = true
        AND onboarding.destination_id IS NOT NULL) AS payout_ready
    FROM ${sqlClient(tables.lawyers)} lawyers
    LEFT JOIN bahrain_tap_retailer_onboarding onboarding
      ON onboarding.lawyer_id = lawyers.id
     AND onboarding.environment = ${getTapMode()}
    WHERE lawyers.id = ${input.lawyerId}::uuid
      AND lawyers.country_code = ${country.code}
    LIMIT 1
  `;
  const lawyer = rows[0];
  if (!lawyer) throw new Error("Assigned lawyer was not found");

  const mode = getBookingAllocationMode({
    assignmentMode: "lawyer",
    providerId: input.lawyerId,
    payoutReady: lawyer.payout_ready,
  });

  const common = {
    countryCode: country.code,
    request: { kind: "emergency" as const, id: input.emergencyRequestId },
    providerId: input.lawyerId,
    tapChargeId: input.tapChargeId,
    currencyCode: country.currencyCode,
    grossAmount: input.grossAmount,
    commissionRatesTable: tables.provider_commission_rates,
    paymentAllocationsTable: tables.payment_allocations,
    commissionStartsAt: lawyer.reviewed_at || lawyer.created_at,
    capturedAt: new Date(),
  };

  if (mode === "provider") {
    await recordPaymentAllocation({ ...common, mode: "provider" });
  } else {
    await recordPaymentAllocation({
      ...common,
      mode: "delayed",
      providerNameSnapshot: lawyer.full_name_ar || lawyer.full_name_en || input.lawyerId,
      providerIbanSnapshot: lawyer.iban_number?.trim() || null,
    });
  }
}
