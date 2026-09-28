import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { buildCountryTableSet, getActiveCountry } from "@/lib/db/country-tables";
import { recordPaymentAllocation } from "@/lib/payments/commission";
import { validateProviderBalanceCapture } from "@/lib/payments/provider-balance-payment";
import { retrieveCharge, verifyWebhookSignature, type TapChargeResponse } from "@/lib/tap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!(await verifyWebhookSignature(rawBody, request.headers.get("hashstring")))) return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  let payload: TapChargeResponse;
  try { payload = JSON.parse(rawBody) as TapChargeResponse; } catch { return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 }); }
  if (!payload.id) return NextResponse.json({ ok: false, error: "Missing charge id" }, { status: 400 });
  const charge = await retrieveCharge(payload.id);
  const balanceId = charge.metadata?.provider_balance_id;
  if (!balanceId) return NextResponse.json({ ok: false, error: "Missing balance id" }, { status: 400 });
  const [balance] = await db.select().from(schema.providerCustomerBalances).where(eq(schema.providerCustomerBalances.id, balanceId)).limit(1);
  if (!balance) return NextResponse.json({ ok: false, error: "Balance not found" }, { status: 404 });
  const validation = validateProviderBalanceCapture(balance, charge);
  if (!validation.ok) return NextResponse.json({ ok: false, error: validation.code, code: validation.code }, { status: 409 });
  if (validation.alreadyPaid) return NextResponse.json({ ok: true, alreadyConfirmed: true });

  const country = await getActiveCountry(balance.countryCode);
  if (!country) return NextResponse.json({ ok: false, error: "Country unavailable" }, { status: 503 });
  const tables = buildCountryTableSet(country);
  const allocation = await recordPaymentAllocation({
    mode: "provider",
    countryCode: balance.countryCode,
    request: { kind: "provider_balance", id: balance.id },
    providerId: balance.providerId,
    customerNameSnapshot: balance.customerName,
    tapChargeId: charge.id,
    currencyCode: charge.currency,
    grossAmount: charge.amount,
    gatewayFeeAmount: 0,
    commissionRatesTable: tables.provider_commission_rates,
    paymentAllocationsTable: tables.payment_allocations,
    capturedAt: new Date(),
  });
  await db.update(schema.providerCustomerBalances).set({ status: "paid", tapStatus: "CAPTURED", paidAt: new Date(), updatedAt: new Date() }).where(eq(schema.providerCustomerBalances.id, balance.id));
  return NextResponse.json({ ok: true, allocationId: allocation.allocationId });
}
