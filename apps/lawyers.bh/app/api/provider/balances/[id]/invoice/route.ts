import { Buffer } from "node:buffer";
import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { renderProviderBalancePdf } from "@/lib/payments/provider-balance-pdf";
import { getProviderSessionFromRequest } from "../../../_session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getProviderSessionFromRequest(request);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [balance] = await db.select().from(schema.providerCustomerBalances).where(and(
    eq(schema.providerCustomerBalances.id, id),
    eq(schema.providerCustomerBalances.providerId, session.providerId),
    eq(schema.providerCustomerBalances.countryCode, session.countryCode),
  )).limit(1);
  if (!balance) return NextResponse.json({ ok: false, code: "BALANCE_NOT_FOUND" }, { status: 404 });

  const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "ar";
  const bytes = await renderProviderBalancePdf({ kind: "invoice", locale, balance });
  const body = Buffer.from(bytes);
  return new Response(body, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="invoice-${balance.publicReference}.pdf"`,
    "Content-Length": String(body.length),
    "Cache-Control": "no-store",
  } });
}
