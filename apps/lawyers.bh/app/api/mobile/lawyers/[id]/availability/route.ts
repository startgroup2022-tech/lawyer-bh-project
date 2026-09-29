import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, schema, sqlClient } from "@/lib/db/client";
import {
  mapCountryProductAccessError,
  requireCountryProduct,
} from "@/lib/countries/product-access";
import { isValidDate } from "@/lib/booking/lawyerAvailability";
import { listAvailableSlots } from "@/lib/booking/lawyerAvailabilityStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

/**
 * The real free appointment slots for a lawyer on a date.
 *
 * Public, like the lawyer directory: it exposes only the times the lawyer has
 * published and not yet booked, never who booked them. A lawyer who is not
 * approved/active is treated as having no availability.
 */
export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  const url = new URL(request.url);
  const countryCode = (url.searchParams.get("countryCode") || "BH").trim().toUpperCase();
  const date = (url.searchParams.get("date") || "").trim();

  if (!isValidDate(date)) {
    return NextResponse.json(
      { ok: false, error: "invalid_date" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let country;
  try {
    country = await requireCountryProduct(countryCode, "lawyers");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  const [lawyer] = await db
    .select({ id: schema.bahrainLawyers.id })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.id, id),
        eq(schema.bahrainLawyers.countryCode, country.code),
        eq(schema.bahrainLawyers.status, "approved"),
        eq(schema.bahrainLawyers.isActive, true),
      ),
    )
    .limit(1);

  if (!lawyer) {
    return NextResponse.json(
      { ok: true, lawyerId: id, date, slots: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await listAvailableSlots(sqlClient, { lawyerId: id, date });
    return NextResponse.json(
      { ok: true, lawyerId: id, countryCode: country.code, ...result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[mobile/lawyers/:id/availability] failed", error);
    return NextResponse.json(
      { ok: false, error: "availability_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
