import crypto from "crypto";
import { cookies } from "next/headers";

export type AdminSession = {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "reviewer";
  exp: number;
};

const COOKIE_NAME = "admin_session";

function getSecret() {
  const secret =
    process.env.ADMIN_AUTH_SECRET ||
    process.env.LAWYER_AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET;

  if (!secret) {
    throw new Error("Missing ADMIN_AUTH_SECRET");
  }

  return secret;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function sign(data: string) {
  return base64url(
    crypto.createHmac("sha256", getSecret()).update(data).digest(),
  );
}

export function createAdminSessionToken(payload: Omit<AdminSession, "exp">) {
  const session: AdminSession = {
    ...payload,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  };

  const data = base64url(JSON.stringify(session));
  const signature = sign(data);

  return `${data}.${signature}`;
}

export function verifyAdminSessionToken(token?: string): AdminSession | null {
  if (!token) return null;

  const [data, signature] = token.split(".");

  if (!data || !signature) return null;

  const expected = sign(data);

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    )
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64").toString("utf8"),
    ) as AdminSession;

    if (!payload.exp || payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  return verifyAdminSessionToken(token);
}

export async function setAdminSession(payload: Omit<AdminSession, "exp">) {
  const cookieStore = await cookies();
  const token = createAdminSessionToken(payload);

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}