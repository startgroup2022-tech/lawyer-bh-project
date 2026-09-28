// Opaque session cookies for the admin console.
//
// Why not JWT for admin: we want instant server-side revocation (kick out
// a leaked session), small cookies, and we already have a `sessions`
// table for mobile refresh tokens — reusing it keeps the auth surface
// area small.
//
// Mobile users get JWT access tokens + DB-tracked refresh tokens (see
// lib/auth/mobile-jwt.ts in a later phase). They're separate code paths
// because the mobile flow is phone+OTP, not email+password.

import { cookies } from "next/headers";
import { eq, and, gt, isNull } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { db, schema } from "@/lib/db/client";

const COOKIE_NAME = "lsos_admin_session";
/** Session lifetime — 12 hours of idle, refreshed on each authenticated request. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function newToken(): string {
  // 32 bytes = 256 bits of entropy — plenty.
  return randomBytes(32).toString("base64url");
}

/**
 * Create a new admin session and write the cookie. Returns nothing —
 * the cookie is the side effect the caller cares about.
 */
export async function createAdminSession(
  adminUserId: string,
  deviceInfo: Record<string, string> = {},
): Promise<void> {
  const token = newToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(schema.sessions).values({
    subject: "admin_user",
    subjectId: adminUserId,
    tokenHash,
    deviceInfo,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await db
    .update(schema.adminUsers)
    .set({ lastSignInAt: new Date() })
    .where(eq(schema.adminUsers.id, adminUserId));
}

export interface AdminSession {
  sessionId: string;
  adminUserId: string;
  email: string;
  fullName: string;
}

/**
 * Read the cookie, look up the session row, slide the expiry forward.
 * Returns null if absent, expired, or revoked.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: schema.sessions.id,
      adminUserId: schema.sessions.subjectId,
      email: schema.adminUsers.email,
      fullName: schema.adminUsers.fullName,
      isActive: schema.adminUsers.isActive,
    })
    .from(schema.sessions)
    .innerJoin(
      schema.adminUsers,
      eq(schema.sessions.subjectId, schema.adminUsers.id),
    )
    .where(
      and(
        eq(schema.sessions.tokenHash, tokenHash),
        eq(schema.sessions.subject, "admin_user"),
        gt(schema.sessions.expiresAt, now),
        isNull(schema.sessions.revokedAt),
      ),
    )
    .limit(1);

  if (!row || !row.isActive) return null;

  // Sliding expiry — bump lastUsedAt and extend expiresAt.
  const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
  await db
    .update(schema.sessions)
    .set({ lastUsedAt: now, expiresAt: newExpiry })
    .where(eq(schema.sessions.id, row.sessionId));

  // Re-issue cookie so browser also sees the new expiry.
  cookieStore.set({
    name: COOKIE_NAME,
    value: raw,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: newExpiry,
  });

  return {
    sessionId: row.sessionId,
    adminUserId: row.adminUserId,
    email: row.email,
    fullName: row.fullName,
  };
}

/** Hard-revoke the current session — used by logout. */
export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (raw) {
    const tokenHash = hashToken(raw);
    await db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessions.tokenHash, tokenHash));
  }
  cookieStore.delete(COOKIE_NAME);
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
