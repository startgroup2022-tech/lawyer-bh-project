import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { isEmail } from "@/lib/postmark";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";
import { sendLawyerPasswordResetEmail } from "@/lib/auth/lawyer-password-reset-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://www.lawyers.bh"
  );
}

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

function createResetToken(
  userId: string,
  passwordHash: string,
  countryCode: string,
) {
  const payload = Buffer.from(
    JSON.stringify({
      id: userId,
      countryCode,
      exp: Date.now() + 1000 * 60 * 30, // 30 دقيقة
    }),
    "utf8",
  ).toString("base64url");

  const signature = signPayload(payload, passwordHash);

  return `${payload}.${signature}`;
}

export async function POST(request: Request) {
  let body: {
    identifier?: string;
    countryCode?: string;
    lang?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const identifier = String(body.identifier ?? "").trim();
  let country;
  try {
    country = await requireCountryProduct(body.countryCode || "BH", "lawyers");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }
  const lang = body.lang === "ar" ? "ar" : "en";

  if (!identifier) {
    return NextResponse.json(
      { ok: false, error: "Identifier is required" },
      { status: 400 },
    );
  }

  try {
    const normalizedIdentifier = isEmail(identifier)
      ? identifier.toLowerCase()
      : identifier;

    const [provider] = await db
      .select({
        id: schema.bahrainLawyers.id,
        email: schema.bahrainLawyers.email,
        registrationNo: schema.bahrainLawyers.registrationNo,
        fullNameAr: schema.bahrainLawyers.fullNameAr,
        fullNameEn: schema.bahrainLawyers.fullNameEn,
        passwordHash: schema.bahrainLawyers.passwordHash,
        countryCode: schema.bahrainLawyers.countryCode,
      })
      .from(schema.bahrainLawyers)
      .where(
        and(
          eq(schema.bahrainLawyers.countryCode, country.code),
          isEmail(identifier)
            ? eq(schema.bahrainLawyers.email, normalizedIdentifier)
            : eq(schema.bahrainLawyers.registrationNo, normalizedIdentifier),
        ),
      )
      .limit(1);

    // لا نكشف هل الحساب موجود أو لا
    if (!provider?.email || !provider.passwordHash) {
      return NextResponse.json({ ok: true });
    }

    const token = createResetToken(
      provider.id,
      provider.passwordHash,
      provider.countryCode,
    );
    const resetUrl = `${getSiteUrl()}/${lang}/join?resetToken=${encodeURIComponent(
      token,
    )}`;

    await sendLawyerPasswordResetEmail({
      to: provider.email,
      name: lang === "ar" ? provider.fullNameAr ?? "" : provider.fullNameEn ?? "",
      resetUrl,
      lang,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password] failed", err);

    return NextResponse.json(
      { ok: false, error: "Could not send reset link" },
      { status: 500 },
    );
  }
}
