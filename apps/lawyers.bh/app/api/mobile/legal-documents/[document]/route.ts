import { NextResponse } from "next/server";
import { getPublishedTerms } from "@/lib/terms-management/service";

export const dynamic = "force-dynamic";
const headers = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
export async function GET(request: Request, { params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (document !== "terms" && document !== "privacy" && document !== "lawyer-agreement") return NextResponse.json({error: "not_found"}, {status:404, headers});
  const searchParams = new URL(request.url).searchParams;
  const ar = searchParams.get("locale") === "ar";
  const submittedCountryCode = searchParams.get("countryCode")?.trim().toUpperCase() || "BH";
  if (document === "lawyer-agreement" && !/^[A-Z]{2}$/.test(submittedCountryCode)) {
    return NextResponse.json({error:"invalid_country"}, {status:400, headers});
  }
  try {
    const type = document === "lawyer-agreement" ? "legalsos_lawyer_agreement" : document === "terms" ? "legalsos_terms" : "legalsos_privacy";
    const version = document === "lawyer-agreement"
      ? await getPublishedTerms(type, {countryCode: submittedCountryCode})
      : await getPublishedTerms(type);
    if (!version) return NextResponse.json({error:"unavailable"}, {status:503, headers});
    return NextResponse.json({content: ar ? version.contentAr : version.contentEn, version: version.version, id: version.id}, {headers});
  } catch {
    return NextResponse.json({error:"unavailable"}, {status:503, headers});
  }
}
