import { createHmac, randomBytes, randomInt, randomUUID } from "node:crypto";
import { ApiError, validatedEmail, validatedPhone } from "../auth/contracts";
import type {
  PublicOnboardingAtomicSessionContext,
  PublicOnboardingAuditReason,
  PublicOnboardingDelivery,
  PublicOnboardingIdentity,
  PublicOnboardingRepository,
  PublicOnboardingService,
  PublicOnboardingSessionTokens,
} from "./contracts";

const challengeTtlMs = 10 * 60_000;
const rateLimitWindowMs = 15 * 60_000;
const verificationWindowMs = 10 * 60_000;
const rateLimit = 5;

function identityFor(channel: "email" | "phone", value: string): PublicOnboardingIdentity {
  return channel === "email"
    ? { normalizedEmail: validatedEmail(value), normalizedPhone: null }
    : { normalizedEmail: null, normalizedPhone: validatedPhone(value) };
}

function identityValue(identity: PublicOnboardingIdentity) {
  const value = identity.normalizedEmail ?? identity.normalizedPhone;
  if (!value) throw genericOtpError();
  return value;
}

function validLocale(value: string): value is "ar" | "en" {
  return value === "ar" || value === "en";
}

function genericOtpError() {
  return new ApiError(
    401,
    "OTP_INVALID_OR_EXPIRED",
    "رمز التحقق غير صالح أو منتهي",
    "Verification code is invalid or expired",
  );
}

function auditReason(error: unknown): PublicOnboardingAuditReason {
  if (error instanceof ApiError && error.code === "RATE_LIMITED") return "rate_limited";
  if (error instanceof ApiError && error.status < 500) return "validation_failed";
  return "internal_error";
}

export function createPublicOnboardingService(dependencies: {
  repository: PublicOnboardingRepository;
  delivery: PublicOnboardingDelivery;
  createSession(
    userId: string,
    context: PublicOnboardingAtomicSessionContext,
  ): Promise<PublicOnboardingSessionTokens>;
  hashPassword(password: string): Promise<string>;
  otpSecret: string;
  now?: () => Date;
  randomCode?: () => string;
  randomChallengeId?: () => string;
  randomPassword?: () => string;
}): PublicOnboardingService {
  if (dependencies.otpSecret.length < 32) {
    throw new Error("Saraya public OTP secret must be at least 32 characters");
  }
  const now = dependencies.now ?? (() => new Date());
  const randomCode = dependencies.randomCode
    ?? (() => String(randomInt(100000, 1000000)));
  const randomChallengeId = dependencies.randomChallengeId ?? randomUUID;
  const randomPassword = dependencies.randomPassword
    ?? (() => randomBytes(48).toString("base64url"));
  const digest = (challengeId: string, identity: string, code: string) => createHmac(
    "sha256",
    dependencies.otpSecret,
  ).update(`saraya-public-rental-otp:v1:${challengeId}:${identity}:${code}`).digest("hex");

  return {
    async requestChallenge(input, context) {
      const createdAt = now();
      await dependencies.repository.rateLimit(
        "public-onboarding:challenge:ip",
        context.ip,
        rateLimit,
        rateLimitWindowMs,
        createdAt,
      );
      let identity: PublicOnboardingIdentity;
      let normalizedIdentity: string;
      try {
        if (!validLocale(input.locale)) {
          throw new ApiError(422, "INVALID_LOCALE", "اللغة غير صالحة", "Invalid locale");
        }
        identity = identityFor(input.channel, input.identity);
        normalizedIdentity = identityValue(identity);
      } catch (error) {
        await dependencies.repository.recordAudit({
          event: "challenge.requested",
          outcome: "failed",
          reason: auditReason(error),
          context,
          at: createdAt,
        });
        throw error;
      }
      await dependencies.repository.rateLimit(
        "public-onboarding:challenge:identity",
        normalizedIdentity,
        rateLimit,
        rateLimitWindowMs,
        createdAt,
      );
      const code = randomCode();
      if (!/^\d{6}$/.test(code)) throw new Error("OTP generator must return six digits");
      const challengeId = randomChallengeId();
      const saved = await dependencies.repository.createChallenge({
        ...identity,
        challengeId,
        channel: input.channel,
        tokenDigest: digest(challengeId, normalizedIdentity, code),
        expiresAt: new Date(createdAt.getTime() + challengeTtlMs),
        createdAt,
        context,
      });
      try {
        if (input.channel === "email") {
          await dependencies.delivery.sendEmail({
            to: normalizedIdentity,
            code,
            locale: input.locale,
          });
        } else {
          await dependencies.delivery.sendSms({
            to: normalizedIdentity,
            code,
            locale: input.locale,
          });
        }
        await dependencies.repository.markDelivery(
          saved.challengeId,
          "sent",
          context,
          now(),
        );
      } catch {
        await dependencies.repository.markDelivery(
          saved.challengeId,
          "failed",
          context,
          now(),
          "DELIVERY_FAILED",
        );
        throw new ApiError(
          502,
          "CHALLENGE_DELIVERY_FAILED",
          "تعذر إرسال رمز التحقق",
          "Could not deliver verification code",
        );
      }
      return {
        challengeId: saved.challengeId,
        expiresAt: saved.expiresAt.toISOString(),
      };
    },

    async verify(input, context) {
      const verifiedAt = now();
      await dependencies.repository.rateLimit(
        "public-onboarding:verify:ip",
        context.ip,
        rateLimit,
        rateLimitWindowMs,
        verifiedAt,
      );
      await dependencies.repository.rateLimit(
        "public-onboarding:verify:challenge",
        input.challengeId,
        rateLimit,
        verificationWindowMs,
        verifiedAt,
      );
      if (!/^\d{6}$/.test(input.code)) {
        await dependencies.repository.recordAudit({
          event: "verify.failed",
          outcome: "failed",
          reason: "invalid",
          challengeId: input.challengeId,
          context,
          at: verifiedAt,
        });
        throw genericOtpError();
      }
      const displayNameAr = input.displayNameAr.trim();
      const displayNameEn = input.displayNameEn.trim();
      if (!displayNameAr || !displayNameEn) {
        await dependencies.repository.recordAudit({
          event: "verify.failed",
          outcome: "failed",
          reason: "validation_failed",
          challengeId: input.challengeId,
          context,
          at: verifiedAt,
        });
        throw new ApiError(
          422,
          "INVALID_NAME",
          "الاسم مطلوب بالعربية والإنجليزية",
          "Arabic and English names are required",
        );
      }
      const identity = await dependencies.repository.findChallengeIdentity(input.challengeId);
      if (!identity) {
        await dependencies.repository.recordAudit({
          event: "verify.failed",
          outcome: "failed",
          reason: "invalid",
          challengeId: input.challengeId,
          context,
          at: verifiedAt,
        });
        throw genericOtpError();
      }
      const normalizedIdentity = identityValue(identity);
      await dependencies.repository.rateLimit(
        "public-onboarding:verify:identity",
        normalizedIdentity,
        rateLimit,
        verificationWindowMs,
        verifiedAt,
      );
      const account = await dependencies.repository.verifyAndCreateSession({
        challengeId: input.challengeId,
        candidateDigest: digest(input.challengeId, normalizedIdentity, input.code),
        displayNameAr,
        displayNameEn,
        now: verifiedAt,
        context,
        createPasswordHash: () => dependencies.hashPassword(randomPassword()),
        createSession: dependencies.createSession,
      });
      if (account.status === "attempts_exhausted") {
        throw new ApiError(
          429,
          "RATE_LIMITED",
          "محاولات كثيرة، حاول لاحقًا",
          "Too many attempts, try again later",
        );
      }
      if (account.status !== "verified") throw genericOtpError();
      return account;
    },
  };
}
