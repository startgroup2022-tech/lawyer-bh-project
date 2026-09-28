import { NextRequest, NextResponse } from "next/server";
import { requestIdPattern, sosAccessToken, sosBackendOrigin } from "@/lib/sos-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
  const suppliedToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const token = sosAccessToken(request, requestId) || suppliedToken;
  if (!requestIdPattern.test(requestId) || !token) {
    return NextResponse.json({ error: "request_access_denied" }, { status: 403 });
  }
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) return NextResponse.json({ error: "invalid_description" }, { status: 400 });
  const phoneDialCode = typeof body?.phoneDialCode === "string" ? body.phoneDialCode : "";
  if (!/^[1-9]\d{0,3}$/.test(phoneDialCode)) return NextResponse.json({ error: "invalid_phone_dial_code" }, { status: 400 });
  const locale = body?.locale === "ar" || body?.locale === "tr" ? body.locale : "en";
  try {
    const response = await fetch(sosBackendOrigin() + "/api/mobile/tap/web-checkout", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ bookingId: requestId, locale, description, phoneDialCode }),
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "checkout_unavailable" }, { status: 502 });
  }
}
