import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const countryCode = (url.searchParams.get("countryCode") || "BH")
    .trim()
    .toUpperCase();

  let country;
  try {
    country = await requireCountryProduct(countryCode, "lawyers");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  // bahrain_lawyers is the inheritance parent, so it can query every child
  // country table. The country_code condition keeps this response isolated.
  const lawyers = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      fullNameAr: schema.bahrainLawyers.fullNameAr,
      fullNameEn: schema.bahrainLawyers.fullNameEn,
      phone: schema.bahrainLawyers.phone,
      email: schema.bahrainLawyers.email,
      status: schema.bahrainLawyers.status,
      subscriptionType: schema.bahrainLawyers.subscriptionType,
      isReviewAccount: schema.bahrainLawyers.isReviewAccount,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.countryCode, country.code),
        eq(schema.bahrainLawyers.status, "approved"),
        eq(schema.bahrainLawyers.isActive, true),
        eq(schema.bahrainLawyers.isReviewAccount, false),
      ),
    );

  return NextResponse.json({
    ok: true,
    countryCode: country.code,
    data: lawyers
      .filter((lawyer) => !lawyer.isReviewAccount)
      .map((lawyer) => ({
        id: lawyer.id,
        countryCode: lawyer.countryCode,
        fullNameAr: lawyer.fullNameAr,
        fullNameEn: lawyer.fullNameEn,
        phone: lawyer.phone,
        email: lawyer.email,
        status: lawyer.status,
        subscriptionType: lawyer.subscriptionType,
      })),
  });
}
