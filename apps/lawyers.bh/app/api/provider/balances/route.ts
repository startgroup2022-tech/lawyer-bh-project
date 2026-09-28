import { randomUUID } from "node:crypto";
import { and, count, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { getActiveCountry } from "@/lib/db/country-tables";
import { validateProviderBalanceDraft } from "@/lib/payments/provider-balances";
import { getProviderAccessById } from "../_access";
import { getProviderSessionFromRequest } from "../_session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = getProviderSessionFromRequest(request);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const access = await getProviderAccessById(session.providerId, session.countryCode);
  if (!access?.access.canUseDashboard) return NextResponse.json({ ok: false, error: "Account is locked" }, { status: 403 });
  const requestedPage = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where = and(eq(schema.providerCustomerBalances.providerId, session.providerId), eq(schema.providerCustomerBalances.countryCode, session.countryCode));
  const [items, totals] = await Promise.all([
    db.select({ id: schema.providerCustomerBalances.id, publicReference: schema.providerCustomerBalances.publicReference, providerNameAr: schema.providerCustomerBalances.providerNameAr, providerNameEn: schema.providerCustomerBalances.providerNameEn, customerName: schema.providerCustomerBalances.customerName, customerPhone: schema.providerCustomerBalances.customerPhone, customerEmail: schema.providerCustomerBalances.customerEmail, description: schema.providerCustomerBalances.description, amount: schema.providerCustomerBalances.amount, currencyCode: schema.providerCustomerBalances.currencyCode, dueDate: schema.providerCustomerBalances.dueDate, status: schema.providerCustomerBalances.status, paymentUrl: schema.providerCustomerBalances.paymentUrl, tapStatus: schema.providerCustomerBalances.tapStatus, paidAt: schema.providerCustomerBalances.paidAt, createdAt: schema.providerCustomerBalances.createdAt }).from(schema.providerCustomerBalances).where(where).orderBy(desc(schema.providerCustomerBalances.createdAt)).limit(10).offset((page - 1) * 10),
    db.select({ value: count() }).from(schema.providerCustomerBalances).where(where),
  ]);
  const totalItems = Number(totals[0]?.value ?? 0);
  return NextResponse.json({ ok: true, balances: items, pagination: { page, pageSize: 10, totalItems, totalPages: Math.ceil(totalItems / 10) } });
}

export async function POST(request: NextRequest) {
  const session = getProviderSessionFromRequest(request);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const access = await getProviderAccessById(session.providerId, session.countryCode);
  if (!access?.access.canUseDashboard) return NextResponse.json({ ok: false, error: "Account is locked" }, { status: 403 });
  const input = await request.json().catch(() => ({}));
  const validation = validateProviderBalanceDraft(input as Record<string, unknown>);
  if (!validation.ok) return NextResponse.json({ ok: false, error: validation.code, code: validation.code }, { status: 400 });
  const [provider] = await db.select({ fullNameAr: schema.bahrainLawyers.fullNameAr, fullNameEn: schema.bahrainLawyers.fullNameEn }).from(schema.bahrainLawyers).where(and(eq(schema.bahrainLawyers.id, session.providerId), eq(schema.bahrainLawyers.countryCode, session.countryCode))).limit(1);
  if (!provider) return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
  const country = await getActiveCountry(session.countryCode);
  if (!country) return NextResponse.json({ ok: false, error: "Country is not supported" }, { status: 400 });
  const reference = `BAL-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const [balance] = await db.insert(schema.providerCustomerBalances).values({ publicReference: reference, providerId: session.providerId, countryCode: session.countryCode, providerNameAr: provider.fullNameAr, providerNameEn: provider.fullNameEn, customerName: validation.value.customerName, customerPhone: validation.value.customerPhone, customerEmail: validation.value.customerEmail, description: validation.value.description, amount: validation.value.amount, currencyCode: country.currencyCode, dueDate: validation.value.dueDate }).returning();
  return NextResponse.json({ ok: true, balance }, { status: 201 });
}
