import { notificationAudiences, type NotificationAudience } from "./types";

interface ParsedInput {
  audience: NotificationAudience;
  titleAr: string;
  bodyAr: string;
  titleEn: string;
  bodyEn: string;
  idempotencyKey: string;
  confirmed: true;
}

export type ParseMobileNotificationResult =
  | { ok: true; value: ParsedInput }
  | { ok: false; error: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseMobileNotificationInput(input: unknown): ParseMobileNotificationResult {
  if (!input || typeof input !== "object") return { ok: false, error: "invalid_input" };
  const value = input as Record<string, unknown>;
  if (!notificationAudiences.includes(value.audience as NotificationAudience)) {
    return { ok: false, error: "invalid_audience" };
  }
  if (value.confirmed !== true) return { ok: false, error: "confirmation_required" };
  if (typeof value.idempotencyKey !== "string" || !uuidPattern.test(value.idempotencyKey)) {
    return { ok: false, error: "invalid_idempotency_key" };
  }

  const limits = { titleAr: 100, bodyAr: 500, titleEn: 100, bodyEn: 500 } as const;
  const normalized = {} as Record<keyof typeof limits, string>;
  for (const [field, max] of Object.entries(limits) as Array<[keyof typeof limits, number]>) {
    if (typeof value[field] !== "string") return { ok: false, error: `invalid_${field}` };
    const text = value[field].trim();
    if (text.length === 0 || text.length > max) return { ok: false, error: `invalid_${field}` };
    normalized[field] = text;
  }

  return {
    ok: true,
    value: {
      audience: value.audience as NotificationAudience,
      ...normalized,
      idempotencyKey: value.idempotencyKey,
      confirmed: true,
    },
  };
}
