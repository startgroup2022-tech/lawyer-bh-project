import { assertSameOrigin } from "@/lib/lawyer-onboarding-session";
import {
  lawyerOnboardingBackendOrigin,
  noStoreJson,
  safeBackendJson,
} from "@/lib/lawyer-onboarding-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json();
    const response = await fetch(
      `${lawyerOnboardingBackendOrigin()}/api/legalsos/lawyers/onboarding/start`,
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const payload = await safeBackendJson(response);
    return payload
      ? noStoreJson(payload, response.status)
      : noStoreJson({ ok: false, code: "INVALID_BACKEND_RESPONSE" }, 502);
  } catch (error) {
    const denied = error instanceof Error && error.message === "ORIGIN_DENIED";
    return noStoreJson(
      { ok: false, code: denied ? "ORIGIN_DENIED" : "ONBOARDING_UNAVAILABLE" },
      denied ? 403 : 502,
    );
  }
}
