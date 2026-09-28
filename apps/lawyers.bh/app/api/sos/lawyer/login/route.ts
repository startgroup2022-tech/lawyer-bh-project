import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ServerClient } from "postmark";
import { db, schema } from "@/lib/db/client";
import { createMagicLinkToken } from "@/lib/sos/lawyerAuth";
import { siteOrigin } from "@/lib/tap";
import { mapCountryProductAccessError, requireCountryProduct } from "@/lib/countries/product-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  countryCode?: string;
  email: string;
  locale: "en" | "ar";
}

/** Email a one-time magic link to the advocate. We always return ok:true
 *  even if the email doesn't match a known advocate, so a stranger can't
 *  use this endpoint as a user enumeration oracle. */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  let country;
  try {
    country = await requireCountryProduct(body.countryCode || "BH", "legal_sos");
  } catch (error) {
    const mapped = mapCountryProductAccessError(error);
    if (mapped) return NextResponse.json(mapped.body, { status: mapped.status });
    throw error;
  }

  const email = body.email?.trim().toLowerCase();
  const locale: "en" | "ar" = body.locale === "ar" ? "ar" : "en";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const [advocate] = await db
    .select({
      id: schema.bahrainLawyers.id,
      countryCode: schema.bahrainLawyers.countryCode,
      email: schema.bahrainLawyers.email,
      fullName: schema.bahrainLawyers.fullNameAr,
      isActive: schema.bahrainLawyers.isActive,
    })
    .from(schema.bahrainLawyers)
    .where(
      and(
        eq(schema.bahrainLawyers.email, email),
        eq(schema.bahrainLawyers.countryCode, country.code),
      ),
    )
    .limit(1);

  if (advocate?.isActive && advocate.email) {
    const token = await createMagicLinkToken(advocate.id, country.code);
    const link = `${siteOrigin(req)}/${locale}/sos/lawyer/auth/${encodeURIComponent(token)}`;
    void sendMagicLinkEmail({
      to: advocate.email,
      name: advocate.fullName,
      link,
      locale,
    });
  } else {
    // Don't leak whether the email exists. Log internally for support.
    console.info(`[sos/lawyer/login] no active advocate for email ${email}`);
  }

  return NextResponse.json({ ok: true });
}

interface MailArgs {
  to: string;
  name: string;
  link: string;
  locale: "en" | "ar";
}

async function sendMagicLinkEmail(args: MailArgs) {
  const token = process.env.POSTMARK_TOKEN ?? process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    console.warn(`[sos/lawyer/login] POSTMARK_TOKEN missing; magic link: ${args.link}`);
    return;
  }
  try {
    const client = new ServerClient(token);
    const isAr = args.locale === "ar";
    const subject = isAr
      ? "رابط تسجيل الدخول لمحامي الطوارئ"
      : "Your Legal SOS sign-in link";
    const cta = isAr ? "تسجيل الدخول" : "Sign in";
    const expires = isAr ? "ينتهي خلال 15 دقيقة" : "Expires in 15 minutes";
    await client.sendEmail({
      From: process.env.POSTMARK_FROM ?? "no-reply@lawyers.bh",
      To: args.to,
      Subject: subject,
      HtmlBody: `
<p>${isAr ? `أهلاً ${args.name}،` : `Hello ${args.name},`}</p>
<p>${isAr ? "اضغط الرابط أدناه لتسجيل الدخول إلى لوحة محامي الطوارئ:" : "Tap the link below to sign in to your Legal SOS advocate dashboard:"}</p>
<p style="margin:20px 0">
  <a href="${args.link}" style="background:#1A237E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">
    ${cta}
  </a>
</p>
<p style="color:#666;font-size:12px">${expires}</p>
<p style="color:#666;font-size:12px">${isAr ? "إن لم تطلب هذا الرابط فيمكنك تجاهل هذه الرسالة." : "If you didn't request this link, you can safely ignore this email."}</p>
      `.trim(),
      TextBody: `${isAr ? `أهلاً ${args.name}،\n\nاضغط الرابط لتسجيل الدخول:\n${args.link}\n\nينتهي خلال 15 دقيقة.` : `Hello ${args.name},\n\nSign in: ${args.link}\n\nExpires in 15 minutes.`}`,
      MessageStream: "outbound",
    });
  } catch (e) {
    console.error("[sos/lawyer/login] postmark failed", e);
  }
}
