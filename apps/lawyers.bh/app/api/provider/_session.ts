import crypto from "crypto";
import { type NextRequest, type NextResponse } from "next/server";

export const PROVIDER_SESSION_COOKIE = "provider_session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret() {
  const secret =
    process.env.LAWYER_AUTH_SECRET ||
    process.env.PROVIDER_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("LAWYER_AUTH_SECRET is required in production");
  }

  return secret || "dev-provider-session-secret";
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(value)
    .digest("base64url");
}

function normalizeCountryCode(countryCode?: string) {
  const normalized = (countryCode || "BH").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(normalized) ? normalized : "BH";
}

export function createProviderSessionValue(
  providerId: string,
  countryCode = "BH",
) {
  const payload = `${normalizeCountryCode(countryCode)}:${providerId}`;
  return `${payload}.${sign(payload)}`;
}

export function getProviderSessionFromRequest(request: NextRequest) {
  const raw = request.cookies.get(PROVIDER_SESSION_COOKIE)?.value;
  return verifyProviderSessionValue(raw);
}

export function verifyProviderSessionValue(raw?: string) {
  if (!raw) return null;

  const separatorIndex = raw.lastIndexOf(".");
  if (separatorIndex <= 0) return null;

  const payload = raw.slice(0, separatorIndex);
  const signature = raw.slice(separatorIndex + 1);
  const expectedSignature = sign(payload);

  try {
    const current = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);

    if (current.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(current, expected)) return null;
  } catch {
    return null;
  }

  // New multi-country format: CC:uuid
  const multiCountryMatch = payload.match(/^([A-Z]{2}):(.+)$/);
  if (multiCountryMatch) {
    return {
      providerId: multiCountryMatch[2],
      countryCode: multiCountryMatch[1],
    };
  }

  // Backward compatibility with existing sessions that only stored the UUID.
  return { providerId: payload, countryCode: "BH" };
}

export function getProviderIdFromRequest(request: NextRequest) {
  return getProviderSessionFromRequest(request)?.providerId ?? null;
}

export function getProviderCountryFromRequest(request: NextRequest) {
  return getProviderSessionFromRequest(request)?.countryCode ?? null;
}

export function setProviderSession(
  response: NextResponse,
  providerId: string,
  countryCode = "BH",
) {
  response.cookies.set({
    name: PROVIDER_SESSION_COOKIE,
    value: createProviderSessionValue(providerId, countryCode),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearProviderSession(response: NextResponse) {
  response.cookies.set({
    name: PROVIDER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
