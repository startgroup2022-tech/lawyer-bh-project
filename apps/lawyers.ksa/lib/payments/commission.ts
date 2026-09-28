import "server-only";

import { sqlClient } from "@/lib/db/client";
import {
  calculatePaymentAllocation,
  calculatePlatformOnlyAllocation,
  type CalculatedPaymentAllocation,
} from "./allocation-calculation";

export {
  calculatePaymentAllocation,
  calculatePlatformOnlyAllocation,
};
export type { CalculatedPaymentAllocation };

/*
 * نسب العمولة الافتراضية.
 */
export const FIRST_YEAR_PLATFORM_PERCENTAGE = 20;
export const FIRST_YEAR_PROVIDER_PERCENTAGE = 80;

export const AFTER_FIRST_YEAR_PLATFORM_PERCENTAGE = 50;
export const AFTER_FIRST_YEAR_PROVIDER_PERCENTAGE = 50;

/*
 * الريال السعودي يستخدم منزلتين عشريتين:
 * 10.00 SAR
 */
const SAR_DECIMAL_PLACES = 2;

export type CommissionRateRow = {
  id: string;
  provider_id: string;
  country_code: string;
  platform_percentage: string;
  provider_percentage: string;
  effective_from: Date | string;
  effective_to: Date | string | null;
  is_active: boolean;
};

export type PaymentAllocationRow = {
  id: string;
  country_code: string;
  booking_request_id: string;
  provider_id: string | null;
  commission_rate_id: string | null;
  tap_charge_id: string;
  currency_code: string;
  gross_amount: string;
  platform_percentage: string;
  provider_percentage: string;
  platform_amount: string;
  provider_amount: string;
  gateway_fee_amount: string;
  split_mode: string;
  allocation_status: string;
  payout_status: string;
  captured_at: Date | string;
  created_at: Date | string;
};

type CreateDefaultCommissionInput = {
  providerId: string;
  countryCode: string;
  commissionRatesTable: string;
  startsAt?: Date;
};

type GetProviderCommissionRateInput = {
  providerId: string;
  countryCode: string;
  commissionRatesTable: string;
  effectiveAt?: Date;
};

type RecordPaymentAllocationCommonInput = {
  countryCode: string;
  bookingRequestId: string;
  tapChargeId: string;
  currencyCode?: string;
  grossAmount: number;
  gatewayFeeAmount?: number;
  paymentAllocationsTable: string;
  capturedAt?: Date;
};

type RecordPaymentAllocationInput = RecordPaymentAllocationCommonInput &
  (
    | {
        mode?: "provider";
        providerId: string;
        commissionRatesTable: string;
      }
    | {
        mode: "platform_only";
        providerId?: null;
        commissionRatesTable?: string;
      }
  );

/**
 * إنشاء نسب المحامي الافتراضية عند اعتماده.
 *
 * الفترة الأولى:
 * المنصة: 20%
 * المحامي: 80%
 * من تاريخ الاعتماد حتى مرور سنة تقويمية.
 *
 * الفترة الثانية:
 * المنصة: 50%
 * المحامي: 50%
 * تبدأ مباشرة بعد انتهاء السنة الأولى.
 */
export async function createDefaultProviderCommissionRates(
  input: CreateDefaultCommissionInput,
): Promise<CommissionRateRow[]> {
  const providerId = input.providerId.trim();
  const countryCode = input.countryCode.trim().toUpperCase();
  const commissionRatesTable =
    input.commissionRatesTable.trim();

  if (!providerId) {
    throw new Error("Provider id is required");
  }

  if (!countryCode) {
    throw new Error("Country code is required");
  }

  if (!commissionRatesTable) {
    throw new Error(
      "Commission rates table name is required",
    );
  }

  const startsAt = input.startsAt ?? new Date();

  if (Number.isNaN(startsAt.getTime())) {
    throw new Error("Commission start date is invalid");
  }

  /*
   * نستخدم INTERVAL '1 year' داخل PostgreSQL.
   *
   * مثال:
   * تاريخ الاعتماد: 2026-07-15
   * نهاية السنة الأولى: 2027-07-15
   */
  const rows = await sqlClient<CommissionRateRow[]>`
    INSERT INTO ${sqlClient(commissionRatesTable)} (
      country_code,
      provider_id,
      platform_percentage,
      provider_percentage,
      effective_from,
      effective_to,
      is_active,
      notes,
      created_at,
      updated_at
    )
    VALUES
    (
      ${countryCode},
      ${providerId}::uuid,
      ${FIRST_YEAR_PLATFORM_PERCENTAGE.toFixed(2)},
      ${FIRST_YEAR_PROVIDER_PERCENTAGE.toFixed(2)},
      ${startsAt},
      ${startsAt} + INTERVAL '1 year',
      true,
      ${"First-year commission rate"},
      NOW(),
      NOW()
    ),
    (
      ${countryCode},
      ${providerId}::uuid,
      ${AFTER_FIRST_YEAR_PLATFORM_PERCENTAGE.toFixed(2)},
      ${AFTER_FIRST_YEAR_PROVIDER_PERCENTAGE.toFixed(2)},
      ${startsAt} + INTERVAL '1 year',
      NULL,
      true,
      ${"Commission rate after the first year"},
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_id, effective_from)
    DO UPDATE SET
      country_code = EXCLUDED.country_code,
      platform_percentage =
        EXCLUDED.platform_percentage,
      provider_percentage =
        EXCLUDED.provider_percentage,
      effective_to = EXCLUDED.effective_to,
      is_active = true,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING
      id,
      provider_id,
      country_code,
      platform_percentage,
      provider_percentage,
      effective_from,
      effective_to,
      is_active
  `;

  return rows;
}

/**
 * جلب نسبة العمولة السارية على المحامي في تاريخ محدد.
 *
 * افتراضيًا يستخدم التاريخ والوقت الحاليين.
 */
export async function getProviderCommissionRate(
  input: GetProviderCommissionRateInput,
): Promise<CommissionRateRow | null> {
  const providerId = input.providerId.trim();
  const countryCode = input.countryCode.trim().toUpperCase();
  const commissionRatesTable =
    input.commissionRatesTable.trim();

  if (!providerId) {
    throw new Error("Provider id is required");
  }

  if (!countryCode) {
    throw new Error("Country code is required");
  }

  if (!commissionRatesTable) {
    throw new Error(
      "Commission rates table name is required",
    );
  }

  const effectiveAt = input.effectiveAt ?? new Date();

  if (Number.isNaN(effectiveAt.getTime())) {
    throw new Error("Commission effective date is invalid");
  }

  const rows = await sqlClient<CommissionRateRow[]>`
    SELECT
      id,
      provider_id,
      country_code,
      platform_percentage,
      provider_percentage,
      effective_from,
      effective_to,
      is_active
    FROM ${sqlClient(commissionRatesTable)}
    WHERE provider_id = ${providerId}::uuid
      AND country_code = ${countryCode}
      AND is_active = true
      AND effective_from <= ${effectiveAt}
      AND (
        effective_to IS NULL
        OR effective_to > ${effectiveAt}
      )
    ORDER BY effective_from DESC
    LIMIT 1
  `;

  return rows[0] ?? null;
}

/**
 * حساب حصة المنصة وحصة المحامي.
 *
 * مجموع النسب يجب أن يكون 100%.
 *
 * مثال:
 * الإجمالي: 10.000
 * المنصة: 20%
 * المحامي: 80%
 *
 * النتيجة:
 * المنصة: 2.000
 * المحامي: 8.000
 */
/**
 * تسجيل توزيع عملية دفع ناجحة.
 *
 * هذه الدالة:
 *
 * 1. تجلب نسبة المحامي السارية وقت الدفع.
 * 2. تحسب حصة المنصة والمحامي.
 * 3. تحفظ Snapshot للنسب والمبالغ.
 * 4. تمنع تكرار العملية عند إعادة إرسال Webhook من Tap.
 */
export async function recordPaymentAllocation(
  input: RecordPaymentAllocationInput,
): Promise<{
  allocationId: string;
  isNew: boolean;

  commissionRateId: string | null;

  grossAmount: number;

  platformPercentage: number;
  providerPercentage: number;

  platformAmount: number;
  providerAmount: number;

  gatewayFeeAmount: number;
}> {
  const countryCode =
    input.countryCode.trim().toUpperCase();

  const bookingRequestId =
    input.bookingRequestId.trim();

  const mode = input.mode ?? "provider";
  const providerId =
    input.mode === "platform_only" ? null : input.providerId.trim();
  const tapChargeId = input.tapChargeId.trim();

  const currencyCode = (
    input.currencyCode ?? "SAR"
  )
    .trim()
    .toUpperCase();

  const commissionRatesTable =
    input.mode === "platform_only"
      ? ""
      : input.commissionRatesTable.trim();

  const paymentAllocationsTable =
    input.paymentAllocationsTable.trim();

  const capturedAt = input.capturedAt ?? new Date();

  const grossAmount = roundSar(input.grossAmount);

  const gatewayFeeAmount = roundSar(
    input.gatewayFeeAmount ?? 0,
  );

  if (!countryCode) {
    throw new Error("Country code is required");
  }

  if (!bookingRequestId) {
    throw new Error("Booking request id is required");
  }

  if (mode === "provider" && !providerId) {
    throw new Error("Provider id is required");
  }

  if (!tapChargeId) {
    throw new Error("Tap charge id is required");
  }

  if (!currencyCode) {
    throw new Error("Currency code is required");
  }

  if (mode === "provider" && !commissionRatesTable) {
    throw new Error(
      "Commission rates table name is required",
    );
  }

  if (!paymentAllocationsTable) {
    throw new Error(
      "Payment allocations table name is required",
    );
  }

  if (!Number.isFinite(grossAmount) || grossAmount <= 0) {
    throw new Error(
      "Gross payment amount must be greater than zero",
    );
  }

  if (
    !Number.isFinite(gatewayFeeAmount) ||
    gatewayFeeAmount < 0
  ) {
    throw new Error(
      "Gateway fee amount cannot be negative",
    );
  }

  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error("Captured date is invalid");
  }

  /*
   * التحقق أولًا من وجود عملية مسجلة بنفس Tap Charge.
   *
   * هذا مهم لأن Tap قد يعيد إرسال Webhook أكثر من مرة.
   */
  const existingRows =
    await sqlClient<PaymentAllocationRow[]>`
      SELECT
        id,
        country_code,
        booking_request_id,
        provider_id,
        commission_rate_id,
        tap_charge_id,
        currency_code,
        gross_amount,
        platform_percentage,
        provider_percentage,
        platform_amount,
        provider_amount,
        gateway_fee_amount,
        split_mode,
        allocation_status,
        payout_status,
        captured_at,
        created_at
      FROM ${sqlClient(paymentAllocationsTable)}
      WHERE tap_charge_id = ${tapChargeId}
      LIMIT 1
    `;

  const existingAllocation = existingRows[0];

  if (existingAllocation) {
    return {
      allocationId: existingAllocation.id,
      isNew: false,

      commissionRateId:
        existingAllocation.commission_rate_id,

      grossAmount: Number(
        existingAllocation.gross_amount,
      ),

      platformPercentage: Number(
        existingAllocation.platform_percentage,
      ),

      providerPercentage: Number(
        existingAllocation.provider_percentage,
      ),

      platformAmount: Number(
        existingAllocation.platform_amount,
      ),

      providerAmount: Number(
        existingAllocation.provider_amount,
      ),

      gatewayFeeAmount: Number(
        existingAllocation.gateway_fee_amount,
      ),
    };
  }

  /*
   * جلب نسبة المحامي السارية في وقت الدفع.
   */
  const commissionRate =
    mode === "provider"
      ? await getProviderCommissionRate({
          providerId: providerId!,
          countryCode,
          commissionRatesTable,
          effectiveAt: capturedAt,
        })
      : null;

  if (mode === "provider" && !commissionRate) {
    throw new Error("No active commission rate was found for the provider");
  }

  const calculated =
    mode === "platform_only"
      ? calculatePlatformOnlyAllocation({ grossAmount })
      : calculatePaymentAllocation({
          grossAmount,
          platformPercentage: Number(commissionRate!.platform_percentage),
          providerPercentage: Number(commissionRate!.provider_percentage),
        });

  const insertedRows =
    await sqlClient<PaymentAllocationRow[]>`
      INSERT INTO ${sqlClient(paymentAllocationsTable)} (
        country_code,
        booking_request_id,
        provider_id,
        commission_rate_id,
        tap_charge_id,
        currency_code,
        gross_amount,
        platform_percentage,
        provider_percentage,
        platform_amount,
        provider_amount,
        gateway_fee_amount,
        split_mode,
        allocation_status,
        payout_status,
        captured_at,
        created_at,
        updated_at
      )
      VALUES (
        ${countryCode},
        ${bookingRequestId}::uuid,
        ${providerId}::uuid,
        ${commissionRate?.id ?? null}::uuid,
        ${tapChargeId},
        ${currencyCode},
        ${calculated.grossAmount.toFixed(
          SAR_DECIMAL_PLACES,
        )},
        ${calculated.platformPercentage.toFixed(2)},
        ${calculated.providerPercentage.toFixed(2)},
        ${calculated.platformAmount.toFixed(
          SAR_DECIMAL_PLACES,
        )},
        ${calculated.providerAmount.toFixed(
          SAR_DECIMAL_PLACES,
        )},
        ${gatewayFeeAmount.toFixed(
          SAR_DECIMAL_PLACES,
        )},
        ${mode === "platform_only" ? "platform_only" : "legacy"},
        ${"calculated"},
        ${mode === "platform_only" ? "not_applicable" : "pending"},
        ${capturedAt},
        NOW(),
        NOW()
      )
      ON CONFLICT (tap_charge_id)
      DO NOTHING
      RETURNING
        id,
        country_code,
        booking_request_id,
        provider_id,
        commission_rate_id,
        tap_charge_id,
        currency_code,
        gross_amount,
        platform_percentage,
        provider_percentage,
        platform_amount,
        provider_amount,
        gateway_fee_amount,
        split_mode,
        allocation_status,
        payout_status,
        captured_at,
        created_at
    `;

  const insertedAllocation = insertedRows[0];

  /*
   * قد يصل Webhook آخر في اللحظة نفسها.
   * في هذه الحالة ON CONFLICT لا يرجع صفًا،
   * لذلك نجلب العملية التي سجلها الطلب الآخر.
   */
  if (!insertedAllocation) {
    const conflictRows =
      await sqlClient<PaymentAllocationRow[]>`
        SELECT
          id,
          country_code,
          booking_request_id,
          provider_id,
          commission_rate_id,
          tap_charge_id,
          currency_code,
          gross_amount,
          platform_percentage,
          provider_percentage,
          platform_amount,
          provider_amount,
          gateway_fee_amount,
          split_mode,
          allocation_status,
          payout_status,
          captured_at,
          created_at
        FROM ${sqlClient(paymentAllocationsTable)}
        WHERE tap_charge_id = ${tapChargeId}
        LIMIT 1
      `;

    const conflictAllocation = conflictRows[0];

    if (!conflictAllocation) {
      throw new Error(
        "Payment allocation could not be recorded",
      );
    }

    return {
      allocationId: conflictAllocation.id,
      isNew: false,

      commissionRateId:
        conflictAllocation.commission_rate_id,

      grossAmount: Number(
        conflictAllocation.gross_amount,
      ),

      platformPercentage: Number(
        conflictAllocation.platform_percentage,
      ),

      providerPercentage: Number(
        conflictAllocation.provider_percentage,
      ),

      platformAmount: Number(
        conflictAllocation.platform_amount,
      ),

      providerAmount: Number(
        conflictAllocation.provider_amount,
      ),

      gatewayFeeAmount: Number(
        conflictAllocation.gateway_fee_amount,
      ),
    };
  }

  return {
    allocationId: insertedAllocation.id,
    isNew: true,

    commissionRateId:
      insertedAllocation.commission_rate_id,

    grossAmount: Number(
      insertedAllocation.gross_amount,
    ),

    platformPercentage: Number(
      insertedAllocation.platform_percentage,
    ),

    providerPercentage: Number(
      insertedAllocation.provider_percentage,
    ),

    platformAmount: Number(
      insertedAllocation.platform_amount,
    ),

    providerAmount: Number(
      insertedAllocation.provider_amount,
    ),

    gatewayFeeAmount: Number(
      insertedAllocation.gateway_fee_amount,
    ),
  };
}

/**
 * تقريب الريال السعودي إلى منزلتين عشريتين.
 */
function roundSar(value: number): number {
  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  const multiplier = 10 ** SAR_DECIMAL_PLACES;

  return (
    Math.round((value + Number.EPSILON) * multiplier) /
    multiplier
  );
}
