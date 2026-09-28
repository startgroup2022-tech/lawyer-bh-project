import { NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmPaymentBody = {
  bookingId?: unknown;
  chargeId?: unknown;
};

type BookingRow = {
  id: string;
  amount_bd: string | number;
  payment_status: string;
  tap_status: string | null;
  tap_charge_id: string | null;
};

type TapChargeResponse = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
  reference?: {
    transaction?: string;
    order?: string;
  };
  response?: {
    code?: string;
    message?: string;
  };
};

function requiredEnvironment(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isChargeId(value: string): boolean {
  return /^chg_[A-Za-z0-9_-]+$/.test(value);
}

function normalizeAmount(value: number): number {
  return Number(value.toFixed(2));
}

async function retrieveTapCharge(
  chargeId: string,
  secretKey: string,
): Promise<TapChargeResponse> {
  const response = await fetch(
    `https://api.tap.company/v2/charges/${encodeURIComponent(chargeId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => null)) as
    | TapChargeResponse
    | null;

  if (!response.ok || !payload) {
    const message =
      payload?.response?.message ||
      `Tap retrieve charge failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

export async function POST(request: Request) {
  try {
    let body: ConfirmPaymentBody;

    try {
      body = (await request.json()) as ConfirmPaymentBody;
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
        },
        { status: 400 },
      );
    }

    const bookingId =
      typeof body.bookingId === "string" ? body.bookingId.trim() : "";

    const chargeId =
      typeof body.chargeId === "string" ? body.chargeId.trim() : "";

    if (!bookingId || !isUuid(bookingId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "bookingId must be a valid UUID",
        },
        { status: 400 },
      );
    }

    if (!chargeId || !isChargeId(chargeId)) {
      return NextResponse.json(
        {
          ok: false,
          error: "chargeId is invalid",
        },
        { status: 400 },
      );
    }

    const secretKey = requiredEnvironment(
      "TAP_MOBILE_TEST_SECRET_KEY",
      "TAP_SECRET_KEY",
    );

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tap secret key is not configured",
        },
        { status: 500 },
      );
    }

    const bookingRows = await sqlClient<BookingRow[]>`
      SELECT
        id,
        amount_bd,
        payment_status,
        tap_status,
        tap_charge_id
      FROM public.saudi_booking_requests
      WHERE id = ${bookingId}::uuid
      LIMIT 1
    `;

    const booking = bookingRows[0];

    if (!booking) {
      return NextResponse.json(
        {
          ok: false,
          error: "Booking was not found",
        },
        { status: 404 },
      );
    }

    if (
      booking.payment_status === "paid" &&
      booking.tap_status === "CAPTURED"
    ) {
      return NextResponse.json(
        {
          ok: true,
          bookingId: booking.id,
          chargeId: booking.tap_charge_id,
          paymentStatus: booking.payment_status,
          tapStatus: booking.tap_status,
          alreadyConfirmed: true,
        },
        { status: 200 },
      );
    }

    const tapCharge = await retrieveTapCharge(chargeId, secretKey);

    const tapChargeId = String(tapCharge.id ?? "");
    const tapStatus = String(tapCharge.status ?? "").toUpperCase();
    const tapCurrency = String(tapCharge.currency ?? "").toUpperCase();
    const tapAmount = Number(tapCharge.amount);
    const bookingAmount = Number(booking.amount_bd);

    if (tapChargeId !== chargeId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tap charge ID does not match",
        },
        { status: 409 },
      );
    }
const expectedReference =
  `LSOS-${booking.id.slice(0, 8).toUpperCase()}`;

const tapOrderReference =
  String(tapCharge.reference?.order ?? "");

const tapTransactionReference =
  String(tapCharge.reference?.transaction ?? "");

if (
  tapOrderReference !== expectedReference ||
  tapTransactionReference !== expectedReference
) {
  return NextResponse.json(
    {
      ok: false,
      error: "Tap reference does not match booking",
    },
    { status: 409 },
  );
}
    if (!Number.isFinite(tapAmount)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tap returned an invalid amount",
        },
        { status: 502 },
      );
    }

    if (tapCurrency !== "SAR") {
      return NextResponse.json(
        {
          ok: false,
          error: `Unexpected Tap currency: ${tapCurrency}`,
        },
        { status: 409 },
      );
    }

    if (normalizeAmount(tapAmount) !== normalizeAmount(bookingAmount)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Tap amount does not match booking amount",
          expectedAmount: normalizeAmount(bookingAmount),
          receivedAmount: normalizeAmount(tapAmount),
        },
        { status: 409 },
      );
    }

    const tapPayload = JSON.stringify(tapCharge);

    if (tapStatus !== "CAPTURED") {
      await sqlClient`
        UPDATE public.saudi_booking_requests
        SET
          tap_charge_id = ${chargeId},
          tap_status = ${tapStatus || "UNKNOWN"},
          payment_status = ${
            ["FAILED", "DECLINED", "CANCELLED", "ABANDONED", "TIMEDOUT"].includes(
              tapStatus,
            )
              ? "failed"
              : "pending_payment"
          },
          tap_payload = ${tapPayload}::jsonb,
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;

      return NextResponse.json(
        {
          ok: false,
          bookingId,
          chargeId,
          paymentStatus: "pending_payment",
          tapStatus: tapStatus || "UNKNOWN",
          error: "Payment is not captured",
        },
        { status: 409 },
      );
    }

    const updatedRows = await sqlClient<BookingRow[]>`
      UPDATE public.saudi_booking_requests
      SET
        payment_status = ${"paid"},
        tap_status = ${"CAPTURED"},
        tap_charge_id = ${chargeId},
        tap_payload = ${tapPayload}::jsonb,
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
      RETURNING
        id,
        amount_bd,
        payment_status,
        tap_status,
        tap_charge_id
    `;

    const updatedBooking = updatedRows[0];

    if (!updatedBooking) {
      throw new Error("Booking payment status was not updated");
    }

    return NextResponse.json(
      {
        ok: true,
        bookingId: updatedBooking.id,
        chargeId: updatedBooking.tap_charge_id,
        amount: Number(updatedBooking.amount_bd),
        currency: "SAR",
        paymentStatus: updatedBooking.payment_status,
        tapStatus: updatedBooking.tap_status,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Mobile Tap payment confirmation error:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm payment",
      },
      { status: 500 },
    );
  }
}
