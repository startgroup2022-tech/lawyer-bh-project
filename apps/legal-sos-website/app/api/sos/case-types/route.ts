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

export async function GET(request: Request) {
  const countryCode = new URL(request.url).searchParams.get("countryCode")?.trim().toUpperCase() ?? "";
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return Response.json({ ok: false, error: "invalid_country" }, { status: 400 });
  }
  try {
    const response = await fetch(`${backendOrigin()}/api/sos/case-types?countryCode=${encodeURIComponent(countryCode)}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Emergency cases unavailable");
    const payload = await response.json();
    if (payload.ok !== true || !Array.isArray(payload.cases)) throw new Error("Invalid emergency cases response");
    return Response.json({ ok: true, cases: payload.cases }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "emergency_cases_unavailable" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
