import { sqlClient } from "@/lib/db/client";

export type LawyerWithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export type LawyerEarningAllocation = {
  id: string;
  amount: number;
  currency: string;
  capturedAt: Date;
  payoutStatus: string;
  settlementStatus: string;
  withdrawalStatus: LawyerWithdrawalStatus | null;
  requestReference: string;
  serviceAr: string;
  serviceEn: string;
  customerName: string;
};

export type LawyerEarningsSummary = {
  available: number;
  pendingWithdrawal: number;
  paidOut: number;
  lifetime: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  currency: string;
  transactions: LawyerEarningAllocation[];
};

const amount3 = (value: number) => Number(value.toFixed(3));

export function hasValidWithdrawalIban(value: string | null | undefined): boolean {
  const normalized = value?.replace(/\s+/g, "").toUpperCase() ?? "";
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(normalized)) return false;

  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
  let remainder = 0;
  for (const character of rearranged) {
    const digits = character >= "A"
      ? String(character.charCodeAt(0) - 55)
      : character;
    for (const digit of digits) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function startOfUtcWeek(value: Date): Date {
  const day = startOfUtcDay(value);
  const daysSinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - daysSinceMonday);
  return day;
}

function startOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

export function summarizeLawyerEarnings(
  allocations: readonly LawyerEarningAllocation[],
  now = new Date(),
): LawyerEarningsSummary {
  const eligible = allocations.filter(
    (row) =>
      Number.isFinite(row.amount) &&
      row.amount > 0 &&
      row.settlementStatus !== "not_applicable",
  );
  const day = startOfUtcDay(now).getTime();
  const week = startOfUtcWeek(now).getTime();
  const month = startOfUtcMonth(now).getTime();
  const sum = (rows: readonly LawyerEarningAllocation[]) =>
    amount3(rows.reduce((total, row) => total + row.amount, 0));

  return {
    available: sum(eligible.filter((row) => row.payoutStatus !== "paid" && (row.withdrawalStatus == null || row.withdrawalStatus === "rejected"))),
    pendingWithdrawal: sum(eligible.filter((row) => row.payoutStatus !== "paid" && (row.withdrawalStatus === "pending" || row.withdrawalStatus === "approved"))),
    paidOut: sum(eligible.filter((row) => row.withdrawalStatus === "paid" || row.payoutStatus === "paid")),
    lifetime: sum(eligible),
    today: sum(eligible.filter((row) => row.capturedAt.getTime() >= day)),
    thisWeek: sum(eligible.filter((row) => row.capturedAt.getTime() >= week)),
    thisMonth: sum(eligible.filter((row) => row.capturedAt.getTime() >= month)),
    currency: eligible[0]?.currency ?? "BHD",
    transactions: [...eligible].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime()),
  };
}

export function allowedWithdrawalTransition(
  from: LawyerWithdrawalStatus,
  to: LawyerWithdrawalStatus,
): boolean {
  return (
    (from === "pending" && (to === "approved" || to === "rejected")) ||
    (from === "approved" && (to === "paid" || to === "rejected"))
  );
}

type AllocationRow = {
  id: string;
  provider_amount: string | number;
  currency_code: string;
  captured_at: Date | string;
  payout_status: string;
  settlement_status: string;
  withdrawal_status: LawyerWithdrawalStatus | null;
  request_reference: string | null;
  service_ar: string | null;
  service_en: string | null;
  customer_name: string | null;
};

function mapAllocation(row: AllocationRow): LawyerEarningAllocation {
  return {
    id: row.id,
    amount: Number(row.provider_amount),
    currency: row.currency_code,
    capturedAt: row.captured_at instanceof Date ? row.captured_at : new Date(row.captured_at),
    payoutStatus: row.payout_status,
    settlementStatus: row.settlement_status,
    withdrawalStatus: row.withdrawal_status,
    requestReference: row.request_reference ?? "",
    serviceAr: row.service_ar ?? "",
    serviceEn: row.service_en ?? "",
    customerName: row.customer_name ?? "",
  };
}

export async function getLawyerEarnings(
  lawyerId: string,
  countryCode: string,
): Promise<LawyerEarningsSummary> {
  const rows = await sqlClient<AllocationRow[]>`
    SELECT allocation.id, allocation.provider_amount, allocation.currency_code,
      allocation.captured_at, allocation.payout_status, allocation.settlement_status,
      withdrawal.status AS withdrawal_status,
      COALESCE(emergency.case_ref, booking.id::text) AS request_reference,
      COALESCE(booking.service, emergency.description, emergency.case_type::text) AS service_ar,
      COALESCE(booking.service, emergency.description, emergency.case_type::text) AS service_en,
      COALESCE(booking.customer_name, emergency.contact_name) AS customer_name
    FROM public.bahrain_payment_allocations allocation
    LEFT JOIN public.lawyer_withdrawal_allocations reserved
      ON reserved.allocation_id = allocation.id
    LEFT JOIN public.lawyer_withdrawal_requests withdrawal
      ON withdrawal.id = reserved.withdrawal_id
    LEFT JOIN public.bahrain_booking_requests booking
      ON booking.id = allocation.booking_request_id
    LEFT JOIN public.bahrain_emergency_requests emergency
      ON emergency.id = allocation.emergency_request_id
    WHERE allocation.provider_id = ${lawyerId}::uuid
      AND allocation.country_code = ${countryCode.trim().toUpperCase()}
      AND allocation.provider_amount > 0
      AND allocation.settlement_status <> 'not_applicable'
    ORDER BY allocation.captured_at DESC
  `;
  return summarizeLawyerEarnings(rows.map(mapAllocation));
}

export class LawyerWithdrawalError extends Error {
  constructor(public readonly code: "no_available_balance" | "missing_iban" | "conflict" | "not_found" | "invalid_transition") {
    super(code);
  }
}

export async function listLawyerWithdrawals(status?: LawyerWithdrawalStatus) {
  return sqlClient<Array<{
    id: string;
    lawyer_id: string;
    lawyer_name: string | null;
    lawyer_phone: string | null;
    country_code: string;
    amount: string | number;
    currency_code: string;
    status: LawyerWithdrawalStatus;
    requested_at: Date | string;
    reviewed_at: Date | string | null;
    paid_at: Date | string | null;
    settlement_reference: string | null;
  }>>`
    SELECT withdrawal.id, withdrawal.lawyer_id,
      COALESCE(NULLIF(lawyer.full_name_ar, ''), lawyer.full_name_en) AS lawyer_name,
      lawyer.phone AS lawyer_phone,
      withdrawal.country_code, withdrawal.amount, withdrawal.currency_code,
      withdrawal.status, withdrawal.requested_at, withdrawal.reviewed_at,
      withdrawal.paid_at, withdrawal.settlement_reference
    FROM public.lawyer_withdrawal_requests withdrawal
    LEFT JOIN public.bahrain_lawyers lawyer ON lawyer.id = withdrawal.lawyer_id
    WHERE (${status ?? null}::text IS NULL OR withdrawal.status = ${status ?? null})
    ORDER BY CASE withdrawal.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
      withdrawal.requested_at ASC
  `;
}

export async function createLawyerWithdrawal(lawyerId: string, countryCode: string) {
  const normalizedCountry = countryCode.trim().toUpperCase();
  return sqlClient.begin(async (transaction) => {
    const lawyerRows = await transaction<Array<{ iban_number: string | null }>>`
      SELECT iban_number
      FROM public.bahrain_lawyers
      WHERE id = ${lawyerId}::uuid
        AND country_code = ${normalizedCountry}
      FOR UPDATE
    `;
    const lawyer = lawyerRows[0];
    if (!lawyer) throw new LawyerWithdrawalError("not_found");
    if (!hasValidWithdrawalIban(lawyer.iban_number)) {
      throw new LawyerWithdrawalError("missing_iban");
    }

    const allocations = await transaction<Array<{ id: string; provider_amount: string | number; currency_code: string }>>`
      SELECT allocation.id, allocation.provider_amount, allocation.currency_code
      FROM public.bahrain_payment_allocations allocation
      LEFT JOIN public.lawyer_withdrawal_allocations reserved
        ON reserved.allocation_id = allocation.id
      LEFT JOIN public.lawyer_withdrawal_requests withdrawal
        ON withdrawal.id = reserved.withdrawal_id AND withdrawal.status <> 'rejected'
      WHERE allocation.provider_id = ${lawyerId}::uuid
        AND allocation.country_code = ${normalizedCountry}
        AND allocation.provider_amount > 0
        AND allocation.payout_status <> 'paid'
        AND allocation.settlement_status IN ('bank_pending', 'failed')
        AND withdrawal.id IS NULL
      FOR UPDATE OF allocation
    `;
    const amount = amount3(allocations.reduce((total, row) => total + Number(row.provider_amount), 0));
    if (amount <= 0) throw new LawyerWithdrawalError("no_available_balance");
    const currency = allocations[0]?.currency_code ?? "BHD";
    const created = await transaction<Array<{ id: string; status: LawyerWithdrawalStatus; amount: string | number; currency_code: string; requested_at: Date | string }>>`
      INSERT INTO public.lawyer_withdrawal_requests
        (lawyer_id, country_code, amount, currency_code, status)
      VALUES (${lawyerId}::uuid, ${normalizedCountry}, ${amount.toFixed(3)}, ${currency}, 'pending')
      RETURNING id, status, amount, currency_code, requested_at
    `;
    const withdrawal = created[0];
    if (!withdrawal) throw new LawyerWithdrawalError("conflict");
    for (const allocation of allocations) {
      await transaction`
        INSERT INTO public.lawyer_withdrawal_allocations (withdrawal_id, allocation_id)
        VALUES (${withdrawal.id}::uuid, ${allocation.id}::uuid)
      `;
    }
    return { ...withdrawal, amount: Number(withdrawal.amount) };
  });
}

export async function transitionLawyerWithdrawal(input: {
  withdrawalId: string;
  action: Exclude<LawyerWithdrawalStatus, "pending">;
  adminId: string;
  settlementReference?: string;
}) {
  return sqlClient.begin(async (transaction) => {
    const currentRows = await transaction<Array<{
      id: string;
      status: LawyerWithdrawalStatus;
      amount: string | number;
      currency_code: string;
    }>>`
      SELECT id, status, amount, currency_code
      FROM public.lawyer_withdrawal_requests
      WHERE id = ${input.withdrawalId}::uuid
      FOR UPDATE
    `;
    const current = currentRows[0];
    if (!current) throw new LawyerWithdrawalError("not_found");
    if (!allowedWithdrawalTransition(current.status, input.action)) {
      throw new LawyerWithdrawalError("invalid_transition");
    }
    const reference = input.settlementReference?.trim() ?? "";
    if (input.action === "paid" && !reference) {
      throw new LawyerWithdrawalError("invalid_transition");
    }

    const updatedRows = await transaction<Array<{
      id: string;
      status: LawyerWithdrawalStatus;
      amount: string | number;
      currency_code: string;
      requested_at: Date | string;
      reviewed_at: Date | string;
      paid_at: Date | string | null;
      settlement_reference: string | null;
    }>>`
      UPDATE public.lawyer_withdrawal_requests
      SET status = ${input.action},
          reviewed_at = COALESCE(reviewed_at, NOW()),
          reviewed_by = ${input.adminId}::uuid,
          paid_at = CASE WHEN ${input.action} = 'paid' THEN NOW() ELSE paid_at END,
          settlement_reference = CASE WHEN ${input.action} = 'paid' THEN ${reference} ELSE settlement_reference END,
          updated_at = NOW()
      WHERE id = ${current.id}::uuid
        AND status = ${current.status}
      RETURNING id, status, amount, currency_code, requested_at,
        reviewed_at, paid_at, settlement_reference
    `;
    const updated = updatedRows[0];
    if (!updated) throw new LawyerWithdrawalError("conflict");

    if (input.action === "paid") {
      await transaction`
        UPDATE public.bahrain_payment_allocations allocation
        SET payout_status = 'paid', paid_out_at = NOW(), updated_at = NOW()
        FROM public.lawyer_withdrawal_allocations reserved
        WHERE reserved.withdrawal_id = ${current.id}::uuid
          AND reserved.allocation_id = allocation.id
          AND allocation.payout_status <> 'paid'
      `;
    } else if (input.action === "rejected") {
      await transaction`
        DELETE FROM public.lawyer_withdrawal_allocations
        WHERE withdrawal_id = ${current.id}::uuid
      `;
    }

    return { ...updated, amount: Number(updated.amount) };
  });
}
