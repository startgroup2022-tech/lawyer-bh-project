import { NextResponse } from "next/server";
import { assertKsaInputCountry, getKsaContext } from "@/lib/ksa/context";
import { listEmergencyCaseTypes } from "@/lib/sos/emergencyCaseCatalog";

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
    const cases = await listEmergencyCaseTypes(country);

    return NextResponse.json(
      {
        ok: true,
        country: {
          code: country.code,
          nameAr: country.nameAr,
          nameEn: country.nameEn,
          currencyCode: country.currencyCode,
        },
        cases: cases.map((item) => ({
          id: item.id,
          slug: item.slug,
          nameAr: item.label.ar,
          nameEn: item.label.en,
          descriptionAr: item.helper.ar,
          descriptionEn: item.helper.en,
          actionTypeAr: item.actionType.ar,
          actionTypeEn: item.actionType.en,
          price: item.baseFee,
          currencyCode: item.currencyCode,
          iconKey: item.iconKey,
          sortOrder: item.sortOrder,
        })),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("[sos/case-types] failed to load catalogue", error);

    return NextResponse.json(
      {
        ok: false,
        error: "emergency_case_catalog_unavailable",
      },
      { status: 500 },
    );
  }
}
