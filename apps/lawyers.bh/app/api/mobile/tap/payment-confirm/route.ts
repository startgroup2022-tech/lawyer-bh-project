import { after, NextResponse } from "next/server";

import { sqlClient } from "@/lib/db/client";
import { createMobileDispatchToken } from "@/lib/sos/mobile-dispatch-auth";
import { tapOrderReference } from "@/lib/payments/request-identity";
import { verifyMobileRequestAccessToken } from "@/lib/tap/mobile-request-access";
import { notifyClientPaymentEvent } from "@/lib/tap/mobile-payment-notifications";
import { runPaidRequestAdminNotifications } from "@/lib/mobile-admin/paid-request-notification-runtime";
import { schedulePaidRequestAdminNotifications } from "@/lib/mobile-admin/paid-request-notification-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ConfirmPaymentBody = {
  bookingId?: unknown;
  chargeId?: unknown;
  requestAccessToken?: unknown;
};

type BookingRow = {
  id: string;
  case_ref: string;
  amount_bd: string | number;
  payment_status: string;
  tap_status: string | null;
  tap_charge_id: string | null;
  service_status: string;
  mobile_request_access_digest: string | null;
  locale: string;
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

/**
 * Return the first configured environment variable.
 */
function requiredEnvironment(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

type TapSecretKeySelection = {
  secretKey: string;
  keySource: "TAP_MOBILE_TEST_SECRET_KEY" | null;
  paymentMode: "test";
  vercelEnvironment: string;
};

/**
 * Mobile payments are intentionally running in Tap TEST mode for now,
 * even when the Vercel deployment itself is production.
 *
 * Keep the mobile SDK on the matching TEST merchant/public key:
 *   TAP_MOBILE_TEST_MERCHANT_ID
 *   TAP_MOBILE_TEST_PUBLIC_KEY
 * and verify charges here with:
 *   TAP_MOBILE_TEST_SECRET_KEY
 *
 * Do not fall back to a live secret key while the mobile SDK is in test mode.
 */
function getTapSecretKey(): TapSecretKeySelection {
  const secretKey = requiredEnvironment("TAP_MOBILE_TEST_SECRET_KEY");

  return {
    secretKey,
    keySource: secretKey ? "TAP_MOBILE_TEST_SECRET_KEY" : null,
    paymentMode: "test",
    vercelEnvironment: process.env.VERCEL_ENV?.trim() || process.env.NODE_ENV || "unknown",
  };
}

/**
 * Validate booking UUID.
 */
function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/**
 * Validate Tap charge ID.
 */
function isChargeId(value: string): boolean {
  return /^chg_[A-Za-z0-9_-]+$/.test(value);
}

/**
 * Bahrain payments can contain 3 decimal places.
 */
function normalizeAmount(value: number): number {
  return Number(value.toFixed(3));
}

/**
 * Small wait helper.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Tap statuses that should not be retried.
 */
const TAP_TERMINAL_FAILURE_STATUSES = new Set([
  "FAILED",
  "DECLINED",
  "CANCELLED",
  "ABANDONED",
  "TIMEDOUT",
]);

/**
 * Retrieve charge directly from Tap.
 */
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

/**
 * Apple Pay may return control to the SDK slightly before
 * the Tap charge reaches its final CAPTURED state.
 *
 * We retrieve the charge a few times before considering it pending.
 */
async function retrieveTapChargeWithRetry(
  chargeId: string,
  secretKey: string,
): Promise<TapChargeResponse> {
  const maxAttempts = 4;

  let lastCharge: TapChargeResponse | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const charge = await retrieveTapCharge(chargeId, secretKey);

    lastCharge = charge;

    const status = String(charge.status ?? "").toUpperCase();

    console.log("TAP_CHARGE_STATUS_CHECK", {
      chargeId,
      attempt,
      status,
      responseCode: charge.response?.code ?? null,
      responseMessage: charge.response?.message ?? null,
    });

    /**
     * Payment definitely succeeded.
     */
    if (status === "CAPTURED") {
      return charge;
    }

    /**
     * Payment definitely failed.
     */
    if (TAP_TERMINAL_FAILURE_STATUSES.has(status)) {
      return charge;
    }

    /**
     * If this is not the last attempt, wait before retrieving again.
     *
     * Useful especially for Apple Pay where the SDK callback
     * and Tap server status can be slightly out of sync.
     */
    if (attempt < maxAttempts) {
      await delay(750);
    }
  }

  if (!lastCharge) {
    throw new Error("Unable to retrieve Tap charge");
  }

  return lastCharge;
}

export async function POST(request: Request) {
  try {
    /*
     * ---------------------------------------------------------
     * Parse body
     * ---------------------------------------------------------
     */

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

    const requestAccessToken =
      typeof body.requestAccessToken === "string"
        ? body.requestAccessToken.trim()
        : "";

    /*
     * ---------------------------------------------------------
     * Validate input
     * ---------------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------------
     * Tap secret key
     * ---------------------------------------------------------
     */

    const tapSecretKeySelection = getTapSecretKey();
    const secretKey = tapSecretKeySelection.secretKey;

    console.log("TAP_SECRET_KEY_SELECTED", {
      paymentMode: tapSecretKeySelection.paymentMode,
      vercelEnvironment: tapSecretKeySelection.vercelEnvironment,
      keySource: tapSecretKeySelection.keySource,
    });

    if (!secretKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "TAP_MOBILE_TEST_SECRET_KEY is not configured",
        },
        { status: 500 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Retrieve booking
     * ---------------------------------------------------------
     */

    const bookingRows = await sqlClient<BookingRow[]>`
      SELECT
        id,
        case_ref,
        base_fee_bhd AS amount_bd,
        payment_status,
        tap_status,
        tap_charge_id,
        service_status,
        mobile_request_access_digest,
        locale
      FROM public.bahrain_emergency_requests
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

    /*
     * ---------------------------------------------------------
     * Validate mobile request access
     * ---------------------------------------------------------
     */

    if (
      !booking.mobile_request_access_digest ||
      !verifyMobileRequestAccessToken(
        requestAccessToken,
        booking.mobile_request_access_digest,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Request access denied",
        },
        { status: 403 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Do not confirm cancelled requests
     * ---------------------------------------------------------
     */

    if (booking.service_status === "cancelled") {
      return NextResponse.json(
        {
          ok: false,
          error: "A cancelled request cannot be confirmed",
        },
        { status: 409 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Idempotency
     *
     * If this request is already paid, don't charge or confirm
     * it again.
     * ---------------------------------------------------------
     */

    if (
      booking.payment_status === "success" &&
      booking.tap_status === "CAPTURED"
    ) {
      console.log("TAP_PAYMENT_ALREADY_CONFIRMED", {
        bookingId: booking.id,
        storedChargeId: booking.tap_charge_id,
      });

      return NextResponse.json(
        {
          ok: true,
          requestType: "emergency",
          requestId: booking.id,
          requestReference: booking.case_ref,

          bookingId: booking.id,
          chargeId: booking.tap_charge_id,

          amount: Number(booking.amount_bd),
          currency: "BHD",

          paymentStatus: "paid",
          tapStatus: booking.tap_status,

          alreadyConfirmed: true,

          dispatchToken: createMobileDispatchToken(booking.id),
        },
        { status: 200 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Retrieve Tap charge
     *
     * Apple Pay may need a very short amount of time to become
     * CAPTURED after the SDK reports completion.
     * ---------------------------------------------------------
     */

    const tapCharge = await retrieveTapChargeWithRetry(
      chargeId,
      secretKey,
    );

    const tapChargeId = String(tapCharge.id ?? "");

    const tapStatus = String(
      tapCharge.status ?? "",
    ).toUpperCase();

    const tapCurrency = String(
      tapCharge.currency ?? "",
    ).toUpperCase();

    const tapAmount = Number(tapCharge.amount);

    const bookingAmount = Number(booking.amount_bd);

    /*
     * ---------------------------------------------------------
     * Diagnostic logging
     * ---------------------------------------------------------
     */

    console.log("TAP_CONFIRM_DIAGNOSTIC", {
      bookingId,

      incomingChargeId: chargeId,
      returnedChargeId: tapChargeId,

      tapStatus,
      tapAmount,
      bookingAmount,
      tapCurrency,

      tapReferenceOrder:
        tapCharge.reference?.order ?? null,

      tapReferenceTransaction:
        tapCharge.reference?.transaction ?? null,

      metadataRequestId:
        tapCharge.metadata?.requestId ?? null,

      metadataRequestType:
        tapCharge.metadata?.requestType ?? null,

      responseCode:
        tapCharge.response?.code ?? null,

      responseMessage:
        tapCharge.response?.message ?? null,
    });

    /*
     * ---------------------------------------------------------
     * Verify charge ID
     * ---------------------------------------------------------
     */

    if (tapChargeId !== chargeId) {
      console.error("TAP_CHARGE_ID_MISMATCH", {
        bookingId,
        expectedChargeId: chargeId,
        receivedChargeId: tapChargeId,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Tap charge ID does not match",
        },
        { status: 409 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Verify request/order reference
     * ---------------------------------------------------------
     */

    const expectedReference = tapOrderReference({
      requestType: "emergency",
      requestId: booking.id,
    });

    const tapOrderReferenceValue = String(
      tapCharge.reference?.order ?? "",
    ).trim();

    const tapTransactionReference = String(
      tapCharge.reference?.transaction ?? "",
    ).trim();

    /*
     * IMPORTANT:
     *
     * Previously the code used:
     *
     * order !== expected || transaction !== expected
     *
     * This required BOTH values to be exactly the same.
     *
     * Apple Pay / Tap may return a transaction reference that
     * is different while the order reference remains correct.
     *
     * We therefore accept the charge if at least ONE of the
     * references matches our booking reference.
     */

    const referenceMatches =
      tapOrderReferenceValue === expectedReference ||
      tapTransactionReference === expectedReference;

    if (!referenceMatches) {
      console.error("TAP_REFERENCE_MISMATCH", {
        bookingId,
        chargeId,

        expectedReference,

        tapOrderReference:
          tapOrderReferenceValue || null,

        tapTransactionReference:
          tapTransactionReference || null,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Tap reference does not match booking",
        },
        { status: 409 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Validate amount
     * ---------------------------------------------------------
     */

    if (!Number.isFinite(tapAmount)) {
      console.error("TAP_INVALID_AMOUNT", {
        bookingId,
        chargeId,
        tapAmount: tapCharge.amount,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Tap returned an invalid amount",
        },
        { status: 502 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Validate currency
     * ---------------------------------------------------------
     */

    if (tapCurrency !== "BHD") {
      console.error("TAP_CURRENCY_MISMATCH", {
        bookingId,
        chargeId,
        expectedCurrency: "BHD",
        receivedCurrency: tapCurrency,
      });

      return NextResponse.json(
        {
          ok: false,
          error: `Unexpected Tap currency: ${tapCurrency}`,
        },
        { status: 409 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Validate payment amount
     * ---------------------------------------------------------
     */

    if (
      normalizeAmount(tapAmount) !==
      normalizeAmount(bookingAmount)
    ) {
      console.error("TAP_AMOUNT_MISMATCH", {
        bookingId,
        chargeId,

        expectedAmount:
          normalizeAmount(bookingAmount),

        receivedAmount:
          normalizeAmount(tapAmount),
      });

      return NextResponse.json(
        {
          ok: false,
          error: "Tap amount does not match booking amount",

          expectedAmount:
            normalizeAmount(bookingAmount),

          receivedAmount:
            normalizeAmount(tapAmount),
        },
        { status: 409 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Store original Tap response
     * ---------------------------------------------------------
     */

    const tapPayload = JSON.stringify(tapCharge);

    /*
     * ---------------------------------------------------------
     * Payment is not CAPTURED
     * ---------------------------------------------------------
     */

    if (tapStatus !== "CAPTURED") {
      const isFailed =
        TAP_TERMINAL_FAILURE_STATUSES.has(tapStatus);

      const paymentStatus = isFailed
        ? "failed"
        : "pending";

      await sqlClient`
        UPDATE public.bahrain_emergency_requests
        SET
          tap_charge_id = ${chargeId},
          tap_status = ${tapStatus || "UNKNOWN"},
          payment_status = ${paymentStatus},
          tap_payload = ${tapPayload}::jsonb,
          updated_at = NOW()
        WHERE id = ${bookingId}::uuid
      `;

      console.warn("TAP_PAYMENT_NOT_CAPTURED", {
        bookingId,
        chargeId,
        tapStatus: tapStatus || "UNKNOWN",

        responseCode:
          tapCharge.response?.code ?? null,

        responseMessage:
          tapCharge.response?.message ?? null,
      });

      return NextResponse.json(
        {
          ok: false,

          requestType: "emergency",
          requestId: bookingId,
          requestReference: booking.case_ref,

          bookingId,
          chargeId,

          paymentStatus: isFailed
            ? "failed"
            : "pending_payment",

          tapStatus:
            tapStatus || "UNKNOWN",

          tapResponseCode:
            tapCharge.response?.code ?? null,

          tapResponseMessage:
            tapCharge.response?.message ?? null,

          error: isFailed
            ? "Payment failed"
            : "Payment is not captured",
        },
        { status: 409 },
      );
    }

    /*
     * ---------------------------------------------------------
     * Payment CAPTURED
     * ---------------------------------------------------------
     */

    const updatedRows = await sqlClient<BookingRow[]>`
      UPDATE public.bahrain_emergency_requests
      SET
        payment_status = ${"success"},
        tap_status = ${"CAPTURED"},
        tap_charge_id = ${chargeId},
        tap_payload = ${tapPayload}::jsonb,
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
        AND service_status <> ${"cancelled"}
      RETURNING
        id,
        case_ref,
        base_fee_bhd AS amount_bd,
        payment_status,
        tap_status,
        tap_charge_id,
        service_status,
        mobile_request_access_digest,
        locale
    `;

    const updatedBooking = updatedRows[0];

    if (!updatedBooking) {
      throw new Error(
        "Booking payment status was not updated",
      );
    }

    console.log("TAP_PAYMENT_CONFIRMED", {
      bookingId: updatedBooking.id,
      chargeId: updatedBooking.tap_charge_id,
      amount: Number(updatedBooking.amount_bd),
      tapStatus: updatedBooking.tap_status,
    });

    await notifyClientPaymentEvent({
      eventType: "payment_confirmed",
      requestId: updatedBooking.id,
      locale: updatedBooking.locale,
      source: "payment-confirm",
    });

    schedulePaidRequestAdminNotifications(
      after,
      () => runPaidRequestAdminNotifications({ now: new Date(), limit: 10 }),
    );

    /*
     * ---------------------------------------------------------
     * Success
     * ---------------------------------------------------------
     */

    return NextResponse.json(
      {
        ok: true,

        requestType: "emergency",
        requestId: updatedBooking.id,
        requestReference: updatedBooking.case_ref,

        bookingId: updatedBooking.id,
        chargeId: updatedBooking.tap_charge_id,

        amount:
          Number(updatedBooking.amount_bd),

        currency: "BHD",

        paymentStatus: "paid",

        tapStatus:
          updatedBooking.tap_status,

        dispatchToken:
          createMobileDispatchToken(
            updatedBooking.id,
          ),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(
      "Mobile Tap payment confirmation error:",
      error,
    );

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
