import { NextRequest, NextResponse } from "next/server";
import { getPublishedTerms } from "@/lib/terms-management/service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") === "ar" ? "ar" : "en";
  const terms = await getPublishedTerms("lawyer_registration").catch((error) => {
    console.error("[registration-terms] failed to load lawyer registration terms", error);
    return null;
  });
  if (!terms) return NextResponse.json({ ok: false, error: "terms_version_required" }, { status: 503 });
  return NextResponse.json({
    ok: true,
    terms: {
      id: terms.id,
      version: terms.version,
      content: locale === "ar" ? terms.contentAr : terms.contentEn,
      platformPercentageYearOne: terms.platformPercentageYearOne,
      platformPercentageYearTwo: terms.platformPercentageYearTwo,
      lawyerPercentageYearOne: terms.lawyerPercentageYearOne,
      lawyerPercentageYearTwo: terms.lawyerPercentageYearTwo,
    },
  });
}
