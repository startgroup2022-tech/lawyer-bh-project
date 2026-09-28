import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const countries = await db
      .select({
        code: schema.countries.code,
        nameAr: schema.countries.nameAr,
        nameEn: schema.countries.nameEn,
        phoneCode: schema.countries.phoneCode,
        currencyCode: schema.countries.currencyCode,
        defaultLocale: schema.countries.defaultLocale,
      })
      .from(schema.countries)
      .where(
        and(
          eq(schema.countries.isActive, true),
          eq(schema.countries.tablesProvisioned, true),
        ),
      )
      .orderBy(asc(schema.countries.code));

    return NextResponse.json(
      {
        ok: true,
        countries,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[countries] failed to load active countries", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Could not load active countries",
        countries: [],
      },
      { status: 500 },
    );
  }
}
