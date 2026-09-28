export type PublicOnboardingLocale = "ar" | "en";
export type PublicOnboardingChannel = "email" | "phone";

export interface PublicOnboardingContext {
  ip: string;
  userAgent?: string | null;
}

export interface PublicOnboardingIdentity {
  normalizedEmail: string | null;
  normalizedPhone: string | null;
}

export interface PublicOnboardingDeliveryMessage {
  to: string;
  code: string;
  locale: PublicOnboardingLocale;
}

export interface PublicOnboardingDelivery {
  sendEmail(message: PublicOnboardingDeliveryMessage): Promise<void>;
  sendSms(message: PublicOnboardingDeliveryMessage): Promise<void>;
}

export type VerificationResult =
  | ({ status: "verified"; userId: string; reused: boolean } & PublicOnboardingSessionTokens)
  | { status: "invalid" | "expired" | "consumed" | "disabled" | "attempts_exhausted" };

export interface PublicOnboardingAtomicSessionContext {
  sessions: SessionRepository;
  loadUser(userId: string): Promise<LoadedUser | null>;
}

export type PublicOnboardingAuditEvent =
  | "challenge.requested"
  | "challenge.delivery.sent"
  | "challenge.delivery.failed"
  | "verify.succeeded"
  | "verify.failed";

export type PublicOnboardingAuditReason =
  | "invalid"
  | "expired"
  | "consumed"
  | "disabled"
  | "rate_limited"
  | "delivery_failed"
  | "validation_failed"
  | "internal_error";

export interface PublicOnboardingRepository {
  rateLimit(
    scope: string,
    value: string,
    limit: number,
    windowMs: number,
    now: Date,
  ): Promise<void>;
  createChallenge(input: PublicOnboardingIdentity & {
    challengeId: string;
    channel: PublicOnboardingChannel;
    tokenDigest: string;
    expiresAt: Date;
    createdAt: Date;
    context: PublicOnboardingContext;
  }): Promise<{ challengeId: string; expiresAt: Date }>;
  findChallengeIdentity(challengeId: string): Promise<PublicOnboardingIdentity | null>;
  verifyAndCreateSession(input: {
    challengeId: string;
    candidateDigest: string;
    displayNameAr: string;
    displayNameEn: string;
    now: Date;
    context: PublicOnboardingContext;
    createPasswordHash(): Promise<string>;
    createSession(
      userId: string,
      context: PublicOnboardingAtomicSessionContext,
    ): Promise<PublicOnboardingSessionTokens>;
  }): Promise<VerificationResult>;
  markDelivery(
    challengeId: string,
    status: "sent" | "failed",
    context: PublicOnboardingContext,
    at: Date,
    errorCode?: string,
  ): Promise<void>;
  recordAudit(input: {
    event: PublicOnboardingAuditEvent;
    outcome: "accepted" | "succeeded" | "failed";
    reason?: PublicOnboardingAuditReason | null;
    challengeId?: string | null;
    userId?: string | null;
    context: PublicOnboardingContext;
    at: Date;
  }): Promise<void>;
}

export interface PublicOnboardingSessionTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicOnboardingVerification extends PublicOnboardingSessionTokens {
  userId: string;
  reused: boolean;
}

export interface PublicOnboardingService {
  requestChallenge(input: {
    channel: PublicOnboardingChannel;
    identity: string;
    locale: PublicOnboardingLocale;
  }, context: PublicOnboardingContext): Promise<{
    challengeId: string;
    expiresAt: string;
  }>;
  verify(input: {
    challengeId: string;
    code: string;
    displayNameAr: string;
    displayNameEn: string;
  }, context: PublicOnboardingContext): Promise<PublicOnboardingVerification>;
}
import type { LoadedUser, SessionRepository } from "../auth/sessions";
