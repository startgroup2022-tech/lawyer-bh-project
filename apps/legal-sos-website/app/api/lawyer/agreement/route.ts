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
  try {
    const searchParams = new URL(request.url).searchParams;
    const locale = searchParams.get("locale") === "ar" ? "ar" : "en";
    const countryCode = searchParams.get("countryCode")?.trim().toUpperCase() || "BH";
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      return Response.json(
        { error: "invalid_country" },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    const response = await fetch(
      `${backendOrigin()}/api/mobile/legal-documents/lawyer-agreement?locale=${locale}&countryCode=${countryCode}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    if (!response.ok) throw new Error("Agreement unavailable");
    const payload = await response.json();
    if (typeof payload.content !== "string" || !payload.content.trim()) {
      throw new Error("Agreement content unavailable");
    }
    return Response.json(
      { content: payload.content, version: payload.version, id: payload.id },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "agreement_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
