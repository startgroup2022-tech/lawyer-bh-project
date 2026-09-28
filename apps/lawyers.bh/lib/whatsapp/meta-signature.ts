import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string,
): boolean {
  if (!appSecret || !signature?.startsWith("sha256=")) {
    return false;
  }

  const supplied = signature.slice("sha256=".length);
  if (!/^[0-9a-f]{64}$/i.test(supplied)) {
    return false;
  }

  const expected = createHmac("sha256", appSecret)
    .update(rawBody)
    .digest();
  const received = Buffer.from(supplied, "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}
