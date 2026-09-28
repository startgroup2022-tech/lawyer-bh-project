import { NextResponse } from "next/server";
import { listConsultationMethods } from "@/lib/booking/consultationMethodCatalog";
import { assertKsaInputCountry, getKsaContext } from "@/lib/ksa/context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    assertKsaInputCountry(url.searchParams.get("countryCode"));
  } catch {
    return NextResponse.json(
      { ok: false, error: "KSA_COUNTRY_REQUIRED" },
      { status: 400 },
    );
  }

  try {
    const { country } = await getKsaContext();
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
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
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
