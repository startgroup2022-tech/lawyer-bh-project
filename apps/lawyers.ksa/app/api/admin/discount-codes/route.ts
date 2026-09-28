import { NextResponse } from "next/server";
import { asc, sql } from "drizzle-orm";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import { parseDiscountPayload } from "@/lib/discounts/admin-validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdminPermission("manage_discounts");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const codes = await db.select({
    id: schema.discountCodes.id, code: schema.discountCodes.code, discountType: schema.discountCodes.discountType,
    discountValue: schema.discountCodes.discountValue, isActive: schema.discountCodes.isActive,
    startsAt: schema.discountCodes.startsAt, endsAt: schema.discountCodes.endsAt,
    totalUsageLimit: schema.discountCodes.totalUsageLimit, perUserUsageLimit: schema.discountCodes.perUserUsageLimit,
    redeemedCount: sql<number>`count(${schema.discountRedemptions.id})::int`,
  }).from(schema.discountCodes).leftJoin(schema.discountRedemptions, sql`${schema.discountRedemptions.discountCodeId} = ${schema.discountCodes.id} AND ${schema.discountRedemptions.status} = 'redeemed'`)
    .groupBy(schema.discountCodes.id).orderBy(asc(schema.discountCodes.code));
  return NextResponse.json({ ok: true, codes, canWrite: true });
}

export async function POST(request: Request) {
  const admin = await requireAdminPermission("manage_discounts");
  if (!admin) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const values = parseDiscountPayload(await request.json());
    const [code] = await db.insert(schema.discountCodes).values({ ...values, createdBy: admin.id }).returning();
    return NextResponse.json({ ok: true, code }, { status: 201 });
  } catch (error) {
    const duplicate = error instanceof Error && /unique|duplicate/i.test(error.message);
    return NextResponse.json({ ok: false, error: duplicate ? "duplicate_code" : error instanceof Error ? error.message : "invalid_payload" }, { status: duplicate ? 409 : 400 });
  }
}
