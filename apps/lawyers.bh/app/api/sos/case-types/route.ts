import { NextResponse } from "next/server";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { listEmergencyCaseTypes } from "@/lib/sos/emergencyCaseCatalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const countryCode = (url.searchParams.get("countryCode") || "BH")
    .trim()
    .toUpperCase();

  let country;
  try {
    country = await requireCountryProduct(countryCode, "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  try {
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
          price: item.baseFeeBhd,
          currencyCode: item.currencyCode,
          iconKey: item.iconKey,
          iconUrl: item.iconUrl,
          workflowType: item.workflowType,
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
