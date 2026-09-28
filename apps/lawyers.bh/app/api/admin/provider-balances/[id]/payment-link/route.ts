import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import { canCreateProviderBalanceLink } from "@/lib/payments/provider-balances";
import { siteOrigin } from "@/lib/tap";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminPermission("manage_finance"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const [balance] = await db.select().from(schema.providerCustomerBalances).where(eq(schema.providerCustomerBalances.id, id)).limit(1);
  if (!balance) return NextResponse.json({ ok: false, error: "BALANCE_NOT_FOUND" }, { status: 404 });
  if (!canCreateProviderBalanceLink(balance.status)) return NextResponse.json({ ok: false, error: "BALANCE_INVALID_TRANSITION" }, { status: 409 });
  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const paymentUrl = `${siteOrigin(request)}/${locale}/payment?balance=${encodeURIComponent(balance.publicReference)}`;
  await db.update(schema.providerCustomerBalances).set({ status: "pending_payment", paymentUrl, paymentLinkCreatedAt: new Date(), updatedAt: new Date() }).where(and(eq(schema.providerCustomerBalances.id, id), eq(schema.providerCustomerBalances.status, balance.status)));
  return NextResponse.json({ ok: true, paymentUrl });
}
