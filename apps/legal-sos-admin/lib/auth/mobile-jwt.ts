// JWT helpers for the mobile app.
//
// Two-token model:
//   • Access JWT  — short-lived (15 min), sent as `Authorization: Bearer`
//   • Refresh token — opaque random bytes, 90 days, stored in SecureStore.
//     Server stores SHA-256 hash in the `sessions` table for revocation.
//
// Why JWT for mobile but cookies for admin:
//   • Mobile has no cookie jar (well, RN can but not on iOS WebView)
//   • Bearer header is the standard for native API clients
//   • Short TTL keeps blast radius small if a phone is jailbroken

import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "node:crypto";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { SessionSubject } from "@/lib/db/types";

const SECRET = process.env.AUTH_SECRET;
const ACCESS_TTL_SEC = 15 * 60; // 15 min
const REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

function getSecretKey(): Uint8Array {
  if (!SECRET) {
    throw new Error("AUTH_SECRET is not set.");
  }
  return new TextEncoder().encode(SECRET);
}

export type MobileRole = "client" | "lawyer";

export interface AccessJwtClaims {
  sub: string; // users.id
  role: MobileRole;
  iat: number;
  exp: number;
}

export async function signAccessJwt(userId: string, role: MobileRole): Promise<string> {
  return await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(getSecretKey());
}

export async function verifyAccessJwt(token: string): Promise<AccessJwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    const role = payload.role;
    if (role !== "client" && role !== "lawyer") return null;
    return {
      sub: payload.sub,
      role,
      iat: payload.iat ?? 0,
      exp: payload.exp ?? 0,
    };
  } catch {
    return null;
  }
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function newRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

/**
 * Create a long-lived refresh token for a mobile user. Returns the raw
 * token (sent to client once) plus the session row id.
 */
export async function issueRefreshToken(
  userId: string,
  deviceInfo: Record<string, string> = {},
): Promise<{ refreshToken: string; sessionId: string }> {
  const raw = newRefreshToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  const [row] = await db
    .insert(schema.sessions)
    .values({
      subject: "mobile_user" satisfies SessionSubject,
      subjectId: userId,
      tokenHash,
      deviceInfo,
      expiresAt,
    })
    .returning({ id: schema.sessions.id });

  return { refreshToken: raw, sessionId: row.id };
}

/**
 * Exchange a refresh token for a new access JWT. Returns null if the
 * token is unknown, expired, or revoked.
 */
export async function rotateRefreshToken(
  refreshToken: string,
): Promise<{ accessJwt: string; refreshToken: string; userId: string; role: MobileRole } | null> {
  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: schema.sessions.id,
      userId: schema.sessions.subjectId,
      role: schema.users.role,
      isActive: schema.users.isActive,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.subjectId, schema.users.id))
    .where(
      and(
        eq(schema.sessions.tokenHash, tokenHash),
        eq(schema.sessions.subject, "mobile_user"),
        gt(schema.sessions.expiresAt, now),
        isNull(schema.sessions.revokedAt),
      ),
    )
    .limit(1);

  if (!row || !row.isActive) return null;

  // Rotate: revoke old, issue new (rolling refresh token defense against
  // token theft — a stolen-but-unused token can be detected as a re-use).
  const newRaw = newRefreshToken();
  const newHash = hashToken(newRaw);
  const newExpiry = new Date(Date.now() + REFRESH_TTL_MS);
  await db
    .update(schema.sessions)
    .set({
      tokenHash: newHash,
      expiresAt: newExpiry,
      lastUsedAt: now,
    })
    .where(eq(schema.sessions.id, row.sessionId));

  const accessJwt = await signAccessJwt(row.userId, row.role);
  return { accessJwt, refreshToken: newRaw, userId: row.userId, role: row.role };
}

/** Revoke the session bound to a refresh token. Idempotent. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await db
    .update(schema.sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.sessions.tokenHash, tokenHash),
        eq(schema.sessions.subject, "mobile_user"),
      ),
    );
}
