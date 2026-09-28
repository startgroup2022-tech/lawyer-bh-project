import {
  escapeHtml,
  sendEmail,
  type SendEmailInput,
} from "@/lib/postmark";

type DeliverEmail = (input: SendEmailInput) => Promise<unknown>;

export async function sendLawyerPasswordResetEmail(
  params: {
    to: string;
    name: string;
    resetUrl: string;
    lang: "ar" | "en";
  },
  deliver: DeliverEmail = sendEmail,
) {
  const safeName = escapeHtml(params.name);
  const safeResetUrl = escapeHtml(params.resetUrl);
  const subject =
    params.lang === "ar"
      ? "إعادة تعيين كلمة المرور - محامون البحرين"
      : "Reset your password - Lawyers.bh";

  const html =
    params.lang === "ar"
      ? `
        <div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
          <h2>إعادة تعيين كلمة المرور</h2>
          <p>مرحباً ${safeName}</p>
          <p>اضغط على الزر التالي لتعيين كلمة مرور جديدة. الرابط صالح لمدة 30 دقيقة.</p>
          <p>
            <a href="${safeResetUrl}" style="display:inline-block;background:#7A1616;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">
              تعيين كلمة مرور جديدة
            </a>
          </p>
          <p>إذا لم تطلب هذا الإجراء، تجاهل هذه الرسالة.</p>
        </div>
      `
      : `
        <div style="font-family:Arial,sans-serif;line-height:1.8">
          <h2>Reset your password</h2>
          <p>Hello ${safeName}</p>
          <p>Click the button below to set a new password. This link is valid for 30 minutes.</p>
          <p>
            <a href="${safeResetUrl}" style="display:inline-block;background:#7A1616;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:bold">
              Set new password
            </a>
          </p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `;

  return deliver({
    to: params.to,
    subject,
    html,
    text: params.resetUrl,
  });
}
