const localCookieName = "legalsos_lawyer_onboarding";
const secureCookieName = "__Host-legalsos_lawyer_onboarding";

export function onboardingCookieName(request: Request) {
  return new URL(request.url).protocol === "https:"
    ? secureCookieName
    : localCookieName;
}

export function serializeOnboardingCookie(
  request: Request,
  token: string,
  maxAge = 7 * 24 * 60 * 60,
) {
  const secure = new URL(request.url).protocol === "https:";
  return [
    `${onboardingCookieName(request)}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    secure ? "Secure" : "",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearOnboardingCookie(request: Request) {
  return serializeOnboardingCookie(request, "", 0);
}

export function readOnboardingCookie(request: Request) {
  const name = onboardingCookieName(request);
  const cookies = request.headers.get("cookie") ?? "";

  for (const part of cookies.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }

  return "";
}

export function assertSameOrigin(request: Request) {
  const suppliedOrigin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;
  if (suppliedOrigin !== expectedOrigin) throw new Error("ORIGIN_DENIED");
}
