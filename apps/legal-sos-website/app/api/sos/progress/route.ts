import { NextRequest, NextResponse } from "next/server";
import { isCaptured, requestIdPattern, sosAccessToken, sosBackendOrigin, sosPaymentStatus } from "@/lib/sos-server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId")?.trim() || "";
  const token = sosAccessToken(request, requestId);
  if (!requestIdPattern.test(requestId) || !token) {
    return NextResponse.json({ error: "request_access_denied" }, { status: 403 });
  }
  try {
    const payment = await sosPaymentStatus(requestId, token);
    if (!payment.response.ok) {
      return NextResponse.json({ error: "payment_status_unavailable" }, { status: payment.response.status });
    }
    const paid = isCaptured(payment.data);
    const dispatchToken = typeof payment.data.dispatchToken === "string" ? payment.data.dispatchToken : "";
    let dispatch: Record<string, unknown> = {};
    if (paid && dispatchToken) {
      const response = await fetch(
        sosBackendOrigin() + "/api/mobile/sos/requests/" + encodeURIComponent(requestId) + "/status",
        { cache: "no-store", headers: { Accept: "application/json", Authorization: "Bearer " + dispatchToken } },
      );
      if (response.ok) dispatch = await response.json() as Record<string, unknown>;
    }
    return NextResponse.json({
      ok: true,
      paid,
      paymentStatus: String(payment.data.status || payment.data.paymentStatus || "pending_payment"),
      tapStatus: String(payment.data.tapStatus || ""),
      requestId,
      reference: String(dispatch.requestReference || requestId),
      workflowType: String(dispatch.workflowType || ""),
      serviceStatus: String(dispatch.serviceStatus || ""),
      state: String(dispatch.state || ""),
      candidate: dispatch.candidate || null,
      acceptedLawyer: dispatch.acceptedLawyer || null,
      locationAddress: dispatch.locationAddress || null,
      customerLocation: dispatch.customerLocation || null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "request_status_unavailable" }, { status: 502 });
  }
}
