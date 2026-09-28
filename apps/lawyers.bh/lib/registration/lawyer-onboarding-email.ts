import {
  escapeHtml,
  sendEmail,
  type SendEmailInput,
} from "@/lib/postmark";

import type { LawyerOnboardingLocale } from "./lawyer-onboarding";

type VerificationEmailInput = {
  to: string;
  fullName: string;
  locale: LawyerOnboardingLocale;
  verificationUrl: string;
};

const translations = {
  ar: {
    subject: "أكمل تسجيلك كمحامي في LegalSOS",
    greeting: "مرحبًا",
    body: "تحقق من بريدك ثم أكمل بياناتك المهنية. سيبقى الحساب غير مفعّل حتى اكتمال الملف وموافقة الإدارة.",
    action: "التحقق واستكمال التسجيل",
  },
  en: {
    subject: "Complete your LegalSOS lawyer registration",
    greeting: "Hello",
    body: "Verify your email and complete your professional details. Your account stays inactive until the profile is complete and approved by an administrator.",
    action: "Verify and continue registration",
  },
  tr: {
    subject: "LegalSOS avukat kaydınızı tamamlayın",
    greeting: "Merhaba",
    body: "E-posta adresinizi doğrulayın ve mesleki bilgilerinizi tamamlayın. Profil tamamlanıp yönetici tarafından onaylanana kadar hesabınız etkinleşmez.",
    action: "Doğrula ve kayda devam et",
  },
} satisfies Record<
  LawyerOnboardingLocale,
  { subject: string; greeting: string; body: string; action: string }
>;

export function buildLawyerOnboardingVerificationEmail(
  input: VerificationEmailInput,
): SendEmailInput {
  const copy = translations[input.locale];
  const direction = input.locale === "ar" ? "rtl" : "ltr";
  const safeName = escapeHtml(input.fullName);
  const safeUrl = escapeHtml(input.verificationUrl);

  return {
    to: input.to,
    subject: copy.subject,
    text: `${copy.greeting} ${input.fullName},\n\n${copy.body}\n\n${copy.action}: ${input.verificationUrl}`,
    html: `<div dir="${direction}"><h2>${copy.greeting} ${safeName}</h2><p>${copy.body}</p><p><a href="${safeUrl}">${copy.action}</a></p></div>`,
  };
}

export async function sendLawyerOnboardingVerificationEmail(
  input: VerificationEmailInput,
  deliver: (message: SendEmailInput) => Promise<unknown> = sendEmail,
) {
  return deliver(buildLawyerOnboardingVerificationEmail(input));
}
