import {
  escapeHtml,
  sendEmail,
  type SendEmailInput,
} from "@/lib/postmark";

export type LawyerRegistrationEmailInput = {
  applicationId: string;
  countryCode: string;
  email: string;
  phone: string;
  fullNameAr: string;
  fullNameEn: string;
  licenseNumber: string;
  locale: "ar" | "en";
  channel?: "legalsos-web" | "legalsos-mobile" | "lawyers-bh-web";
};

type DeliverEmail = (input: SendEmailInput) => Promise<unknown>;

function buildLawyerMessage(
  input: LawyerRegistrationEmailInput,
): SendEmailInput {
  const isArabic = input.locale === "ar";
  const name = isArabic
    ? input.fullNameAr || input.fullNameEn
    : input.fullNameEn || input.fullNameAr;
  const safeName = escapeHtml(name);

  if (isArabic) {
    return {
      to: input.email,
      subject: "تم استلام طلب تسجيلك | محامون البحرين",
      text: [
        `مرحبًا ${name}،`,
        "",
        "تم استلام طلب تسجيلك بنجاح، وهو الآن بانتظار المراجعة من المنصة.",
        "سنتواصل معك بعد اكتمال المراجعة.",
      ].join("\n"),
      html: [
        '<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8">',
        `<p>مرحبًا ${safeName}،</p>`,
        "<p>تم استلام طلب تسجيلك بنجاح، وهو الآن بانتظار المراجعة من المنصة.</p>",
        "<p>سنتواصل معك بعد اكتمال المراجعة.</p>",
        "</div>",
      ].join(""),
    };
  }

  return {
    to: input.email,
    subject: "Registration application received | Lawyers.bh",
    text: [
      `Hello ${name},`,
      "",
      "Your registration application was received successfully and is awaiting review.",
      "We will contact you after the review is complete.",
    ].join("\n"),
    html: [
      '<div dir="ltr" style="font-family: Arial, sans-serif; line-height: 1.8">',
      `<p>Hello ${safeName},</p>`,
      "<p>Your registration application was received successfully and is awaiting review.</p>",
      "<p>We will contact you after the review is complete.</p>",
      "</div>",
    ].join(""),
  };
}

function buildPlatformMessage(
  input: LawyerRegistrationEmailInput,
): SendEmailInput {
  const countryLabel = input.countryCode === "SA" ? "SA — السعودية" : "BH — البحرين";
  const rows = [
    ["Application ID / رقم الطلب", input.applicationId],
    ["Name / الاسم", `${input.fullNameAr} | ${input.fullNameEn}`],
    ["Email / البريد الإلكتروني", input.email],
    ["Phone / الهاتف", input.phone],
    ["License / رقم الترخيص", input.licenseNumber],
    ["Country / الدولة", countryLabel],
  ] as const;

  const text = [
    `طلب تسجيل محامي جديد يحتاج إلى المراجعة — ${countryLabel}.`,
    "A new lawyer registration application requires review.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="start" style="padding: 6px 12px">${escapeHtml(label)}</th><td style="padding: 6px 12px">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return {
    subject: `طلب تسجيل محامي جديد للمراجعة — ${countryLabel} | New lawyer registration`,
    text,
    html: [
      '<div dir="auto" style="font-family: Arial, sans-serif; line-height: 1.8">',
      `<p>طلب تسجيل محامي جديد يحتاج إلى المراجعة — ${countryLabel}.<br>A new lawyer registration application requires review.</p>`,
      `<table>${htmlRows}</table>`,
      "</div>",
    ].join(""),
  };
}

export async function sendLawyerRegistrationEmails(
  input: LawyerRegistrationEmailInput,
  deliver: DeliverEmail = sendEmail,
) {
  const messages = [buildLawyerMessage(input), buildPlatformMessage(input)];
  const results = await Promise.allSettled(
    messages.map((message) => Promise.resolve().then(() => deliver(message))),
  );

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error("[lawyer-registration-email] delivery failed", {
        audience: index === 0 ? "lawyer" : "platform",
        applicationId: input.applicationId,
        error: result.reason,
      });
    }
  });
}
