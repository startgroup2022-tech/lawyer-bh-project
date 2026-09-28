export type PaymentRequestType = "emergency" | "consultation";

export interface PaymentRequestIdentity {
  requestType: PaymentRequestType;
  requestId: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePaymentRequestIdentity(
  input: unknown,
): PaymentRequestIdentity | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const requestType = value.requestType;
  const requestId =
    typeof value.requestId === "string" ? value.requestId.trim() : "";
  if (
    (requestType !== "emergency" && requestType !== "consultation") ||
    !UUID_PATTERN.test(requestId)
  ) {
    return null;
  }
  return { requestType, requestId };
}

export function tapOrderReference(identity: PaymentRequestIdentity): string {
  const kind = identity.requestType === "emergency" ? "SOS" : "BK";
  return `LSOS-${kind}-${identity.requestId.slice(0, 8).toUpperCase()}`;
}
