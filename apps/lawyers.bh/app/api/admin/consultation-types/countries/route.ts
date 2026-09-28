import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdminPermission("manage_consultation_types"))) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  const countries = await db.select({ code: schema.countries.code, nameAr: schema.countries.nameAr, nameEn: schema.countries.nameEn, currencyCode: schema.countries.currencyCode })
    .from(schema.countries).where(and(eq(schema.countries.isActive, true), eq(schema.countries.tablesProvisioned, true))).orderBy(asc(schema.countries.code));
  return NextResponse.json({ ok: true, countries }, { headers: { "Cache-Control": "no-store" } });
}
