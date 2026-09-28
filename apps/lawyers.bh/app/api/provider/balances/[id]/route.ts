import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { canCancelProviderBalance } from "@/lib/payments/provider-balances";
import { getProviderAccessById } from "../../_access";
import { getProviderSessionFromRequest } from "../../_session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getProviderSessionFromRequest(request);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const access = await getProviderAccessById(session.providerId, session.countryCode);
  if (!access?.access.canUseDashboard) return NextResponse.json({ ok: false, error: "Account is locked" }, { status: 403 });
  const { id } = await params;
  const [balance] = await db.select({ status: schema.providerCustomerBalances.status }).from(schema.providerCustomerBalances).where(and(eq(schema.providerCustomerBalances.id, id), eq(schema.providerCustomerBalances.providerId, session.providerId), eq(schema.providerCustomerBalances.countryCode, session.countryCode))).limit(1);
  if (!balance) return NextResponse.json({ ok: false, error: "Balance not found" }, { status: 404 });
  if (!canCancelProviderBalance(balance.status)) return NextResponse.json({ ok: false, error: "Balance cannot be cancelled", code: "BALANCE_INVALID_TRANSITION" }, { status: 409 });
  await db.update(schema.providerCustomerBalances).set({ status: "cancelled", paymentUrl: null, updatedAt: new Date() }).where(and(eq(schema.providerCustomerBalances.id, id), eq(schema.providerCustomerBalances.providerId, session.providerId)));
  return NextResponse.json({ ok: true, status: "cancelled" });
}
