import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/db/client";
import { tapOrderReference } from "@/lib/payments/request-identity";
import { createTapClient } from "@/lib/tap/client";
import { verifyMobileRequestAccessToken } from "@/lib/tap/mobile-request-access";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Booking = {
  id: string;
  country_code: string;
  case_ref: string;
  contact_name: string;
  contact_phone: string;
  amount_bd: number | string;
  payment_status: string;
  service_status: string;
  tap_charge_id: string | null;
  tap_status: string | null;
  mobile_request_access_digest: string | null;
};

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return "";
}

function config() {
  const secretKey = env("TAP_MOBILE_SECRET_KEY", "TAP_MOBILE_TEST_SECRET_KEY");
  const publicKey = env("TAP_MOBILE_PUBLIC_KEY", "TAP_MOBILE_TEST_PUBLIC_KEY");
  const merchantId = env("TAP_MOBILE_MERCHANT_ID", "TAP_MOBILE_TEST_MERCHANT_ID");
  const mode = publicKey.startsWith("pk_live_") ? "live" : "test";
  if (!secretKey.startsWith(mode === "live" ? "sk_live_" : "sk_test_") ||
      !publicKey.startsWith(mode === "live" ? "pk_live_" : "pk_test_") ||
      !/^\d+$/.test(merchantId)) return null;
  return { secretKey, publicKey, merchantId, marketplaceMid: merchantId, mode, siteUrl: env("NEXT_PUBLIC_SITE_URL", "SITE_URL") || "https://lawyers.bh" } as const;
}

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const tap = config();
  if (!tap) return fail(503, "card_unavailable");
  return NextResponse.json({ publicKey: tap.publicKey, merchantId: tap.merchantId, mode: tap.mode }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const bookingId = typeof body?.bookingId === "string" ? body.bookingId.trim() : "";
  const tokenId = typeof body?.tokenId === "string" ? body.tokenId.trim() : "";
  const dial = typeof body?.phoneDialCode === "string" ? body.phoneDialCode.trim() : "";
  const locale = body?.locale === "ar" ? "ar" : "en";
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookingId) || !accessToken) return fail(403, "request_access_denied");
  if (!/^tok_[A-Za-z0-9_-]+$/.test(tokenId) || !/^[1-9]\d{0,3}$/.test(dial)) return fail(400, "invalid_card_request");
  const tap = config();
  if (!tap) return fail(503, "card_unavailable");

  try {
    const rows = await sqlClient<Booking[]>`
      SELECT id, country_code, case_ref, contact_name, contact_phone, base_fee_bhd AS amount_bd,
             payment_status, service_status, tap_charge_id, tap_status, mobile_request_access_digest
      FROM public.bahrain_emergency_requests
      WHERE id = ${bookingId}::uuid AND mobile_payment_idempotency_key IS NOT NULL
      LIMIT 1
    `;
    const booking = rows[0];
    if (!booking?.mobile_request_access_digest || !verifyMobileRequestAccessToken(accessToken, booking.mobile_request_access_digest)) {
      return fail(403, "request_access_denied");
    }
    try {
      await requireCountryProduct(booking.country_code, "legal_sos");
    } catch (error) {
      const mapped = mapCountryProductAccessError(error);
      if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
      throw error;
    }
    if (booking.payment_status === "success" || booking.service_status === "cancelled" || booking.tap_charge_id || booking.tap_status === "WEB_CARD_CREATING" || booking.tap_status === "WEB_CARD_UNKNOWN") {
      return fail(409, "payment_already_started");
    }
    const amount = Number(booking.amount_bd);
    const digits = booking.contact_phone.replace(/\D/g, "");
    if (!Number.isFinite(amount) || amount <= 0 || !digits.startsWith(dial) || digits.length <= dial.length) return fail(400, "invalid_booking_details");
    const claimed = await sqlClient<{ id: string }[]>`
      UPDATE public.bahrain_emergency_requests
      SET tap_status = 'WEB_CARD_CREATING', updated_at = NOW()
      WHERE id = ${bookingId}::uuid AND mobile_payment_idempotency_key IS NOT NULL
        AND tap_charge_id IS NULL AND payment_status <> 'success' AND service_status <> 'cancelled'
        AND tap_status IS DISTINCT FROM 'WEB_CARD_CREATING' AND tap_status IS DISTINCT FROM 'WEB_CARD_UNKNOWN'
      RETURNING id::text
    `;
    if (!claimed[0]) return fail(409, "payment_already_started");

    const reference = tapOrderReference({ requestType: "emergency", requestId: bookingId });
    const backendOrigin = new URL(request.url).origin;
    const siteOrigin = env("LEGAL_SOS_WEBSITE_URL", "LEGAL_SOS_SITE_URL") || "https://www.legalsos.org";
    const continuation = new URL(`/${locale}/sos/continue?requestId=${encodeURIComponent(bookingId)}`, siteOrigin).toString();
    const names = booking.contact_name.trim().split(/\s+/);
    try {
      const charge = await createTapClient(tap).createCharge({
        amount: Number(amount.toFixed(3)),
        currency: "BHD",
        threeDSecure: true,
        save_card: false,
        customer: {
          first_name: names[0] || "Customer", last_name: names.slice(1).join(" ") || "Customer",
          email: "noreply@legalsos.org", phone: { country_code: dial, number: digits.slice(dial.length) },
        },
        source: { id: tokenId },
        merchant: { id: tap.merchantId },
        reference: { transaction: reference, order: reference, idempotent: reference },
        redirect: { url: continuation },
        post: { url: new URL("/api/mobile/tap/webhook", backendOrigin).toString() },
        metadata: { paymentFlow: "mobile_emergency", requestType: "emergency", requestId: bookingId, bookingId },
      });
      if (!charge?.id) throw new Error("charge_id_missing");
      const transaction = charge.transaction as { url?: unknown } | undefined;
      const transactionUrl = typeof transaction?.url === "string" && transaction.url.startsWith("https://") ? transaction.url : null;
      await sqlClient`
        UPDATE public.bahrain_emergency_requests
        SET tap_charge_id = ${charge.id}, tap_status = ${charge.status || "INITIATED"},
            tap_payload = ${JSON.stringify({ id: charge.id, status: charge.status, transaction: transactionUrl ? { url: transactionUrl } : null })}::jsonb,
            updated_at = NOW()
        WHERE id = ${bookingId}::uuid AND tap_status = 'WEB_CARD_CREATING'
      `;
      return NextResponse.json({ ok: true, status: charge.status, transactionUrl }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      console.error("Legal SOS card charge could not be confirmed", error instanceof Error ? error.message : "unknown_error");
      await sqlClient`
        UPDATE public.bahrain_emergency_requests
        SET tap_status = 'WEB_CARD_UNKNOWN', updated_at = NOW()
        WHERE id = ${bookingId}::uuid AND tap_status = 'WEB_CARD_CREATING'
      `;
      return fail(502, "card_charge_unconfirmed");
    }
  } catch (error) {
    console.error("Legal SOS card payment unavailable", error instanceof Error ? error.message : "unknown_error");
    return fail(500, "card_unavailable");
  }
}
