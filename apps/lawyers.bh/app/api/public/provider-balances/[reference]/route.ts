import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { toPublicProviderBalance } from "@/lib/payments/provider-balance-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const normalizedReference = decodeURIComponent(reference).trim().toUpperCase();
  if (!/^BAL-[A-Z0-9]{8,24}$/.test(normalizedReference)) {
    return NextResponse.json({ ok: false, code: "BALANCE_NOT_FOUND" }, { status: 404 });
  }

  const [balance] = await db.select({
    publicReference: schema.providerCustomerBalances.publicReference,
    providerNameAr: schema.providerCustomerBalances.providerNameAr,
    providerNameEn: schema.providerCustomerBalances.providerNameEn,
    customerName: schema.providerCustomerBalances.customerName,
    description: schema.providerCustomerBalances.description,
    amount: schema.providerCustomerBalances.amount,
    currencyCode: schema.providerCustomerBalances.currencyCode,
    dueDate: schema.providerCustomerBalances.dueDate,
    status: schema.providerCustomerBalances.status,
    paidAt: schema.providerCustomerBalances.paidAt,
  }).from(schema.providerCustomerBalances)
    .where(eq(schema.providerCustomerBalances.publicReference, normalizedReference))
    .limit(1);

  if (!balance) {
    return NextResponse.json({ ok: false, code: "BALANCE_NOT_FOUND" }, { status: 404 });
  }

  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  return NextResponse.json(
    { ok: true, balance: toPublicProviderBalance(balance, locale) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
