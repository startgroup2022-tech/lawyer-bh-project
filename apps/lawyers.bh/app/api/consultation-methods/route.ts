import { NextResponse } from "next/server";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { listConsultationMethods } from "@/lib/booking/consultationMethodCatalog";

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

  try {
    const methods = await listConsultationMethods(country);

    return NextResponse.json(
      {
        ok: true,
        country: {
          code: country.code,
          currencyCode: country.currencyCode,
        },
        methods: methods.map((method) => ({
          id: method.id,
          code: method.code,
          nameAr: method.name.ar,
          nameEn: method.name.en,
          price: method.price,
          currencyCode: method.currencyCode,
          durationMinutes: method.durationMinutes,
          iconKey: method.iconKey,
          sortOrder: method.sortOrder,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[consultation-methods] failed to load catalogue", error);

    return NextResponse.json(
      { ok: false, error: "consultation_methods_unavailable" },
      { status: 500 },
    );
  }
}
