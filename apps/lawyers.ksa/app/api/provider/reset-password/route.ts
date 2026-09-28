import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createHmac, timingSafeEqual } from "crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getResetSecret() {
  return (
    process.env.LAWYER_AUTH_SECRET ||
    process.env.RESET_PASSWORD_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ""
  );
}

function signPayload(payload: string, passwordHash: string) {
  const secret = getResetSecret();

  if (!secret) {
    throw new Error("Missing RESET_PASSWORD_SECRET");
  }

  return createHmac("sha256", `${secret}:${passwordHash}`)
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) return false;

  return timingSafeEqual(aBuffer, bBuffer);
}

function isStrongPassword(password: string) {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password)
  );
}

async function verifyResetToken(token: string) {
  const [payload, signature] = token.split(".");

  if (!payload || !signature) {
    throw new Error("Invalid token");
  }

  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    id?: string;
    countryCode?: string;
    exp?: number;
  };

  const countryCode = String(parsed.countryCode || "SA").toUpperCase();

  if (
    !parsed.id ||
    countryCode !== "SA" ||
    !parsed.exp ||
    parsed.exp < Date.now()
  ) {
    throw new Error("Expired token");
  }

  const [provider] = await db
    .select({
      id: schema.saudiLawyers.id,
      passwordHash: schema.saudiLawyers.passwordHash,
      countryCode: schema.saudiLawyers.countryCode,
    })
    .from(schema.saudiLawyers)
    .where(
      and(
        eq(schema.saudiLawyers.id, parsed.id),
        eq(schema.saudiLawyers.countryCode, countryCode),
      ),
    )
    .limit(1);

  if (!provider?.passwordHash) {
    throw new Error("Provider not found");
  }

  const expectedSignature = signPayload(payload, provider.passwordHash);

  if (!safeEqual(signature, expectedSignature)) {
    throw new Error("Invalid signature");
  }

  return provider;
}

export async function POST(request: Request) {
  let body: {
    token?: string;
    password?: string;
    confirmPassword?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "").trim();
  const confirmPassword = String(body.confirmPassword ?? "").trim();

  if (!token || !password || !confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields" },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { ok: false, error: "Passwords do not match" },
      { status: 400 },
    );
  }

  if (!isStrongPassword(password)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, and a number",
      },
      { status: 400 },
    );
  }

  try {
    const provider = await verifyResetToken(token);
    const passwordHash = await bcrypt.hash(password, 12);

    await db
      .update(schema.saudiLawyers)
      .set({
        passwordHash,
      })
      .where(
        and(
          eq(schema.saudiLawyers.id, provider.id),
          eq(schema.saudiLawyers.countryCode, provider.countryCode),
        ),
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] failed", err);

    return NextResponse.json(
      { ok: false, error: "Invalid or expired reset link" },
      { status: 400 },
    );
  }
}
