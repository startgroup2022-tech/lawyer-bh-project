import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { canCreateProviderBalanceLink } from "@/lib/payments/provider-balances";
import { siteOrigin } from "@/lib/tap";
import { getProviderAccessById } from "../../../_access";
import { getProviderSessionFromRequest } from "../../../_session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getProviderSessionFromRequest(request);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const access = await getProviderAccessById(session.providerId, session.countryCode);
  if (!access?.access.canUseDashboard) return NextResponse.json({ ok: false, error: "Account is locked" }, { status: 403 });
  const { id } = await params;
  const [balance] = await db.select().from(schema.providerCustomerBalances).where(and(eq(schema.providerCustomerBalances.id, id), eq(schema.providerCustomerBalances.providerId, session.providerId), eq(schema.providerCustomerBalances.countryCode, session.countryCode))).limit(1);
  if (!balance) return NextResponse.json({ ok: false, error: "Balance not found" }, { status: 404 });
  if (!canCreateProviderBalanceLink(balance.status)) return NextResponse.json({ ok: false, error: "Payment link cannot be created", code: "BALANCE_INVALID_TRANSITION" }, { status: 409 });

  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const paymentUrl = `${siteOrigin(request)}/${locale}/payment?balance=${encodeURIComponent(balance.publicReference)}`;
  await db.update(schema.providerCustomerBalances).set({
    status: "pending_payment",
    paymentUrl,
    paymentLinkCreatedAt: new Date(),
    updatedAt: new Date(),
  }).where(and(
    eq(schema.providerCustomerBalances.id, balance.id),
    eq(schema.providerCustomerBalances.status, balance.status),
  ));
  return NextResponse.json({ ok: true, paymentUrl });
}
