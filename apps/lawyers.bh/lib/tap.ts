import "server-only";

import { getTapSecretKey } from "@/lib/tap/config";

const TAP_BASE_URL = "https://api.tap.company/v2";

export interface CreateChargeInput {
  amountBD: number;
  currency?: "BHD" | "USD" | "SAR" | "AED" | "KWD" | "OMR" | "QAR" | "EUR" | "GBP";
  description: string;
  statementDescriptor?: string;
  reference: { transaction: string; order: string };
  customer: { first_name: string; last_name?: string; email?: string; phone?: { country_code: string; number: string } };
  metadata?: Record<string, string>;
  redirect: string;
  post: string;
  source?: { id: string };
}

export interface TapChargeResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  transaction?: { url?: string };
  reference?: { order?: string };
  metadata?: Record<string, string>;
  response?: { code: string; message: string };
  customer?: { email?: string };
}

function getKey(): string {
  return getTapSecretKey();
}

export async function createCharge(input: CreateChargeInput): Promise<TapChargeResponse> {
  const body = {
    amount: input.amountBD,
    currency: input.currency ?? "BHD",
    description: input.description,
    statement_descriptor: input.statementDescriptor ?? "Lawyers.bh",
    reference: input.reference,
    receipt: { email: false, sms: false },
    customer: input.customer,
    source: input.source ?? { id: "src_all" },
    post: { url: input.post },
    redirect: { url: input.redirect },
    metadata: input.metadata ?? {},
  };

  const res = await fetch(`${TAP_BASE_URL}/charges/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as TapChargeResponse & { errors?: unknown };
  if (!res.ok) {
    const msg = data && typeof data === "object" ? JSON.stringify(data) : `Tap HTTP ${res.status}`;
    throw new Error(`Tap createCharge failed: ${msg}`);
  }
  return data;
}

export async function retrieveCharge(chargeId: string): Promise<TapChargeResponse> {
  const res = await fetch(`${TAP_BASE_URL}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${getKey()}` },
  });
  const data = (await res.json().catch(() => ({}))) as TapChargeResponse;
  if (!res.ok) throw new Error(`Tap retrieveCharge failed: ${JSON.stringify(data)}`);
  return data;
}

// Tap signs webhook payloads with HMAC-SHA256 using the secret key.
// The signature header is "hashstring". Signed input is a concatenation of
// select fields per https://developer.tap.company/reference/webhook.
//
// Layout matches Tap's docs:
//   "x_id<id>x_amount<amount in 3dp>x_currency<currency>x_gateway_reference<reference.gateway>
//    x_payment_reference<reference.payment>x_status<status>x_created<transaction.created>"
export function computeChargeHashString(charge: TapChargeResponse & { reference?: { gateway?: string; payment?: string }; transaction?: { created?: string; url?: string } }): string {
  const amount = typeof charge.amount === "number"
    ? charge.amount.toFixed(3)
    : String(charge.amount ?? "");
  const parts = [
    `x_id${charge.id ?? ""}`,
    `x_amount${amount}`,
    `x_currency${charge.currency ?? ""}`,
    `x_gateway_reference${charge.reference?.gateway ?? ""}`,
    `x_payment_reference${charge.reference?.payment ?? ""}`,
    `x_status${charge.status ?? ""}`,
    `x_created${charge.transaction?.created ?? ""}`,
  ];
  return parts.join("");
}

export async function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string | null
): Promise<boolean> {
  if (!receivedSignature) return false;
  let charge: TapChargeResponse;
  try {
    charge = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const hashInput = computeChargeHashString(charge);
  const crypto = await import("node:crypto");
  const expected = crypto
    .createHmac("sha256", getKey())
    .update(hashInput)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(receivedSignature.trim());
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function siteOrigin(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
