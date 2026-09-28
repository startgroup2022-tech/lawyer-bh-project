// E.164 phone number normalization + validation.
//
// We accept the local format ("3322 4471") + a country dial code
// ("+973") and produce strict E.164 ("+97333224471"). Reject anything
// that doesn't parse — Twilio Verify will charge us for failed sends
// even on garbage input.

const VALID_DIAL_CODES = new Set(["+973", "+971", "+966", "+965", "+974", "+968"]);

export interface NormalizeResult {
  ok: boolean;
  e164?: string;
  error?: string;
}

export function normalizePhone(
  dialCode: string,
  localPart: string,
): NormalizeResult {
  const cleanedDial = dialCode.trim();
  if (!VALID_DIAL_CODES.has(cleanedDial)) {
    return { ok: false, error: "Unsupported country dial code." };
  }
  const digits = localPart.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 12) {
    return { ok: false, error: "Local number must be 7–12 digits." };
  }
  return { ok: true, e164: `${cleanedDial}${digits}` };
}

/** Verify a phone string is already in E.164 (`+` then 8–15 digits). */
export function isE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

/** Bahraini mobile numbers are 8 digits starting 3/6/7. */
export function isBahrainiMobile(e164: string): boolean {
  return /^\+973[367]\d{7}$/.test(e164);
}
