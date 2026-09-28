import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { createTapClient } from "@/lib/tap/client";
import { assertTapConfiguration } from "@/lib/tap/mobile-payment-contract";
import { verifyMobileRequestAccessToken } from "@/lib/tap/mobile-request-access";
import { tapOrderReference } from "@/lib/payments/request-identity";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIAL: Record<string, string> = {
  BH: "973", SA: "966", KW: "965", AE: "971", QA: "974",
  OM: "968", IQ: "964", TR: "90", EG: "20",
};

type Booking = {
  id: string;
  case_ref: string;
  country_code: string;
  contact_name: string;
  contact_phone: string;
  base_fee_bhd: string | number;
  payment_status: string;
  tap_charge_id: string | null;
  tap_status: string | null;
  tap_payload: Record<string, unknown> | null;
  mobile_request_access_digest: string | null;
  service_status: string;
};

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function safeCheckoutUrl(value: unknown) {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "tap.company" || url.hostname.endsWith(".tap.company"))
      ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
  const accessToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  if (!UUID.test(bookingId) || !accessToken) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const rows = await sqlClient<Booking[]>`
    SELECT id::text, case_ref, country_code, contact_name, contact_phone,
      base_fee_bhd, payment_status, tap_charge_id, tap_status, tap_payload,
      mobile_request_access_digest, service_status
    FROM public.bahrain_emergency_requests
    WHERE id = ${bookingId}::uuid AND mobile_payment_idempotency_key IS NOT NULL
    LIMIT 1
  `;
  const booking = rows[0];
  if (!booking?.mobile_request_access_digest ||
      !verifyMobileRequestAccessToken(accessToken, booking.mobile_request_access_digest)) {
    return NextResponse.json({ error: "request_access_denied" }, { status: 403 });
  }
  try {
    await requireCountryProduct(booking.country_code, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }
  if (booking.service_status === "cancelled") {
    return NextResponse.json({ error: "request_cancelled" }, { status: 409 });
  }
  if (booking.payment_status === "success") {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) {
    return NextResponse.json({ error: "invalid_description" }, { status: 400 });
  }
  const suppliedDial = typeof body?.phoneDialCode === "string" ? body.phoneDialCode : "";
  if (suppliedDial && !/^[1-9]\d{0,3}$/.test(suppliedDial)) {
    return NextResponse.json({ error: "invalid_phone_dial_code" }, { status: 400 });
  }
  if (description) {
    await sqlClient`
      UPDATE public.bahrain_emergency_requests
      SET description = ${description}, updated_at = NOW()
      WHERE id = ${bookingId}::uuid
        AND payment_status <> 'success' AND service_status <> 'cancelled'
    `;
  }
  const existingUrl = safeCheckoutUrl(booking.tap_payload?.webCheckoutUrl);
  if (booking.tap_charge_id) {
    return existingUrl
      ? NextResponse.json({ transactionUrl: existingUrl, bookingId })
      : NextResponse.json({ error: "existing_payment" }, { status: 409 });
  }

  let config;
  try {
    config = assertTapConfiguration({
      secretKey: env("TAP_MOBILE_SECRET_KEY", "TAP_MOBILE_TEST_SECRET_KEY", "TAP_SECRET_KEY"),
      publicKey: env("TAP_MOBILE_PUBLIC_KEY", "TAP_MOBILE_TEST_PUBLIC_KEY", "TAP_IOS_PUBLIC_KEY", "NEXT_PUBLIC_TAP_PUBLIC_KEY", "TAP_PUBLIC_KEY"),
      merchantId: env("TAP_MOBILE_MERCHANT_ID", "TAP_MOBILE_TEST_MERCHANT_ID", "TAP_MERCHANT_ID", "NEXT_PUBLIC_TAP_MERCHANT_ID"),
    });
  } catch {
    return NextResponse.json({ error: "payment_unavailable" }, { status: 503 });
  }

  const claimed = await sqlClient<Array<{ id: string }>>`
    UPDATE public.bahrain_emergency_requests
    SET tap_status = 'WEB_CHECKOUT_CREATING', updated_at = NOW()
    WHERE id = ${bookingId}::uuid
      AND tap_charge_id IS NULL
      AND payment_status <> 'success'
      AND service_status <> 'cancelled'
      AND (tap_status IS DISTINCT FROM 'WEB_CHECKOUT_CREATING'
        OR updated_at < NOW() - INTERVAL '2 minutes')
    RETURNING id::text
  `;
  if (!claimed[0]) {
    return NextResponse.json({ error: "checkout_in_progress" }, { status: 409 });
  }

  try {
    const locale = body?.locale === "ar" || body?.locale === "tr" ? body.locale : "en";
    const origin = new URL(env("LEGAL_SOS_WEB_ORIGIN") || "https://www.legalsos.org");
    if (origin.protocol !== "https:") throw new Error("invalid_web_origin");
    const backendOrigin = new URL(env("NEXT_PUBLIC_SITE_URL") || request.url).origin;
    const nameParts = booking.contact_name.trim().split(/\s+/);
    const dial = suppliedDial || DIAL[booking.country_code] || "973";
    const phoneDigits = booking.contact_phone.replace(/\D/g, "");
    const localPhone = phoneDigits.startsWith(dial) ? phoneDigits.slice(dial.length) : "";
    const amount = Number(booking.base_fee_bhd);
    if (!Number.isFinite(amount) || amount <= 0 || localPhone.length < 4) throw new Error("invalid_booking");
    const reference = tapOrderReference({ requestType: "emergency", requestId: bookingId });
    const client = createTapClient({
      ...config,
      marketplaceMid: config.merchantId,
      mode: config.publicKey.startsWith("pk_live_") ? "live" : "test",
      siteUrl: backendOrigin,
    });
    const charge = await client.createCharge({
      amount: Number(amount.toFixed(3)),
      currency: "BHD",
      threeDSecure: true,
      save_card: false,
      description: "Legal SOS " + booking.case_ref,
      statement_descriptor: "LEGAL SOS",
      reference: { transaction: reference, order: reference },
      customer: {
        first_name: nameParts[0] || "Customer",
        last_name: nameParts.slice(1).join(" ") || nameParts[0] || "Customer",
        phone: { country_code: dial, number: localPhone },
      },
      merchant: { id: config.merchantId },
      source: { id: "src_all" },
      redirect: { url: origin.origin + "/" + locale + "/sos/continue?requestId=" + encodeURIComponent(bookingId) },
      post: { url: backendOrigin + "/api/mobile/tap/webhook" },
      metadata: { paymentFlow: "mobile_emergency", requestType: "emergency", requestId: bookingId, bookingId },
    });
    const url = safeCheckoutUrl((charge as { transaction?: { url?: unknown } }).transaction?.url);
    if (!/^chg_[A-Za-z0-9_-]+$/.test(charge.id) || !url) throw new Error("invalid_tap_checkout");
    const attached = await sqlClient<Array<{ id: string }>>`
      UPDATE public.bahrain_emergency_requests
      SET tap_charge_id = ${charge.id}, tap_status = ${charge.status || "INITIATED"},
        tap_payload = ${JSON.stringify({ webCheckoutUrl: url, chargeId: charge.id })}::jsonb,
        updated_at = NOW()
      WHERE id = ${bookingId}::uuid
        AND tap_charge_id IS NULL AND tap_status = 'WEB_CHECKOUT_CREATING'
      RETURNING id::text
    `;
    if (!attached[0]) throw new Error("checkout_attach_failed");
    return NextResponse.json({ transactionUrl: url, bookingId }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[mobile/tap/web-checkout] failed", {
      bookingId, reason: error instanceof Error ? error.message : "unknown",
    });
    await sqlClient`
      UPDATE public.bahrain_emergency_requests
      SET tap_status = 'WEB_CHECKOUT_FAILED', updated_at = NOW()
      WHERE id = ${bookingId}::uuid
        AND tap_charge_id IS NULL AND tap_status = 'WEB_CHECKOUT_CREATING'
    `;
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 502 });
  }
}
