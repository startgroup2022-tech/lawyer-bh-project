import { and, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { normalizeTapCustomerPhone, publicBalanceStatus } from "@/lib/payments/provider-balances";
import { createCharge, siteOrigin } from "@/lib/tap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const TAP_CURRENCIES = ["BHD", "USD", "SAR", "AED", "KWD", "OMR", "QAR", "EUR", "GBP"] as const;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const normalizedReference = decodeURIComponent(reference).trim().toUpperCase();
  if (!/^BAL-[A-Z0-9]{8,24}$/.test(normalizedReference)) {
    return NextResponse.json({ ok: false, code: "BALANCE_NOT_FOUND" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as { sourceId?: string };
  const sourceId = String(body.sourceId ?? "").trim();
  if (!/^src_[A-Za-z0-9._-]+$/.test(sourceId) && !/^tok_[A-Za-z0-9._-]+$/.test(sourceId)) {
    return NextResponse.json({ ok: false, code: "PAYMENT_SOURCE_REQUIRED" }, { status: 400 });
  }

  const [balance] = await db.select().from(schema.providerCustomerBalances)
    .where(eq(schema.providerCustomerBalances.publicReference, normalizedReference))
    .limit(1);
  if (!balance) {
    return NextResponse.json({ ok: false, code: "BALANCE_NOT_FOUND" }, { status: 404 });
  }
  if (publicBalanceStatus(balance.status, balance.dueDate) !== "pending_payment") {
    return NextResponse.json({ ok: false, code: "BALANCE_NOT_PAYABLE" }, { status: 409 });
  }
  if (balance.tapChargeId) {
    return NextResponse.json({ ok: false, code: "PAYMENT_ALREADY_PROCESSING" }, { status: 409 });
  }
  const currency = TAP_CURRENCIES.find((value) => value === balance.currencyCode);
  if (!currency) {
    return NextResponse.json({ ok: false, code: "CURRENCY_NOT_SUPPORTED" }, { status: 400 });
  }

  const [country] = await db.select({ phoneCode: schema.countries.phoneCode })
    .from(schema.countries)
    .where(eq(schema.countries.code, balance.countryCode))
    .limit(1);
  const phone = normalizeTapCustomerPhone(balance.customerPhone, country?.phoneCode ?? "");
  if (!phone && !balance.customerEmail) {
    return NextResponse.json({ ok: false, code: "CUSTOMER_CONTACT_REQUIRED" }, { status: 400 });
  }

  const claimed = await db.update(schema.providerCustomerBalances).set({
    tapStatus: "CREATING",
    updatedAt: new Date(),
  }).where(and(
    eq(schema.providerCustomerBalances.id, balance.id),
    isNull(schema.providerCustomerBalances.tapChargeId),
    isNull(schema.providerCustomerBalances.tapStatus),
  )).returning({ id: schema.providerCustomerBalances.id });
  if (claimed.length === 0) {
    return NextResponse.json({ ok: false, code: "PAYMENT_ALREADY_PROCESSING" }, { status: 409 });
  }

  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const origin = siteOrigin(request);
  const nameParts = balance.customerName.trim().split(/\s+/);
  try {
    const charge = await createCharge({
      amountBD: Number(balance.amount),
      currency,
      description: balance.description,
      reference: { transaction: balance.publicReference, order: balance.publicReference },
      customer: {
        first_name: nameParts[0] || balance.customerName,
        last_name: nameParts.slice(1).join(" ") || undefined,
        email: balance.customerEmail || undefined,
        phone: phone ? { country_code: phone.countryCode, number: phone.number } : undefined,
      },
      metadata: {
        provider_balance_id: balance.id,
        provider_id: balance.providerId,
        country_code: balance.countryCode,
      },
      redirect: `${origin}/${locale}/payment?balance=${encodeURIComponent(balance.publicReference)}`,
      post: `${origin}/api/tap/provider-balance/confirm`,
      source: { id: sourceId },
    });
    const transactionUrl = charge.transaction?.url;
    if (!charge.id || !transactionUrl) throw new Error("Tap transaction URL missing");

    await db.update(schema.providerCustomerBalances).set({
      tapChargeId: charge.id,
      tapStatus: charge.status,
      updatedAt: new Date(),
    }).where(eq(schema.providerCustomerBalances.id, balance.id));

    return NextResponse.json({
      ok: true,
      transactionUrl,
      chargeId: charge.id,
      requiresRedirect: true,
    });
  } catch (error) {
    await db.update(schema.providerCustomerBalances).set({
      tapStatus: null,
      updatedAt: new Date(),
    }).where(and(
      eq(schema.providerCustomerBalances.id, balance.id),
      isNull(schema.providerCustomerBalances.tapChargeId),
    ));
    console.error("[provider-balance/pay] Tap initiation failed", {
      reference: balance.publicReference,
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json({ ok: false, code: "TAP_PAYMENT_UNAVAILABLE" }, { status: 502 });
  }
}
