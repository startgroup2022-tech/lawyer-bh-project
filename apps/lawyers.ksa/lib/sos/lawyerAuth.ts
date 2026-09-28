import "server-only";
import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

// Two distinct signing contexts so a magic-link token can never be
// reused as a session cookie or vice versa.
const SESSION_CONTEXT = "lbh-sos-advocate-session.v1";
const MAGIC_CONTEXT = "lbh-sos-advocate-magic.v1";

const SESSION_COOKIE = "lbh-advocate-session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const MAGIC_TTL_SECONDS = 60 * 15; // 15 minutes

function getSecret(): string {
  const s = process.env.LAWYER_AUTH_SECRET ?? process.env.DISPATCH_PASSWORD;
  if (!s || s.length < 16) {
    throw new Error(
      "LAWYER_AUTH_SECRET must be set to a string of 16+ chars in .env.local",
    );
  }
  return s;
}

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of view) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const decoded = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) out[i] = decoded.charCodeAt(i);
  return out;
}

async function hmac(context: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${context}:${getSecret()}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64urlEncode(sig);
}

interface TokenPayload {
  advocateId: string;
  countryCode: string;
  exp: number; // unix seconds
  /** "session" | "magic" — second-level guard against confused contexts. */
  kind: "session" | "magic";
}

async function signToken(
  context: string,
  payload: TokenPayload,
): Promise<string> {
  const json = JSON.stringify(payload);
  const body = b64urlEncode(new TextEncoder().encode(json));
  const sig = await hmac(context, body);
  return `${body}.${sig}`;
}

async function verifyToken(
  context: string,
  token: string,
): Promise<TokenPayload | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(context, body);
  if (expected !== sig) return null;
  let payload: TokenPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (
    typeof payload.exp !== "number" ||
    payload.exp < Date.now() / 1000 ||
    !/^[A-Z]{2}$/.test(payload.countryCode)
  ) return null;
  return payload;
}

export async function createMagicLinkToken(
  advocateId: string,
  countryCode: string,
): Promise<string> {
  return signToken(MAGIC_CONTEXT, {
    advocateId,
    countryCode: countryCode.toUpperCase(),
    exp: Math.floor(Date.now() / 1000) + MAGIC_TTL_SECONDS,
    kind: "magic",
  });
}

export async function consumeMagicLinkToken(
  token: string,
): Promise<{ advocateId: string; countryCode: string } | null> {
  const p = await verifyToken(MAGIC_CONTEXT, token);
  if (!p || p.kind !== "magic" || !/^[A-Z]{2}$/.test(p.countryCode)) return null;
  return { advocateId: p.advocateId, countryCode: p.countryCode };
}

export async function setAdvocateSession(
  advocateId: string,
  countryCode: string,
): Promise<void> {
  const token = await signToken(SESSION_CONTEXT, {
    advocateId,
    countryCode: countryCode.toUpperCase(),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    kind: "session",
  });
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdvocateSession(): Promise<void> {
  const c = await cookies();
  c.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export interface AdvocateSession {
  id: string;
  countryCode: string;
  fullName: string;
  registrationNo: string;
  email: string | null;
  phone: string;
  isEmergencyReady: boolean;
  emergencyRadiusKm: number;
  baseLocation: { lat: number; lng: number; address?: string } | null;
}

export async function getCurrentAdvocate(): Promise<AdvocateSession | null> {
  const c = await cookies();
  const token = c.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const p = await verifyToken(SESSION_CONTEXT, token);
  if (!p || p.kind !== "session") return null;
  const [row] = await db
    .select({
      id: schema.saudiLawyers.id,
      countryCode: schema.saudiLawyers.countryCode,
      fullName: schema.saudiLawyers.fullNameAr,
      registrationNo: schema.saudiLawyers.registrationNo,
      email: schema.saudiLawyers.email,
      phone: schema.saudiLawyers.phone,
      isEmergencyReady: schema.saudiLawyers.isEmergencyReady,
      emergencyRadiusKm: schema.saudiLawyers.emergencyRadiusKm,
      baseLocation: schema.saudiLawyers.baseLocation,
      isActive: schema.saudiLawyers.isActive,
    })
    .from(schema.saudiLawyers)
    .where(
      and(
        eq(schema.saudiLawyers.id, p.advocateId),
        eq(schema.saudiLawyers.countryCode, p.countryCode),
      ),
    )
    .limit(1);
  if (!row || !row.isActive) return null;
  return row;
}

/** Helper for API routes — returns null if unauthenticated, used to
 *  short-circuit with a 401 response. */
export async function requireAdvocate(): Promise<
  | { ok: true; advocate: AdvocateSession }
  | { ok: false; status: 401 }
> {
  const advocate = await getCurrentAdvocate();
  if (!advocate) return { ok: false, status: 401 };
  return { ok: true, advocate };
}

/** Get the calling client's IP / UA for audit logs. */
export async function getRequestMeta(): Promise<{
  ip: string | null;
  userAgent: string | null;
}> {
  const h = await headers();
  return {
    ip:
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null,
    userAgent: h.get("user-agent"),
  };
}
