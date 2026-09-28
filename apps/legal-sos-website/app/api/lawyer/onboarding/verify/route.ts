import {
  assertSameOrigin,
  serializeOnboardingCookie,
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
    const body = await request.json();
    const response = await fetch(
      `${lawyerOnboardingBackendOrigin()}/api/legalsos/lawyers/onboarding/verify`,
      {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const payload = await safeBackendJson(response);
    if (!payload) {
      return noStoreJson({ ok: false, code: "INVALID_BACKEND_RESPONSE" }, 502);
    }

    const accessToken =
      typeof payload.onboardingAccessToken === "string"
        ? payload.onboardingAccessToken
        : "";
    delete payload.onboardingAccessToken;
    const headers = new Headers();
    if (response.ok && /^[A-Za-z0-9_-]{43}$/.test(accessToken)) {
      headers.set("Set-Cookie", serializeOnboardingCookie(request, accessToken));
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
