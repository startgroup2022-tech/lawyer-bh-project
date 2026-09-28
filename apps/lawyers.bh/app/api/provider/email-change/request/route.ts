import { randomInt, randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { digestCode } from "@/lib/client-auth/validation";
import { db, schema } from "@/lib/db/client";
import { escapeHtml, isEmail, sendEmail } from "@/lib/postmark";
import { getProviderSessionFromRequest } from "../../_session";

export async function POST(request: NextRequest) {
  const session = getProviderSessionFromRequest(request);
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { email?: unknown; locale?: unknown };
  const email = String(body.email ?? "").trim().toLowerCase();
  const locale = body.locale === "ar" ? "ar" : "en";
  if (!isEmail(email)) return NextResponse.json({ ok: false, error: "Invalid email", code: "EMAIL_INVALID" }, { status: 400 });
  const [duplicate] = await db.select({ id: schema.bahrainLawyers.id }).from(schema.bahrainLawyers).where(and(eq(schema.bahrainLawyers.email, email), ne(schema.bahrainLawyers.id, session.providerId))).limit(1);
  if (duplicate) return NextResponse.json({ ok: false, error: "Email is already used", code: "EMAIL_ALREADY_USED" }, { status: 409 });
  const secret = process.env.CLIENT_AUTH_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Email verification unavailable" }, { status: 503 });
  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.delete(schema.providerEmailChangeChallenges).where(and(eq(schema.providerEmailChangeChallenges.providerId, session.providerId), eq(schema.providerEmailChangeChallenges.consumed, false)));
  await db.insert(schema.providerEmailChangeChallenges).values({ id, providerId: session.providerId, countryCode: session.countryCode, email, codeDigest: digestCode(id, code, secret), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  try {
    const title = locale === "ar" ? "تأكيد تغيير البريد الإلكتروني" : "Confirm your new email";
    const text = locale === "ar" ? `رمز التحقق: ${code}\nصالح لمدة 10 دقائق.` : `Verification code: ${code}\nValid for 10 minutes.`;
    await sendEmail({ to: email, subject: `${title} | Lawyers.bh`, text: `${title}\n${text}`, html: `<div dir="${locale === "ar" ? "rtl" : "ltr"}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text).replace("\n", "<br>")}</p></div>` });
    await db.update(schema.providerEmailChangeChallenges).set({ delivered: true }).where(eq(schema.providerEmailChangeChallenges.id, id));
    return NextResponse.json({ ok: true, challengeId: id, expiresInSeconds: 600 });
  } catch {
    return NextResponse.json({ ok: false, error: "Could not send verification code", code: "EMAIL_DELIVERY_FAILED" }, { status: 503 });
  }
}
