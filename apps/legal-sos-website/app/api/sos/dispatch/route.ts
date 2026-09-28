import { NextRequest, NextResponse } from "next/server";
import { isCaptured, requestIdPattern, sosAccessToken, sosBackendOrigin, sosPaymentStatus } from "@/lib/sos-server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const requestId = typeof body?.requestId === "string" ? body.requestId.trim() : "";
  const token = sosAccessToken(request, requestId);
  if (!requestIdPattern.test(requestId) || !token) {
    return NextResponse.json({ error: "request_access_denied" }, { status: 403 });
  }
  const action = body?.action;
  const candidateId = typeof body?.candidateId === "string" ? body.candidateId : "";
  if (action !== "find" && action !== "approve" && action !== "skip") {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  if (action !== "find" && !requestIdPattern.test(candidateId)) {
    return NextResponse.json({ error: "invalid_candidate" }, { status: 400 });
  }
  try {
    const payment = await sosPaymentStatus(requestId, token);
    const dispatchToken = typeof payment.data.dispatchToken === "string" ? payment.data.dispatchToken : "";
    if (!payment.response.ok || !isCaptured(payment.data) || !dispatchToken) {
      return NextResponse.json({ error: "payment_not_confirmed" }, { status: 409 });
    }
    const url = sosBackendOrigin() + "/api/mobile/sos/requests/" + encodeURIComponent(requestId) +
      "/candidate" + (action === "find" ? "" : "/decision");
    const payload = action === "find" ? {
      latitude: body?.latitude, longitude: body?.longitude,
      address: typeof body?.address === "string" ? body.address.slice(0, 300) : undefined,
    } : { action, candidateId };
    const response = await fetch(url, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: "Bearer " + dispatchToken },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    return NextResponse.json(data, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "dispatch_unavailable" }, { status: 502 });
  }
}
