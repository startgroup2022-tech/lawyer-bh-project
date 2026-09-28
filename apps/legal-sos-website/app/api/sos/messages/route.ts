import { NextRequest, NextResponse } from "next/server";
import { requestIdPattern, sosAccessToken, sosBackendOrigin } from "@/lib/sos-server";

export const runtime = "nodejs";

async function relay(request: NextRequest, requestId: string, init: RequestInit) {
  const token = sosAccessToken(request, requestId);
  if (!requestIdPattern.test(requestId) || !token) {
    return NextResponse.json({ error: "request_access_denied" }, { status: 403 });
  }
  try {
    const response = await fetch(
      sosBackendOrigin() + "/api/mobile/communications/" + encodeURIComponent(requestId) + "/messages",
      { ...init, cache: "no-store", headers: {
        Accept: "application/json",
        "x-request-access-token": token,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
      } },
    );
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "messages_unavailable" }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  return relay(request, request.nextUrl.searchParams.get("requestId") || "", { method: "GET" });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const requestId = typeof body?.requestId === "string" ? body.requestId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const clientMessageId = typeof body?.clientMessageId === "string" ? body.clientMessageId : "";
  if (!message || message.length > 4000 || !requestIdPattern.test(clientMessageId)) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }
  return relay(request, requestId, {
    method: "POST",
    body: JSON.stringify({ body: message, clientMessageId }),
  });
}
