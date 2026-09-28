import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";
import { createTapClient } from "@/lib/tap/client";
import { assertTapTestConfiguration } from "@/lib/tap/mobile-payment-contract";
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
};

type TapChargePayload = {
  id?: string;
  status?: string;
  amount?: number | string;
  currency?: string;
  reference?: { order?: string };
};

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
    currency: "SAR",
    orderReference: `LSOS-${row.id.slice(0, 8).toUpperCase()}`,
    paymentStatus: row.payment_status,
    tapStatus: row.tap_status,
    chargeId: row.tap_charge_id,
    invoiceNumber: invoiceNumber(row.tap_payload),
  };
}

function createDependencies(): MobilePaymentStatusDependencies {
  const secretKey = environment("TAP_MOBILE_TEST_SECRET_KEY", "TAP_SECRET_KEY");
  const publicKey = environment(
    "TAP_MOBILE_TEST_PUBLIC_KEY",
    "TAP_IOS_PUBLIC_KEY",
    "NEXT_PUBLIC_TAP_PUBLIC_KEY",
    "TAP_PUBLIC_KEY",
  );
  const merchantId = environment(
    "TAP_MOBILE_TEST_MERCHANT_ID",
    "TAP_MERCHANT_ID",
    "NEXT_PUBLIC_TAP_MERCHANT_ID",
  );
  const siteUrl = environment("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
  const testConfig = assertTapTestConfiguration({ secretKey, publicKey, merchantId });
  const tapClient = createTapClient({
    ...testConfig,
    marketplaceMid: merchantId,
    mode: "test",
    siteUrl,
  });

  async function findBooking(bookingId: string) {
    const rows = await sqlClient<BookingRow[]>`
      SELECT id, amount_bd, payment_status, tap_status, tap_charge_id, tap_payload
      FROM public.saudi_booking_requests
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
    const rows = await sqlClient<BookingRow[]>`
      UPDATE public.saudi_booking_requests
      SET
        payment_status = ${input.paymentStatus},
        tap_status = ${input.tapStatus},
        tap_payload = COALESCE(tap_payload, '{}'::jsonb) ||
          ${JSON.stringify(input.invoiceNumber ? { invoiceNumber: input.invoiceNumber } : {})}::jsonb,
        updated_at = NOW()
      WHERE id = ${input.bookingId}::uuid
        AND mobile_payment_idempotency_key IS NOT NULL
      RETURNING id, amount_bd, payment_status, tap_status, tap_charge_id, tap_payload
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
  const bookingId = new URL(request.url).searchParams.get("bookingId")?.trim() ?? "";

  try {
    const result = await getMobilePaymentStatus(bookingId, createDependencies());
    return NextResponse.json(result.body, { status: result.status });
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
