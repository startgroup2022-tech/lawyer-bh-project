import { NextRequest, NextResponse } from "next/server";
import { requestIdPattern, sosAccessToken, sosBackendOrigin } from "@/lib/sos-server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const response = await fetch(`${sosBackendOrigin()}/api/mobile/tap/web-card`, { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "card_unavailable" }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
  const tokenId = typeof body?.tokenId === "string" ? body.tokenId.trim() : "";
  const phoneDialCode = typeof body?.phoneDialCode === "string" ? body.phoneDialCode.trim() : "";
  const locale = body?.locale === "ar" ? "ar" : "en";
  const accessToken = sosAccessToken(request, requestId);
  if (!requestIdPattern.test(requestId) || !accessToken) return NextResponse.json({ error: "request_access_denied" }, { status: 403 });
  if (!/^tok_[A-Za-z0-9_-]+$/.test(tokenId) || !/^[1-9]\d{0,3}$/.test(phoneDialCode)) {
    return NextResponse.json({ error: "invalid_card_request" }, { status: 400 });
  }
  try {
    const response = await fetch(`${sosBackendOrigin()}/api/mobile/tap/web-card`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ bookingId: requestId, tokenId, phoneDialCode, locale }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "card_unavailable" }, { status: 502 });
  }
}
