// Twilio Verify wrapper.
//
// We use Verify (not raw SMS) because Twilio handles:
//   • OTP code generation + secure storage
//   • Delivery + retries across SMS / WhatsApp / voice
//   • Per-recipient rate limiting + fraud detection
//   • Lookup (number type, carrier, MNP) before sending
//
// We layer our own `otp_codes` row on top for app-level rate limiting
// + audit, but the canonical code never lives in our DB.

import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const apiKeySid = process.env.TWILIO_API_KEY_SID;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

let cached: ReturnType<typeof Twilio> | null = null;

function getClient(): ReturnType<typeof Twilio> {
  if (cached) return cached;
  if (!accountSid) {
    throw new Error("TWILIO_ACCOUNT_SID is not set.");
  }
  if (apiKeySid && apiKeySecret) {
    // Preferred: API Key auth (scoped, revocable).
    cached = Twilio(apiKeySid, apiKeySecret, { accountSid });
  } else if (authToken) {
    // Fallback: legacy auth-token.
    cached = Twilio(accountSid, authToken);
  } else {
    throw new Error(
      "Twilio creds incomplete. Set TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (preferred) or TWILIO_AUTH_TOKEN.",
    );
  }
  return cached;
}

export function isTwilioConfigured(): boolean {
  return Boolean(accountSid && verifyServiceSid && (authToken || (apiKeySid && apiKeySecret)));
}

export interface SendOtpResult {
  /** Twilio verification SID (VEXXXXXX) — stored in otp_codes.providerRef. */
  providerRef: string;
  /** Status from Twilio — typically "pending" after a successful send. */
  status: string;
  /** ISO timestamp when the OTP expires (Verify default: 10 minutes). */
  expiresAt: Date;
}

/**
 * Send a 6-digit OTP via SMS to the given E.164 phone number.
 * Throws if Twilio returns an error (carrier issues, invalid number, etc.).
 */
export async function sendSmsOtp(
  e164Phone: string,
  locale: "en" | "ar" = "en",
): Promise<SendOtpResult> {
  if (!verifyServiceSid) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not set.");
  }
  const client = getClient();
  const verification = await client.verify.v2
    .services(verifyServiceSid)
    .verifications.create({
      to: e164Phone,
      channel: "sms",
      locale: locale === "ar" ? "ar" : "en",
    });

  return {
    providerRef: verification.sid,
    status: verification.status,
    // Verify codes expire after 10 minutes by default.
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
}

export interface VerifyOtpResult {
  /** True only when status === "approved". */
  approved: boolean;
  /** Raw status from Twilio: "approved" | "pending" | "canceled" | etc. */
  status: string;
}

/**
 * Verify a 6-digit code against the most recent pending verification
 * for the given phone. Twilio enforces its own retry/expiry limits.
 */
export async function checkSmsOtp(
  e164Phone: string,
  code: string,
): Promise<VerifyOtpResult> {
  if (!verifyServiceSid) {
    throw new Error("TWILIO_VERIFY_SERVICE_SID is not set.");
  }
  const client = getClient();
  try {
    const check = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({ to: e164Phone, code });
    return { approved: check.status === "approved", status: check.status };
  } catch (err: unknown) {
    // Twilio returns 404 when the verification expired or doesn't exist.
    const status = (err as { status?: number }).status;
    if (status === 404) {
      return { approved: false, status: "not_found" };
    }
    throw err;
  }
}
