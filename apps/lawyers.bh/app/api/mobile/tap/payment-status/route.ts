import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";
import { createMobileDispatchToken } from "@/lib/sos/mobile-dispatch-auth";
import { createTapClient } from "@/lib/tap/client";
import { assertTapConfiguration } from "@/lib/tap/mobile-payment-contract";
import { tapOrderReference } from "@/lib/payments/request-identity";
import { verifyMobileRequestAccessToken } from "@/lib/tap/mobile-request-access";
import {
  getMobilePaymentStatus,
  type MobilePaymentStatusDependencies,
  type MobilePaymentStatusRow,
} from "@/lib/tap/mobile-payment-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  amount_bd: string | number;
  payment_status: string;
  tap_status: string | null;
  tap_charge_id: string | null;
  tap_payload: unknown;
  service_status: string;
  mobile_request_access_digest: string | null;
};

type TapChargePayload = {
  id?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  reference?: { order?: string };
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function environment(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function invoiceNumber(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>).invoiceNumber;
  return typeof value === "string" && value ? value : null;
}

function mapBooking(row: BookingRow): MobilePaymentStatusRow {
  return {
    bookingId: row.id,
    amount: Number(row.amount_bd),
    currency: "BHD",
    orderReference: tapOrderReference({ requestType: "emergency", requestId: row.id }),
    paymentStatus: row.payment_status,
    tapStatus: row.tap_status,
    chargeId: row.tap_charge_id,
    invoiceNumber: invoiceNumber(row.tap_payload),
  };
}

function createDependencies(): MobilePaymentStatusDependencies {
  const secretKey = environment("TAP_MOBILE_SECRET_KEY", "TAP_MOBILE_TEST_SECRET_KEY", "TAP_SECRET_KEY");
  const publicKey = environment(
    "TAP_MOBILE_PUBLIC_KEY", "TAP_MOBILE_TEST_PUBLIC_KEY",
    "TAP_IOS_PUBLIC_KEY",
    "NEXT_PUBLIC_TAP_PUBLIC_KEY",
    "TAP_PUBLIC_KEY",
  );
  const merchantId = environment(
    "TAP_MOBILE_MERCHANT_ID", "TAP_MOBILE_TEST_MERCHANT_ID",
    "TAP_MERCHANT_ID",
    "NEXT_PUBLIC_TAP_MERCHANT_ID",
  );
  const siteUrl = environment("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
  const tapConfig = assertTapConfiguration({ secretKey, publicKey, merchantId });
  const tapClient = createTapClient({
    ...tapConfig,
    marketplaceMid: merchantId,
    mode: publicKey.startsWith("pk_live_") ? "live" : "test",
    siteUrl,
  });

  async function findBooking(bookingId: string) {
    const rows = await sqlClient<BookingRow[]>`
      SELECT id, base_fee_bhd AS amount_bd, payment_status, tap_status,
        tap_charge_id, tap_payload, service_status,
        mobile_request_access_digest
      FROM public.bahrain_emergency_requests
      WHERE id = ${bookingId}::uuid
        AND mobile_payment_idempotency_key IS NOT NULL
      LIMIT 1
    `;
    return rows[0] ? mapBooking(rows[0]) : null;
  }

  async function updateStatus(input: {
    bookingId: string;
    paymentStatus: string;
    tapStatus: string;
    invoiceNumber?: string;
  }): Promise<MobilePaymentStatusRow> {
    const emergencyPaymentStatus =
      input.paymentStatus === "paid"
        ? "success"
        : input.paymentStatus === "cancelled"
          ? "failed"
          : input.paymentStatus === "pending_payment"
            ? "pending"
            : input.paymentStatus;
    const rows = await sqlClient<BookingRow[]>`
      UPDATE public.bahrain_emergency_requests
      SET
        payment_status = ${emergencyPaymentStatus},
        tap_status = ${input.tapStatus},
        tap_payload = COALESCE(tap_payload, '{}'::jsonb) ||
          ${JSON.stringify(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {})}::jsonb,
        updated_at = NOW()
      WHERE id = ${input.bookingId}::uuid
        AND mobile_payment_idempotency_key IS NOT NULL
      RETURNING id, base_fee_bhd AS amount_bd, payment_status, tap_status, tap_charge_id, tap_payload
    `;
    return mapBooking(rows[0]);
  }

  return {
    findBooking,
    async retrieveCharge(chargeId) {
      const charge = (await tapClient.retrieveCharge(chargeId)) as TapChargePayload;
      return {
        id: String(charge.id ?? ""),
        status: String(charge.status ?? ""),
        amount: Number(charge.amount),
        currency: String(charge.currency ?? ""),
        reference: { order: String(charge.reference?.order ?? "") },
      };
    },
    async markPaid(input) {
      return updateStatus({
        bookingId: input.bookingId,
        paymentStatus: "paid",
        tapStatus: input.tapStatus,
        invoiceNumber: input.invoiceNumber,
      });
    },
    async markTerminal(input) {
      return updateStatus(input);
    },
  };
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const bookingId =
    searchParams.get("requestId")?.trim() ??
    searchParams.get("bookingId")?.trim() ??
    "";

  const requestAccessToken =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ??
    "";

  try {
    if (!UUID_PATTERN.test(bookingId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid bookingId" },
        { status: 400 },
      );
    }

    const accessRows = await sqlClient<BookingRow[]>`
      SELECT id, base_fee_bhd AS amount_bd, payment_status, tap_status,
        tap_charge_id, tap_payload, service_status,
        mobile_request_access_digest
      FROM public.bahrain_emergency_requests
      WHERE id = ${bookingId}::uuid
        AND mobile_payment_idempotency_key IS NOT NULL
      LIMIT 1
    `;
    const accessBooking = accessRows[0];

    if (!accessBooking) {
      return NextResponse.json(
        { ok: false, error: "Mobile payment booking was not found" },
        { status: 404 },
      );
    }

    if (
      !accessBooking.mobile_request_access_digest ||
      !verifyMobileRequestAccessToken(
        requestAccessToken,
        accessBooking.mobile_request_access_digest,
      )
    ) {
      return NextResponse.json(
        { ok: false, error: "Request access denied" },
        { status: 403 },
      );
    }

    const result = await getMobilePaymentStatus(bookingId, createDependencies());
    const paid = result.body.status === "paid" && result.body.tapStatus === "CAPTURED";
    const serviceStatus = accessBooking.service_status;
    return NextResponse.json(
      paid
        ? {
            ...result.body,
            serviceStatus,
            canRetryPayment: false,
            canContinue: serviceStatus !== "cancelled",
            dispatchToken: createMobileDispatchToken(bookingId),
          }
        : {
            ...result.body,
            serviceStatus,
            canRetryPayment: serviceStatus !== "cancelled",
            canContinue: false,
          },
      { status: result.status },
    );
  } catch (error) {
    console.error("[mobile/tap/payment-status] failed", {
      bookingId,
      error: error instanceof Error ? error.message : "unknown error",
    });
    return NextResponse.json(
      { ok: false, error: "Payment status is temporarily unavailable" },
      { status: 503 },
    );
  }
}
