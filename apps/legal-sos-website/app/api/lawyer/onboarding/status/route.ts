import { readOnboardingCookie } from "@/lib/lawyer-onboarding-session";
import {
  lawyerOnboardingBackendOrigin,
  noStoreJson,
  safeBackendJson,
} from "@/lib/lawyer-onboarding-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const token = readOnboardingCookie(request);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return noStoreJson({ ok: false, code: "ONBOARDING_SESSION_REQUIRED" }, 401);
  }

  try {
    const response = await fetch(
      `${lawyerOnboardingBackendOrigin()}/api/legalsos/lawyers/onboarding/status`,
      {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    const payload = await safeBackendJson(response);
    return payload
      ? noStoreJson(payload, response.status)
      : noStoreJson({ ok: false, code: "INVALID_BACKEND_RESPONSE" }, 502);
  } catch {
    return noStoreJson({ ok: false, code: "ONBOARDING_UNAVAILABLE" }, 502);
  }
}
