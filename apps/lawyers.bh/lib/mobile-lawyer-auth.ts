import "server-only";
import crypto from "node:crypto";

export type MobileLawyerSession = {
  lawyerId: string;
  countryCode: string;
};

type TokenPayload = MobileLawyerSession & {
  exp: number;
};

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function getSecret() {
  const secret =
    process.env.LAWYER_AUTH_SECRET ||
    process.env.PROVIDER_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("LAWYER_AUTH_SECRET is required in production");
  }

  return secret || "dev-mobile-lawyer-secret";
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function createMobileLawyerToken(
  lawyerId: string,
  countryCode: string,
) {
  const payload: TokenPayload = {
    lawyerId,
    countryCode: countryCode.trim().toUpperCase(),
    exp: Date.now() + TOKEN_TTL_MS,
  };

  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  return `${encoded}.${sign(encoded)}`;
}

export function verifyMobileLawyerToken(
  token: string | null | undefined,
): MobileLawyerSession | null {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<TokenPayload>;

    const countryCode = String(parsed.countryCode || "").toUpperCase();

    if (
      !parsed.lawyerId ||
      !/^[A-Z]{2}$/.test(countryCode) ||
      !parsed.exp ||
      parsed.exp < Date.now()
    ) {
      return null;
    }

    return {
      lawyerId: parsed.lawyerId,
      countryCode,
    };
  } catch {
    return null;
  }
}

/** App login/registration issuer. The signer alone does not authorize account access. */
export async function issueMobileLawyerToken(lawyerId: string, countryCode: string): Promise<string | null> {
  const { sqlClient } = await import('@/lib/db/client');
  const { createLifecycleStore } = await import('./legalsos-account-lifecycle/store');
  if (await createLifecycleStore(sqlClient).isAccountClosed({ role: 'lawyer', id: lawyerId })) return null;
  return createMobileLawyerToken(lawyerId, countryCode);
}

export async function getMobileLawyerSession(request: Request): Promise<MobileLawyerSession | null> {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  const session = verifyMobileLawyerToken(match?.[1]);
  if (!session) return null;
  const { sqlClient } = await import('@/lib/db/client');
  const { createLifecycleStore } = await import('./legalsos-account-lifecycle/store');
  if (await createLifecycleStore(sqlClient).isAccountClosed({ role: 'lawyer', id: session.lawyerId })) {
    return null;
  }
  return session;
}
