// Mobile auth business logic. Owned by this module — REST routes
// under /api/mobile/auth/* are thin transport adapters that delegate
// here. Keeping it transport-agnostic means we can also expose tRPC
// procedures later (or a GraphQL gateway, or a CLI) without duplication.

import { eq, and, gt, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import {
  sendSmsOtp,
  checkSmsOtp,
  isTwilioConfigured,
} from "@/lib/twilio";
import {
  signAccessJwt,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  type MobileRole,
} from "@/lib/auth/mobile-jwt";

// ── Result types ────────────────────────────────────────────────────

export type RequestOtpResult =
  | { ok: true; expiresAt: Date }
  | { ok: false; code: "twilio_not_configured" | "rate_limited" | "send_failed"; message: string };

export type VerifyOtpResult =
  | {
      ok: true;
      accessJwt: string;
      refreshToken: string;
      user: {
        id: string;
        phone: string;
        role: MobileRole;
        fullName: string | null;
        locale: "en" | "ar";
        countryCode: "BH" | "AE" | "SA" | "KW" | "QA" | "OM";
      };
    }
  | {
      ok: false;
      code:
        | "no_active_code"
        | "too_many_attempts"
        | "wrong_code"
        | "lawyer_not_registered";
      message: string;
    };

export type RefreshResult =
  | { ok: true; accessJwt: string; refreshToken: string; userId: string; role: MobileRole }
  | { ok: false; code: "invalid_or_expired"; message: string };

// ── App-level rate limiting per IP ──────────────────────────────────

const ipBucket = new Map<string, { count: number; windowStart: number }>();
const IP_LIMIT = 20;
const IP_WINDOW_MS = 15 * 60 * 1000;

function rateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const e = ipBucket.get(ip);
  if (!e || now - e.windowStart > IP_WINDOW_MS) {
    ipBucket.set(ip, { count: 1, windowStart: now });
    return false;
  }
  e.count += 1;
  return e.count > IP_LIMIT;
}

// ── 1) requestOtp ───────────────────────────────────────────────────

export interface RequestOtpInput {
  phone: string; // E.164
  role: MobileRole;
  locale: "en" | "ar";
  ip: string | null;
  userAgent: string | null;
}

export async function requestOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
  if (!isTwilioConfigured()) {
    return {
      ok: false,
      code: "twilio_not_configured",
      message: "SMS provider not configured on the server.",
    };
  }
  if (rateLimited(input.ip)) {
    return {
      ok: false,
      code: "rate_limited",
      message: "Too many OTP requests. Try again in 15 minutes.",
    };
  }

  let providerRef: string;
  let expiresAt: Date;
  try {
    const sent = await sendSmsOtp(input.phone, input.locale);
    providerRef = sent.providerRef;
    expiresAt = sent.expiresAt;
  } catch (err) {
    console.error("[mobile-auth.requestOtp] Twilio error:", err);
    return {
      ok: false,
      code: "send_failed",
      message:
        "Could not send SMS to that number. Check the format and try again.",
    };
  }

  await db.insert(schema.otpCodes).values({
    phone: input.phone,
    purpose: "signin",
    providerRef,
    status: "pending",
    expiresAt,
    ipAddress: input.ip,
    userAgent: input.userAgent,
  });

  await db.insert(schema.auditLog).values({
    action: "mobile.otp.request",
    targetType: "phone",
    meta: { phone: input.phone, role: input.role },
    ipAddress: input.ip,
    userAgent: input.userAgent,
  });

  return { ok: true, expiresAt };
}

// ── 2) verifyOtp ────────────────────────────────────────────────────

export interface VerifyOtpInput {
  phone: string; // E.164
  code: string; // 4–8 digits
  role: MobileRole;
  fullName?: string;
  idNumber?: string;
  countryCode: "BH" | "AE" | "SA" | "KW" | "QA" | "OM";
  locale: "en" | "ar";
  device?: { model?: string; os?: string; appVersion?: string };
  ip: string | null;
  userAgent: string | null;
}

export async function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  // Find the most recent pending OTP row for this phone.
  const [otpRow] = await db
    .select()
    .from(schema.otpCodes)
    .where(
      and(
        eq(schema.otpCodes.phone, input.phone),
        eq(schema.otpCodes.status, "pending"),
        gt(schema.otpCodes.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(schema.otpCodes.createdAt))
    .limit(1);

  if (!otpRow) {
    return {
      ok: false,
      code: "no_active_code",
      message: "No active code. Request a new one.",
    };
  }
  if (otpRow.attempts >= 5) {
    await db
      .update(schema.otpCodes)
      .set({ status: "abandoned" })
      .where(eq(schema.otpCodes.id, otpRow.id));
    return {
      ok: false,
      code: "too_many_attempts",
      message: "Too many wrong attempts. Request a new code.",
    };
  }

  // Ask Twilio to check.
  const result = await checkSmsOtp(input.phone, input.code);

  if (!result.approved) {
    await db
      .update(schema.otpCodes)
      .set({ attempts: otpRow.attempts + 1 })
      .where(eq(schema.otpCodes.id, otpRow.id));

    await db.insert(schema.auditLog).values({
      action: "mobile.otp.failed",
      targetType: "phone",
      meta: { phone: input.phone, status: result.status },
      ipAddress: input.ip,
      userAgent: input.userAgent,
    });

    return { ok: false, code: "wrong_code", message: "Wrong code. Please try again." };
  }

  // Mark OTP consumed.
  await db
    .update(schema.otpCodes)
    .set({
      status: "verified",
      verifiedAt: new Date(),
      attempts: otpRow.attempts + 1,
    })
    .where(eq(schema.otpCodes.id, otpRow.id));

  // Find or create the user row (role-scoped: same phone can register
  // as both a client AND a lawyer if desired — separate accounts).
  const [existing] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.phone, input.phone),
        eq(schema.users.role, input.role),
      ),
    )
    .limit(1);

  // Lawyers MUST be pre-onboarded by an admin (Bar number + identity
  // verification). Auto-creating from OTP alone would defeat that check.
  if (input.role === "lawyer" && !existing) {
    const [lawyerProfile] = await db
      .select({ id: schema.lawyers.id })
      .from(schema.lawyers)
      .where(eq(schema.lawyers.phone, input.phone))
      .limit(1);
    if (!lawyerProfile) {
      return {
        ok: false,
        code: "lawyer_not_registered",
        message:
          "This number is not registered as an advocate. Contact the Legal SOS admin.",
      };
    }
  }

  let userId: string;
  let fullName: string | null;

  if (existing) {
    userId = existing.id;
    fullName = existing.fullName;
    await db
      .update(schema.users)
      .set({
        phoneVerifiedAt: new Date(),
        lastSignInAt: new Date(),
        // Only fill missing fields — never overwrite existing KYC.
        ...(input.fullName && !existing.fullName
          ? { fullName: input.fullName }
          : {}),
        ...(input.idNumber && !existing.idNumber
          ? { idType: "cpr" as const, idNumber: input.idNumber }
          : {}),
        locale: input.locale,
        countryCode: input.countryCode,
      })
      .where(eq(schema.users.id, userId));
    if (input.fullName && !existing.fullName) fullName = input.fullName;
  } else {
    const [created] = await db
      .insert(schema.users)
      .values({
        phone: input.phone,
        role: input.role,
        fullName: input.fullName ?? null,
        idType: input.idNumber ? ("cpr" as const) : null,
        idNumber: input.idNumber ?? null,
        locale: input.locale,
        countryCode: input.countryCode,
        phoneVerifiedAt: new Date(),
        lastSignInAt: new Date(),
      })
      .returning({ id: schema.users.id, fullName: schema.users.fullName });
    userId = created.id;
    fullName = created.fullName;
  }

  // Issue tokens.
  const accessJwt = await signAccessJwt(userId, input.role);
  const { refreshToken } = await issueRefreshToken(userId, {
    ua: input.userAgent ?? "",
    ip: input.ip ?? "",
    ...(input.device?.model ? { model: input.device.model } : {}),
    ...(input.device?.os ? { os: input.device.os } : {}),
    ...(input.device?.appVersion ? { appVersion: input.device.appVersion } : {}),
  });

  await db.insert(schema.auditLog).values({
    actorUserId: userId,
    action: "mobile.signin",
    targetType: "user",
    targetId: userId,
    ipAddress: input.ip,
    userAgent: input.userAgent,
  });

  return {
    ok: true,
    accessJwt,
    refreshToken,
    user: {
      id: userId,
      phone: input.phone,
      role: input.role,
      fullName,
      locale: input.locale,
      countryCode: input.countryCode,
    },
  };
}

// ── 3) refresh ──────────────────────────────────────────────────────

export async function refresh(refreshToken: string): Promise<RefreshResult> {
  const result = await rotateRefreshToken(refreshToken);
  if (!result) {
    return {
      ok: false,
      code: "invalid_or_expired",
      message: "Refresh token invalid or expired. Sign in again.",
    };
  }
  return {
    ok: true,
    accessJwt: result.accessJwt,
    refreshToken: result.refreshToken,
    userId: result.userId,
    role: result.role,
  };
}

// ── 4) signOut ──────────────────────────────────────────────────────

export async function signOutMobile(
  userId: string,
  refreshToken: string | null,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  await db.insert(schema.auditLog).values({
    actorUserId: userId,
    action: "mobile.signout",
    targetType: "user",
    targetId: userId,
    ipAddress: ip,
    userAgent: userAgent,
  });
}
