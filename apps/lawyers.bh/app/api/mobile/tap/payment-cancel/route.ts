import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";
import {
  cancelMobilePaymentRequest,
  type MobilePaymentCancellationRow,
} from "@/lib/tap/mobile-payment-cancel";
import { notifyClientPaymentEvent } from "@/lib/tap/mobile-payment-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingRow = {
  id: string;
  payment_status: string;
  service_status: string;
  tap_status: string | null;
  mobile_request_access_digest: string | null;
  locale: string;
};

function mapBooking(row: BookingRow): MobilePaymentCancellationRow {
  return {
    bookingId: row.id,
    paymentStatus: row.payment_status,
    serviceStatus: row.service_status,
    tapStatus: row.tap_status,
    requestAccessDigest: row.mobile_request_access_digest,
    locale: row.locale === "en" || row.locale === "tr" ? row.locale : "ar",
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    bookingId?: unknown;
    requestAccessToken?: unknown;
  } | null;
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const bodyToken =
    typeof body?.requestAccessToken === "string"
      ? body.requestAccessToken.trim()
      : "";
  const requestAccessToken = bearer || bodyToken;

  const result = await cancelMobilePaymentRequest(
    bookingId,
    requestAccessToken,
    {
      async findBooking(id) {
        const rows = await sqlClient<BookingRow[]>`
          SELECT id, payment_status, service_status, tap_status, locale,
            mobile_request_access_digest
          FROM public.bahrain_emergency_requests
          WHERE id = ${id}::uuid
            AND mobile_payment_idempotency_key IS NOT NULL
          LIMIT 1
        `;
        return rows[0] ? mapBooking(rows[0]) : null;
      },
      async cancelBooking(id) {
        const rows = await sqlClient<BookingRow[]>`
          UPDATE public.bahrain_emergency_requests
          SET payment_status = ${"failed"},
            service_status = ${"cancelled"},
            cancellation_reason = ${"Cancelled by mobile client before service"},
            updated_at = NOW()
          WHERE id = ${id}::uuid
            AND NOT (payment_status = ${"success"} AND tap_status = ${"CAPTURED"})
            AND service_status <> ${"cancelled"}
          RETURNING id, payment_status, service_status, tap_status, locale,
            mobile_request_access_digest
        `;
        if (!rows[0]) throw new Error("Request state changed before cancellation");
        return mapBooking(rows[0]);
      },
    },
  );

  if (result.cancelledNow) {
    await notifyClientPaymentEvent({
      eventType: "request_cancelled",
      requestId: bookingId,
      locale: result.notificationLocale,
      source: "payment-cancel",
    });
  }

  return NextResponse.json(result.body, { status: result.status });
}
