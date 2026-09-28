import { parseAppCountriesResponse } from "@/lib/app-countries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backendOrigin(): string {
  const configured = process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh";
  const url = new URL(configured);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }
  return url.origin;
}

export async function GET() {
  try {
    const response = await fetch(`${backendOrigin()}/api/countries?product=legal_sos`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not load countries");
    const countries = parseAppCountriesResponse(await response.json());
    if (!countries.length) throw new Error("No enabled countries");
    return Response.json({ ok: true, countries }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { ok: false, error: "Could not load countries", countries: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
