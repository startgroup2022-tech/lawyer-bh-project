import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";
import { parseDiscountPayload } from "@/lib/discounts/admin-validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminPermission("manage_discounts"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const values = parseDiscountPayload(await request.json());
    const [code] = await db.update(schema.discountCodes).set({ ...values, updatedAt: new Date() }).where(eq(schema.discountCodes.id, id)).returning();
    if (!code) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, code });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "invalid_payload" }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminPermission("manage_discounts"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.discountRedemptions).where(eq(schema.discountRedemptions.discountCodeId, id));
  if (count > 0) {
    await db.update(schema.discountCodes).set({ isActive: false, updatedAt: new Date() }).where(eq(schema.discountCodes.id, id));
  } else {
    await db.delete(schema.discountCodes).where(eq(schema.discountCodes.id, id));
  }
  return NextResponse.json({ ok: true, disabled: count > 0 });
}
