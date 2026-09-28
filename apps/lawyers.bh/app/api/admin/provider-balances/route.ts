import { randomUUID } from "node:crypto";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import { getActiveCountry } from "@/lib/db/country-tables";
import { validateProviderBalanceDraft } from "@/lib/payments/provider-balances";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await requireAdminPermission("manage_finance"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const page = Math.max(1, Number.parseInt(request.nextUrl.searchParams.get("page") || "1", 10) || 1);
  const status = request.nextUrl.searchParams.get("status")?.trim() || "";
  const search = request.nextUrl.searchParams.get("search")?.trim().slice(0, 100) || "";
  const providerId = request.nextUrl.searchParams.get("providerId")?.trim() || "";
  const conditions = [];
  if (status) conditions.push(eq(schema.providerCustomerBalances.status, status));
  if (providerId) conditions.push(eq(schema.providerCustomerBalances.providerId, providerId));
  if (search) conditions.push(or(
    ilike(schema.providerCustomerBalances.publicReference, `%${search}%`),
    ilike(schema.providerCustomerBalances.providerNameAr, `%${search}%`),
    ilike(schema.providerCustomerBalances.providerNameEn, `%${search}%`),
    ilike(schema.providerCustomerBalances.customerName, `%${search}%`),
    ilike(schema.providerCustomerBalances.customerPhone, `%${search}%`),
  )!);
  const where = conditions.length ? and(...conditions) : undefined;
  const [items, totals] = await Promise.all([
    db.select().from(schema.providerCustomerBalances).where(where).orderBy(desc(schema.providerCustomerBalances.createdAt)).limit(20).offset((page - 1) * 20),
    db.select({ value: count() }).from(schema.providerCustomerBalances).where(where),
  ]);
  const totalItems = Number(totals[0]?.value || 0);
  return NextResponse.json({ ok: true, balances: items, pagination: { page, pageSize: 20, totalItems, totalPages: Math.ceil(totalItems / 20) } });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminPermission("manage_finance"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const input = await request.json().catch(() => ({})) as Record<string, unknown>;
  const providerId = String(input.providerId || "").trim();
  const countryCode = String(input.countryCode || "BH").trim().toUpperCase();
  if (!providerId) return NextResponse.json({ ok: false, error: "PROVIDER_REQUIRED" }, { status: 400 });
  const validation = validateProviderBalanceDraft(input);
  if (!validation.ok) return NextResponse.json({ ok: false, error: validation.code }, { status: 400 });
  const [provider, country] = await Promise.all([
    db.select({ fullNameAr: schema.bahrainLawyers.fullNameAr, fullNameEn: schema.bahrainLawyers.fullNameEn }).from(schema.bahrainLawyers).where(and(eq(schema.bahrainLawyers.id, providerId), eq(schema.bahrainLawyers.countryCode, countryCode))).limit(1),
    getActiveCountry(countryCode),
  ]);
  if (!provider[0]) return NextResponse.json({ ok: false, error: "PROVIDER_NOT_FOUND" }, { status: 404 });
  if (!country) return NextResponse.json({ ok: false, error: "COUNTRY_NOT_AVAILABLE" }, { status: 400 });
  const [balance] = await db.insert(schema.providerCustomerBalances).values({
    publicReference: `BAL-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
    providerId, countryCode, providerNameAr: provider[0].fullNameAr, providerNameEn: provider[0].fullNameEn,
    customerName: validation.value.customerName, customerPhone: validation.value.customerPhone,
    customerEmail: validation.value.customerEmail, description: validation.value.description,
    amount: validation.value.amount, currencyCode: country.currencyCode, dueDate: validation.value.dueDate,
  }).returning();
  return NextResponse.json({ ok: true, balance }, { status: 201 });
}
