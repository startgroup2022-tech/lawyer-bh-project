import { Buffer } from "node:buffer";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import { canDownloadProviderBalanceReceipt } from "@/lib/payments/provider-balances";
import { renderProviderBalancePdf } from "@/lib/payments/provider-balance-pdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminPermission("manage_finance"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const [balance] = await db.select().from(schema.providerCustomerBalances).where(eq(schema.providerCustomerBalances.id, id)).limit(1);
  if (!balance) return NextResponse.json({ ok: false, error: "BALANCE_NOT_FOUND" }, { status: 404 });
  if (!canDownloadProviderBalanceReceipt(balance.status, balance.tapStatus)) return NextResponse.json({ ok: false, error: "RECEIPT_NOT_AVAILABLE" }, { status: 409 });
  const bytes = await renderProviderBalancePdf({ kind: "receipt", locale: request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar", balance });
  const body = Buffer.from(bytes);
  return new Response(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="receipt-${balance.publicReference}.pdf"`, "Cache-Control": "no-store" } });
}
