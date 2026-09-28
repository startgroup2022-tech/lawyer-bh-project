import {
  assertSameOrigin,
  clearOnboardingCookie,
  readOnboardingCookie,
} from "@/lib/lawyer-onboarding-session";
import {
  lawyerOnboardingBackendOrigin,
  noStoreJson,
  safeBackendJson,
} from "@/lib/lawyer-onboarding-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const token = readOnboardingCookie(request);
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return noStoreJson({ ok: false, code: "ONBOARDING_SESSION_REQUIRED" }, 401);
    }
    const form = await request.formData();
    const response = await fetch(
      `${lawyerOnboardingBackendOrigin()}/api/legalsos/lawyers/onboarding/submit`,
      {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        body: form,
        cache: "no-store",
      },
    );
    const payload = await safeBackendJson(response);
    if (!payload) {
      return noStoreJson({ ok: false, code: "INVALID_BACKEND_RESPONSE" }, 502);
    }
    const headers = new Headers();
    if (response.ok && payload.nextStep === "pending_approval") {
      headers.set("Set-Cookie", clearOnboardingCookie(request));
    }
    return noStoreJson(payload, response.status, headers);
  } catch (error) {
    const denied = error instanceof Error && error.message === "ORIGIN_DENIED";
    return noStoreJson(
      { ok: false, code: denied ? "ORIGIN_DENIED" : "ONBOARDING_UNAVAILABLE" },
      denied ? 403 : 502,
    );
  }
}
