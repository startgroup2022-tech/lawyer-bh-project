import {
  escapeHtml,
  sendEmail,
  type SendEmailInput,
} from "@/lib/postmark";

export type LawyerApprovalEmailInput = {
  lawyerId: string;
  email: string;
  fullNameAr: string;
  fullNameEn: string;
  locale: "ar" | "en";
};

type DeliverEmail = (input: SendEmailInput) => Promise<unknown>;

export function isFirstLawyerApproval(previousStatus: string) {
  return previousStatus === "pending";
}

function buildApprovalMessage(
  input: LawyerApprovalEmailInput,
): SendEmailInput {
  const isArabic = input.locale === "ar";
  const name = isArabic
    ? input.fullNameAr || input.fullNameEn
    : input.fullNameEn || input.fullNameAr;
  const safeName = escapeHtml(name);

  if (isArabic) {
    return {
      to: input.email,
      subject: "تهانينا، تم قبول تسجيلك | محامون البحرين",
      text: [
        `مرحبًا ${name}،`,
        "",
        "تهانينا، تم قبول تسجيلك في منصة محامون البحرين، وأصبح حسابك معتمدًا.",
      ].join("\n"),
      html: [
        '<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8">',
        `<p>مرحبًا ${safeName}،</p>`,
        "<p>تهانينا، تم قبول تسجيلك في منصة محامون البحرين، وأصبح حسابك معتمدًا.</p>",
        "</div>",
      ].join(""),
    };
  }

  return {
    to: input.email,
    subject:
      "Congratulations, your registration has been approved | Lawyers.bh",
    text: [
      `Hello ${name},`,
      "",
      "Congratulations, your registration on Lawyers.bh has been approved, and your account is now verified.",
    ].join("\n"),
    html: [
      '<div dir="ltr" style="font-family: Arial, sans-serif; line-height: 1.8">',
      `<p>Hello ${safeName},</p>`,
      "<p>Congratulations, your registration on Lawyers.bh has been approved, and your account is now verified.</p>",
      "</div>",
    ].join(""),
  };
}

export async function sendLawyerApprovalEmail(
  input: LawyerApprovalEmailInput,
  deliver: DeliverEmail = sendEmail,
) {
  try {
    await deliver(buildApprovalMessage(input));
  } catch (error) {
    console.error("[lawyer-approval-email] delivery failed", {
      lawyerId: input.lawyerId,
      audience: "lawyer",
      error,
    });
  }
}
