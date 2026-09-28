import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { isEmail } from "@/lib/postmark";
import { assertKsaInputCountry, getKsaContext } from "@/lib/ksa/context";

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

async function sendResetEmail(params: {
  to: string;
  name: string;
  resetUrl: string;
  lang: "ar" | "en";
}) {
  const postmarkToken = process.env.POSTMARK_TOKEN;
  const from = process.env.POSTMARK_FROM || "info@lawyers.bh";

  const subject =
    params.lang === "ar"
      ? "إعادة تعيين كلمة المرور - محامون البحرين"
      : "Reset your password - Lawyers.bh";

  const html =
    params.lang === "ar"
      ? `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
          <h2>إعادة تعيين كلمة المرور</h2>
          <p>مرحباً ${params.name || ""}</p>
          <p>اضغط على الزر التالي لتعيين كلمة مرور جديدة. الرابط صالح لمدة 30 دقيقة.</p>
          <p>
            <a href="${params.resetUrl}" style="display:inline-block;background:#006C32;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">
              تعيين كلمة مرور جديدة
            </a>
          </p>
          <p>إذا لم تطلب هذا الإجراء، تجاهل هذه الرسالة.</p>
        </div>
      `
      : `
        <div style="font-family:Arial,sans-serif;line-height:1.8">
          <h2>Reset your password</h2>
          <p>Hello ${params.name || ""}</p>
          <p>Click the button below to set a new password. This link is valid for 30 minutes.</p>
          <p>
            <a href="${params.resetUrl}" style="display:inline-block;background:#006C32;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">
              Set new password
            </a>
          </p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `;

  if (!postmarkToken) {
    console.log("[forgot-password] reset link:", params.resetUrl);
    return;
  }

  const res = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": postmarkToken,
    },
    body: JSON.stringify({
      From: from,
      To: params.to,
      Subject: subject,
      HtmlBody: html,
      TextBody: params.resetUrl,
      MessageStream: "outbound",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[forgot-password] postmark failed", text);
    throw new Error("Could not send reset email");
  }
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
  const lang = body.lang === "ar" ? "ar" : "en";

  try {
    assertKsaInputCountry(body.countryCode);
  } catch {
    return NextResponse.json(
      { ok: false, error: "KSA_COUNTRY_REQUIRED" },
      { status: 400 },
    );
  }
  const { country } = await getKsaContext();

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
        id: schema.saudiLawyers.id,
        email: schema.saudiLawyers.email,
        registrationNo: schema.saudiLawyers.registrationNo,
        fullNameAr: schema.saudiLawyers.fullNameAr,
        fullNameEn: schema.saudiLawyers.fullNameEn,
        passwordHash: schema.saudiLawyers.passwordHash,
        countryCode: schema.saudiLawyers.countryCode,
      })
      .from(schema.saudiLawyers)
      .where(
        and(
          eq(schema.saudiLawyers.countryCode, country.code),
          isEmail(identifier)
            ? eq(schema.saudiLawyers.email, normalizedIdentifier)
            : eq(schema.saudiLawyers.registrationNo, normalizedIdentifier),
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

    await sendResetEmail({
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
