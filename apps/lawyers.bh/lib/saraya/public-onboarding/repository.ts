import { createHash, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  sarayaAuthAuditLogs,
  sarayaAuthChallenges,
  sarayaAuthDeliveryAttempts,
  sarayaAuthRateLimits,
  sarayaUsers,
} from "@/lib/db/saraya-schema";
import { ApiError } from "../auth/contracts";
import { rateLimitTimestamp } from "../auth/rate-limit-window";
import { createSessionRepository, loadSarayaUserFrom } from "../auth/store";
import { sanitizePublicOnboardingContext } from "./audit";
import type {
  PublicOnboardingAuditReason,
  PublicOnboardingContext,
  PublicOnboardingRepository,
} from "./contracts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type AuditConnection = Pick<typeof db, "insert">;

function safeEqual(left: string, right: string) {
  const actual = Buffer.from(left, "utf8");
  const expected = Buffer.from(right, "utf8");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function rateLimitBucket(scope: string, value: string) {
  return `${scope}:${createHash("sha256").update(value).digest("hex")}`;
}

function validId(value?: string | null) {
  return value && uuidPattern.test(value) ? value : null;
}

async function writeAudit(
  connection: AuditConnection,
  input: {
    event: "challenge.requested" | "challenge.delivery.sent" | "challenge.delivery.failed" | "verify.succeeded" | "verify.failed";
    outcome: "accepted" | "succeeded" | "failed";
    reason?: PublicOnboardingAuditReason | null;
    challengeId?: string | null;
    userId?: string | null;
    context: PublicOnboardingContext;
    at: Date;
  },
) {
  const sanitized = sanitizePublicOnboardingContext(input.context);
  const challengeId = validId(input.challengeId);
  const userId = validId(input.userId);
  await connection.insert(sarayaAuthAuditLogs).values({
    challengeId: challengeId
      ? sql`(SELECT ${sarayaAuthChallenges.id} FROM ${sarayaAuthChallenges} WHERE ${sarayaAuthChallenges.id} = ${challengeId} LIMIT 1)`
      : null,
    userId: userId
      ? sql`(SELECT ${sarayaUsers.id} FROM ${sarayaUsers} WHERE ${sarayaUsers.id} = ${userId} LIMIT 1)`
      : null,
    event: input.event,
    outcome: input.outcome,
    reason: input.reason ?? null,
    ipAddress: sanitized.ipAddress,
    userAgent: sanitized.userAgent,
    metadata: {},
    createdAt: input.at,
  });
}

function atomicSessionContext(transaction: Transaction) {
  return {
    sessions: createSessionRepository(transaction),
    loadUser: (userId: string) => loadSarayaUserFrom(transaction, userId),
  };
}

export const publicOnboardingRepository: PublicOnboardingRepository = {
  async rateLimit(scope, value, limit, windowMs, now) {
    const bucket = rateLimitBucket(scope, value);
    const cutoff = rateLimitTimestamp(new Date(now.getTime() - windowMs));
    const current = rateLimitTimestamp(now);
    await db.delete(sarayaAuthRateLimits).where(
      lt(sarayaAuthRateLimits.updatedAt, new Date(now.getTime() - windowMs)),
    );
    const rows = await db.insert(sarayaAuthRateLimits).values({
      bucket,
      windowStartedAt: now,
      count: 1,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: sarayaAuthRateLimits.bucket,
      set: {
        windowStartedAt: sql`CASE WHEN ${sarayaAuthRateLimits.windowStartedAt} <= ${cutoff}::timestamptz THEN ${current}::timestamptz ELSE ${sarayaAuthRateLimits.windowStartedAt} END`,
        count: sql`CASE WHEN ${sarayaAuthRateLimits.windowStartedAt} <= ${cutoff}::timestamptz THEN 1 ELSE ${sarayaAuthRateLimits.count} + 1 END`,
        updatedAt: now,
      },
    }).returning({ count: sarayaAuthRateLimits.count });
    if ((rows[0]?.count ?? 1) > limit) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        "محاولات كثيرة، حاول لاحقًا",
        "Too many attempts, try again later",
      );
    }
  },

  async createChallenge(input) {
    return db.transaction(async (transaction) => {
      const [challenge] = await transaction.insert(sarayaAuthChallenges).values({
        id: input.challengeId,
        normalizedEmail: input.normalizedEmail,
        normalizedPhone: input.normalizedPhone,
        purpose: "public_rental_otp",
        tokenHash: input.tokenDigest,
        expiresAt: input.expiresAt,
        createdAt: input.createdAt,
      }).returning({
        challengeId: sarayaAuthChallenges.id,
        expiresAt: sarayaAuthChallenges.expiresAt,
      });
      if (!challenge) throw new Error("challenge_not_created");
      await transaction.insert(sarayaAuthDeliveryAttempts).values({
        challengeId: challenge.challengeId,
        channel: input.channel === "email" ? "email" : "sms",
        status: "queued",
        attempts: 0,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      });
      await writeAudit(transaction, {
        event: "challenge.requested",
        outcome: "accepted",
        challengeId: challenge.challengeId,
        context: input.context,
        at: input.createdAt,
      });
      return challenge;
    });
  },

  async findChallengeIdentity(challengeId) {
    if (!uuidPattern.test(challengeId)) return null;
    const [challenge] = await db.select({
      normalizedEmail: sarayaAuthChallenges.normalizedEmail,
      normalizedPhone: sarayaAuthChallenges.normalizedPhone,
    }).from(sarayaAuthChallenges).where(and(
      eq(sarayaAuthChallenges.id, challengeId),
      eq(sarayaAuthChallenges.purpose, "public_rental_otp"),
    )).limit(1);
    return challenge ?? null;
  },

  async verifyAndCreateSession(input) {
    if (!uuidPattern.test(input.challengeId)) {
      await writeAudit(db, {
        event: "verify.failed",
        outcome: "failed",
        reason: "invalid",
        context: input.context,
        at: input.now,
      });
      return { status: "invalid" };
    }
    try {
      return await db.transaction(async (transaction) => {
        type LockedChallenge = {
          id: string;
          normalizedEmail: string | null;
          normalizedPhone: string | null;
          tokenHash: string;
          expiresAt: Date;
          consumedAt: Date | null;
        };
        const rows = await transaction.execute(sql`
          SELECT
            id,
            normalized_email AS "normalizedEmail",
            normalized_phone AS "normalizedPhone",
            token_hash AS "tokenHash",
            expires_at AS "expiresAt",
            consumed_at AS "consumedAt"
          FROM saraya_auth_challenges
          WHERE id = ${input.challengeId}::uuid
            AND purpose = 'public_rental_otp'
          FOR UPDATE
        `);
        const challenge = rows[0] as LockedChallenge | undefined;
        const failed = async (
          status: "invalid" | "expired" | "consumed" | "disabled",
          userId?: string,
        ) => {
          await writeAudit(transaction, {
            event: "verify.failed",
            outcome: "failed",
            reason: status,
            challengeId: challenge?.id ?? null,
            userId,
            context: input.context,
            at: input.now,
          });
          return { status } as const;
        };
        if (!challenge) return failed("invalid");
        if (challenge.consumedAt) return failed("consumed");
        if (challenge.expiresAt <= input.now) return failed("expired");
        if (!safeEqual(challenge.tokenHash, input.candidateDigest)) return failed("invalid");

        const normalizedIdentity = challenge.normalizedEmail ?? challenge.normalizedPhone!;
        await transaction.execute(sql`
          SELECT pg_advisory_xact_lock(
            hashtextextended(${`saraya-public-onboarding:${normalizedIdentity}`}, 0)
          )
        `);
        const identityCondition = challenge.normalizedEmail
          ? eq(sarayaUsers.normalizedEmail, challenge.normalizedEmail)
          : eq(sarayaUsers.normalizedPhone, challenge.normalizedPhone!);
        let [user] = await transaction.select({
          id: sarayaUsers.id,
          isActive: sarayaUsers.isActive,
        }).from(sarayaUsers).where(identityCondition).limit(1);
        let reused = Boolean(user);
        if (user && !user.isActive) return failed("disabled", user.id);
        if (!user) {
          const passwordHash = await input.createPasswordHash();
          const [created] = await transaction.insert(sarayaUsers).values({
            normalizedEmail: challenge.normalizedEmail,
            normalizedPhone: challenge.normalizedPhone,
            passwordHash,
            displayNameAr: input.displayNameAr,
            displayNameEn: input.displayNameEn,
            isActive: true,
          }).onConflictDoNothing().returning({
            id: sarayaUsers.id,
            isActive: sarayaUsers.isActive,
          });
          user = created;
          if (!user) {
            [user] = await transaction.select({
              id: sarayaUsers.id,
              isActive: sarayaUsers.isActive,
            }).from(sarayaUsers).where(identityCondition).limit(1);
            reused = true;
          }
        }
        if (!user) throw new Error("tenant_account_not_created");
        if (!user.isActive) return failed("disabled", user.id);

        const tokens = await input.createSession(
          user.id,
          atomicSessionContext(transaction),
        );
        const consumed = await transaction.update(sarayaAuthChallenges).set({
          consumedAt: input.now,
        }).where(and(
          eq(sarayaAuthChallenges.id, challenge.id),
          isNull(sarayaAuthChallenges.consumedAt),
        )).returning({ id: sarayaAuthChallenges.id });
        if (consumed.length !== 1) throw new Error("challenge_consumption_conflict");
        await writeAudit(transaction, {
          event: "verify.succeeded",
          outcome: "succeeded",
          challengeId: challenge.id,
          userId: user.id,
          context: input.context,
          at: input.now,
        });
        return {
          status: "verified" as const,
          userId: user.id,
          reused,
          ...tokens,
        };
      });
    } catch (error) {
      await writeAudit(db, {
        event: "verify.failed",
        outcome: "failed",
        reason: "internal_error",
        challengeId: input.challengeId,
        context: input.context,
        at: input.now,
      });
      throw error;
    }
  },

  async markDelivery(challengeId, status, context, at, errorCode) {
    if (!uuidPattern.test(challengeId)) return;
    await db.transaction(async (transaction) => {
      await transaction.update(sarayaAuthDeliveryAttempts).set({
        status,
        attempts: sql`${sarayaAuthDeliveryAttempts.attempts} + 1`,
        lastErrorCode: errorCode ?? null,
        nextAttemptAt: null,
        updatedAt: at,
      }).where(eq(sarayaAuthDeliveryAttempts.challengeId, challengeId));
      await writeAudit(transaction, {
        event: status === "sent" ? "challenge.delivery.sent" : "challenge.delivery.failed",
        outcome: status === "sent" ? "succeeded" : "failed",
        reason: status === "failed" ? "delivery_failed" : null,
        challengeId,
        context,
        at,
      });
    });
  },

  recordAudit(input) {
    return writeAudit(db, input);
  },
};
