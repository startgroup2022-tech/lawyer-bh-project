import "server-only";
import type { NextRequest } from "next/server";

export const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sosBackendOrigin() {
  const url = new URL(process.env.LEGAL_SOS_BACKEND_URL?.trim() || "https://www.lawyers.bh");
  if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error("LEGAL_SOS_BACKEND_URL must use HTTPS");
  }
  return url.origin;
}

export function sosAccessToken(request: NextRequest, requestId: string) {
  if (!requestIdPattern.test(requestId)) return "";
  return request.cookies.get("sos_access_" + requestId.replace(/-/g, ""))?.value || "";
}

export async function sosPaymentStatus(requestId: string, accessToken: string) {
  const response = await fetch(
    sosBackendOrigin() + "/api/mobile/tap/payment-status?bookingId=" + encodeURIComponent(requestId),
    { cache: "no-store", headers: { Accept: "application/json", Authorization: "Bearer " + accessToken } },
  );
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { response, data };
}

export function isCaptured(data: Record<string, unknown>) {
  const status = String(data.status || data.paymentStatus || "").toLowerCase();
  return (status === "paid" || status === "success") && data.tapStatus === "CAPTURED";
}
