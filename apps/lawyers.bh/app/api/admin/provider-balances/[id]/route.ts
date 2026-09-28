import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import { canCancelProviderBalance } from "@/lib/payments/provider-balances";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminPermission("manage_finance"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const [balance] = await db.select({ status: schema.providerCustomerBalances.status }).from(schema.providerCustomerBalances).where(eq(schema.providerCustomerBalances.id, id)).limit(1);
  if (!balance) return NextResponse.json({ ok: false, error: "BALANCE_NOT_FOUND" }, { status: 404 });
  if (!canCancelProviderBalance(balance.status)) return NextResponse.json({ ok: false, error: "BALANCE_INVALID_TRANSITION" }, { status: 409 });
  await db.update(schema.providerCustomerBalances).set({ status: "cancelled", paymentUrl: null, updatedAt: new Date() }).where(and(eq(schema.providerCustomerBalances.id, id), eq(schema.providerCustomerBalances.status, balance.status)));
  return NextResponse.json({ ok: true });
}
