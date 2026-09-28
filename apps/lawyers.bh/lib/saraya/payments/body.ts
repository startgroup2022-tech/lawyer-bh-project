import { ApiError } from "../auth/contracts";

export const paymentJsonBodyLimit = 16 * 1024;
export const paymentWebhookBodyLimit = 64 * 1024;

export async function readPaymentText(request: Request, limit = paymentJsonBodyLimit) {
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > limit) throw new ApiError(413, "PAYMENT_BODY_TOO_LARGE", "حجم طلب الدفع كبير جدًا", "Payment request body is too large");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel().catch(() => undefined);
        throw new ApiError(413, "PAYMENT_BODY_TOO_LARGE", "حجم طلب الدفع كبير جدًا", "Payment request body is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((value) => Buffer.from(value))).toString("utf8");
}

export async function readPaymentJson(request: Request): Promise<Record<string, unknown>> {
  const raw = await readPaymentText(request);
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "صيغة الطلب غير صالحة", "Invalid JSON body");
  }
}
