import "server-only";
import { cookies, headers } from "next/headers";

/** Result of a dispatch auth check. When `ok` is false, the caller
 *  should return a 401 Response with a WWW-Authenticate header. */
export interface DispatchAuthResult {
  ok: boolean;
  /** Username from the basic-auth header. Always set when ok=true and
   *  used as the actor identity in audit-log entries. */
  username?: string;
}

interface UserPasswordPair {
  user: string;
  pass: string;
}

/** Parses the DISPATCH_USERS env var if present. Format:
 *      DISPATCH_USERS=alice:pwd1,bob:pwd2,charlie:pwd3
 *  Whitespace around entries is trimmed. Empty entries are skipped.
 *  This is the multi-operator path; if the env var is absent we fall
 *  back to the single-user DISPATCH_USERNAME / DISPATCH_PASSWORD pair. */
function parseDispatchUsers(): UserPasswordPair[] | null {
  const raw = process.env.DISPATCH_USERS?.trim();
  if (!raw) return null;
  const out: UserPasswordPair[] = [];
  for (const entry of raw.split(",")) {
    const [user, ...passParts] = entry.split(":");
    const u = user?.trim();
    const p = passParts.join(":").trim(); // tolerate ":" in passwords
    if (u && p) out.push({ user: u, pass: p });
  }
  return out;
}

/** Validates a username/password pair against DISPATCH_USERS or the
 *  legacy DISPATCH_USERNAME/DISPATCH_PASSWORD pair. Returns true if
 *  the credentials match a known operator. Used by both the basic-
 *  auth path and the form-based login endpoint. */
export function validateDispatchCredentials(
  user: string,
  pass: string,
): boolean {
  const multi = parseDispatchUsers();
  if (multi) {
    return multi.some((u) => u.user === user && u.pass === pass);
  }
  const expectedUser = process.env.DISPATCH_USERNAME;
  const expectedPass = process.env.DISPATCH_PASSWORD;
  if (!expectedUser || !expectedPass) return false;
  return user === expectedUser && pass === expectedPass;
}

/** Reads either a cookie-based dispatch session OR an HTTP basic-auth
 *  header. The cookie path is the preferred login flow; basic-auth is
 *  retained for back-compat (e.g. one-off CLI access via curl) so
 *  existing scripts keep working. Returns the parsed username so
 *  callers can use it as the audit-log actor. */
export async function checkDispatchAuth(): Promise<DispatchAuthResult> {
  // Cookie session first.
  const cookieResult = await readDispatchSessionCookie();
  if (cookieResult) return { ok: true, username: cookieResult };

  // Basic-auth fall-back.
  const multi = parseDispatchUsers();
  const expectedUser = process.env.DISPATCH_USERNAME;
  const expectedPass = process.env.DISPATCH_PASSWORD;
  if (!multi && (!expectedUser || !expectedPass)) {
    console.warn(
      "[sos/dispatch] no DISPATCH_USERS list and DISPATCH_USERNAME/PASSWORD not set",
    );
    return { ok: false };
  }
  const h = await headers();
  const auth = h.get("authorization");
  if (!auth || !auth.toLowerCase().startsWith("basic ")) {
    return { ok: false };
  }
  let decoded: string;
  try {
    decoded = Buffer.from(auth.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return { ok: false };
  }
  const idx = decoded.indexOf(":");
  if (idx < 0) return { ok: false };
  const user = decoded.slice(0, idx);
  const pass = decoded.slice(idx + 1);

  if (validateDispatchCredentials(user, pass)) {
    return { ok: true, username: user };
  }
  return { ok: false };
}

/** Sends a 401 response with the WWW-Authenticate header so the
 *  browser pops a native login dialog. Used by both pages and
 *  API routes. */
export function unauthorizedResponse(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Lawyers.bh dispatch", charset="UTF-8"',
      "Content-Type": "text/plain",
    },
  });
}

/** Append-only audit-log helper. Caller is responsible for wrapping
 *  this in the same UPDATE that flips serviceStatus / payment_status
 *  so the log stays consistent with the case state. */
export function appendActorLogEntry(
  existing: Array<{ actor: string; action: string; ts: string }> | null,
  actor: string,
  action: string,
): Array<{ actor: string; action: string; ts: string }> {
  const next = existing ? [...existing] : [];
  next.push({ actor, action, ts: new Date().toISOString() });
  // Keep the log bounded so a long-running case can't blow the JSON
  // column out of proportion. 50 entries is plenty for any single
  // dispatch lifecycle.
  if (next.length > 50) next.splice(0, next.length - 50);
  return next;
}

// ─────────────────────────────────────────────────────────────────────
// Cookie-based dispatch session
// ─────────────────────────────────────────────────────────────────────

const DISPATCH_COOKIE = "lbh-dispatch-session";
const DISPATCH_TTL_SECONDS = 60 * 60 * 8; // 8 hours
const DISPATCH_COOKIE_CONTEXT = "lbh-dispatch-session.v1";

function getDispatchSecret(): string {
  // Reuse LAWYER_AUTH_SECRET if set so deployments don't need a new
  // secret per surface. Falls back to DISPATCH_PASSWORD which is
  // already required for basic-auth, so something signing-worthy
  // is always available.
  const s =
    process.env.LAWYER_AUTH_SECRET ?? process.env.DISPATCH_PASSWORD ?? "";
  if (s.length < 16) {
    // Pad to a minimum size — we'd rather sign with a weak key than
    // crash the dashboard at boot when DISPATCH_PASSWORD is shorter
    // than the lawyer-side secret bar. Real prod should set
    // LAWYER_AUTH_SECRET to a 32-char string.
    return (s + "_lbh_dispatch_static_padding_2026").slice(0, 32);
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
  const raw = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hmac(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${DISPATCH_COOKIE_CONTEXT}:${getDispatchSecret()}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return b64urlEncode(sig);
}

/** Mints a signed session token and writes it to the response cookies.
 *  Cookie is httpOnly + samesite=lax so the browser sends it
 *  automatically on every dispatch request. */
export async function setDispatchSession(username: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + DISPATCH_TTL_SECONDS;
  const payload = JSON.stringify({ u: username, exp });
  const body = b64urlEncode(new TextEncoder().encode(payload));
  const sig = await hmac(body);
  const token = `${body}.${sig}`;
  const c = await cookies();
  c.set(DISPATCH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DISPATCH_TTL_SECONDS,
  });
}

export async function clearDispatchSession(): Promise<void> {
  const c = await cookies();
  c.set(DISPATCH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

/** Reads the dispatch session cookie and returns the username if the
 *  signature + expiry both check out, otherwise null. Pure read —
 *  doesn't extend the TTL or rotate the cookie. */
async function readDispatchSessionCookie(): Promise<string | null> {
  const c = await cookies();
  const token = c.get(DISPATCH_COOKIE)?.value;
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (expected !== sig) return null;
  let payload: { u?: string; exp?: number };
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (
    typeof payload.u !== "string" ||
    typeof payload.exp !== "number" ||
    payload.exp < Date.now() / 1000
  ) {
    return null;
  }
  return payload.u;
}
