import { NextResponse } from "next/server";
import { assertKsaInputCountry } from "@/lib/ksa/context";
import { listActiveKsaLawyers } from "@/lib/ksa/lawyers";

export const runtime = "nodejs";
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

  const lawyers = await listActiveKsaLawyers();

  return NextResponse.json({
    ok: true,
    countryCode: "SA",
    data: lawyers,
  });
}
