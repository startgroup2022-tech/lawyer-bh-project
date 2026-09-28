import crypto from "node:crypto";

function secret(): string {
  const value =
    process.env.MOBILE_DISPATCH_SECRET ??
    process.env.LAWYER_AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET;

  if (!value || value.length < 32) {
    throw new Error("MOBILE_DISPATCH_SECRET must contain at least 32 characters");
  }

  return value;
}

export function createMobileDispatchToken(bookingId: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`mobile-emergency-dispatch:v1:${bookingId}`)
    .digest("base64url");
}

export function verifyMobileDispatchToken(
  bookingId: string,
  token: string | null | undefined,
): boolean {
  const expected = Buffer.from(createMobileDispatchToken(bookingId));
  const received = Buffer.from(String(token ?? ""));

  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}

export function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? null;
}

/** Unlike signature verification, authorization also honors account closure. */
export async function authorizeMobileDispatchToken(
  bookingId: string,
  token: string | null | undefined,
): Promise<boolean> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId) ||
      !verifyMobileDispatchToken(bookingId, token)) return false;
  const { sqlClient } = await import('@/lib/db/client');
  const rows = await sqlClient`SELECT request.id FROM bahrain_emergency_requests request
    WHERE request.id=${bookingId}::uuid
      AND request.client_access_revoked_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM legalsos_account_lifecycle closed
        WHERE closed.subject_role='client' AND closed.subject_id=request.client_account_id)
    LIMIT 1`;
  return rows.length > 0;
}
