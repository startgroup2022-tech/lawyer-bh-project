export type LawyerProfileCompletionEmailInput = {
  lawyerName?: string | null;
  profileCompletionUrl: string;
  siteUrl?: string | null;
  supportEmail?: string | null;
  supportPhoneDisplay?: string | null;
  supportPhoneHref?: string | null;
  logoUrl?: string | null;
};

const DEFAULT_SITE_URL = "https://www.lawyers.bh";
const DEFAULT_SUPPORT_EMAIL = "info@lawyers.bh";
const DEFAULT_SUPPORT_PHONE_DISPLAY = "+973 17537070";
const DEFAULT_SUPPORT_PHONE_HREF = "+97317537070";

function escapeEmailHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanEmailText(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanSiteUrl(value: unknown) {
  return cleanEmailText(value, DEFAULT_SITE_URL).replace(/\/+$/, "");
}

function buildLogoUrl(input: LawyerProfileCompletionEmailInput) {
  if (input.logoUrl) return cleanEmailText(input.logoUrl);

  // Local project file:
  // /Users/hma/lawyers.bh/apps/lawyers.bh/public/images/logo-full-ar.png
  // Email clients need a public absolute URL:
  return `${cleanSiteUrl(input.siteUrl)}/images/logo-full-ar.png`;
}

export function lawyerProfileCompletionEmailSubject() {
  return "دعوة للانضمام إلى منصة محامون البحرين";
}

export function lawyerProfileCompletionEmailText(
  input: LawyerProfileCompletionEmailInput,
) {
  const lawyerName = cleanEmailText(input.lawyerName, "المحامي");
  const supportEmail = cleanEmailText(
    input.supportEmail,
    DEFAULT_SUPPORT_EMAIL,
  );
  const supportPhoneDisplay = cleanEmailText(
    input.supportPhoneDisplay,
    DEFAULT_SUPPORT_PHONE_DISPLAY,
  );
  return [
    `الأستاذ/ة ${lawyerName} المحترم/ة،`,
    "",
    "تحية طيبة وبعد،",
    "",
    "يسرّنا دعوتكم للانضمام إلى منصة محامون البحرين، والانضمام إلى شبكتنا المهنية للمحامين ومقدمي الخدمات القانونية في مملكة البحرين.",
    "",
    "لقبول الدعوة والانضمام إلى المنصة، يرجى استخدام الرابط الآمن التالي:",
    input.profileCompletionUrl,
    "",
    "يسعدنا انضمامكم إلى مجتمع محامون البحرين، ونتطلع إلى حضوركم المهني ضمن المنصة.",
    "",
    "لأي استفسار أو مساعدة:",
    supportEmail,
    supportPhoneDisplay,
    "",
    "مع خالص التقدير،",
    "فريق منصة محامون البحرين",
    "lawyers.bh",
  ].join("\n");
}

export function lawyerProfileCompletionEmailHtml(
  input: LawyerProfileCompletionEmailInput,
) {
  const lawyerName = escapeEmailHtml(
    cleanEmailText(input.lawyerName, "المحامي"),
  );
  const profileCompletionUrl = escapeEmailHtml(input.profileCompletionUrl);
  const siteUrl = escapeEmailHtml(cleanSiteUrl(input.siteUrl));
  const logoUrl = escapeEmailHtml(buildLogoUrl(input));
  const supportEmail = escapeEmailHtml(
    cleanEmailText(input.supportEmail, DEFAULT_SUPPORT_EMAIL),
  );
  const supportPhoneDisplay = escapeEmailHtml(
    cleanEmailText(input.supportPhoneDisplay, DEFAULT_SUPPORT_PHONE_DISPLAY),
  );
  const supportPhoneHref = escapeEmailHtml(
    cleanEmailText(input.supportPhoneHref, DEFAULT_SUPPORT_PHONE_HREF),
  );
  const currentYear = new Date().getFullYear();
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>دعوة للانضمام إلى منصة محامون البحرين</title>
</head>
<body dir="rtl" style="margin:0;padding:0;background:#EEF0F3;font-family:Arial,Tahoma,sans-serif;color:#07111F;-webkit-font-smoothing:antialiased;color-scheme:light only;">
  <div style="display:none;font-size:1px;color:#EEF0F3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">يسرّنا دعوتكم للانضمام إلى منصة محامون البحرين.</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EEF0F3" style="background:#EEF0F3;">
    <tr>
      <td align="center" style="padding:30px 14px;">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 18px 46px rgba(7,17,31,0.08);">
          <tr>
            <td bgcolor="#ffffff" style="padding:28px 24px 22px 24px;background:#ffffff;" align="center">
              <a href="${siteUrl}" target="_blank" style="display:inline-block;text-decoration:none;">
                <img src="${logoUrl}" width="220" alt="محامون البحرين" style="display:block;width:220px;max-width:80%;height:auto;border:0;outline:none;text-decoration:none;" />
              </a>
            </td>
          </tr>
          <tr><td bgcolor="#B91D1C" height="4" style="height:4px;font-size:0;line-height:0;background:#B91D1C;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:34px 32px 30px 32px;background:#ffffff;" align="right">
              <h1 style="margin:0 0 12px 0;color:#07111F;font-size:24px;line-height:1.45;font-weight:900;font-family:Arial,Tahoma,sans-serif;">دعوة للانضمام إلى منصة محامون البحرين</h1>
              <p style="margin:0 0 10px 0;color:#07111F;font-size:15px;line-height:1.9;font-weight:800;font-family:Arial,Tahoma,sans-serif;">الأستاذ/ة ${lawyerName} المحترم/ة،</p>
              <p style="margin:0 0 20px 0;color:#667085;font-size:15px;line-height:1.9;font-family:Arial,Tahoma,sans-serif;">يسرّنا دعوتكم للانضمام إلى منصة <strong style="color:#07111F;">محامون البحرين</strong>، والانضمام إلى شبكتنا المهنية للمحامين ومقدمي الخدمات القانونية في مملكة البحرين.</p>
              <p style="margin:0;color:#667085;font-size:14px;line-height:1.9;font-family:Arial,Tahoma,sans-serif;">اضغطوا على الزر أدناه لقبول الدعوة والانضمام إلى المنصة.</p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 0;">
                <tr><td bgcolor="#B91D1C" style="border-radius:12px;background:#B91D1C;"><a href="${profileCompletionUrl}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:Arial,Tahoma,sans-serif;font-size:14px;font-weight:900;color:#ffffff;text-decoration:none;border-radius:12px;">قبول الدعوة والانضمام</a></td></tr>
              </table>

              <p style="margin:24px 0 0 0;color:#667085;font-size:13px;line-height:1.85;font-family:Arial,Tahoma,sans-serif;">يسعدنا انضمامكم إلى مجتمع محامون البحرين، ونتطلع إلى حضوركم المهني ضمن المنصة.</p>
              <p style="margin:14px 0 0 0;color:#667085;font-size:13px;line-height:1.85;font-family:Arial,Tahoma,sans-serif;">إذا لم يعمل زر الانضمام، انسخ الرابط التالي وافتحه في المتصفح:</p>
              <p style="margin:8px 0 0 0;word-break:break-all;color:#B91D1C;font-size:12px;line-height:1.8;font-family:Arial,Tahoma,sans-serif;direction:ltr;text-align:left;" dir="ltr">${profileCompletionUrl}</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#B91D1C" style="padding:18px 24px;background:#B91D1C;" align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:0 10px;font-size:13px;font-family:Arial,Tahoma,sans-serif;color:#ffffff;"><a href="tel:${supportPhoneHref}" style="color:#ffffff;text-decoration:none;">${supportPhoneDisplay}</a></td><td style="padding:0 6px;color:rgba(255,255,255,0.55);font-size:13px;">&middot;</td><td style="padding:0 10px;font-size:13px;font-family:Arial,Tahoma,sans-serif;color:#ffffff;"><a href="mailto:${supportEmail}" style="color:#ffffff;text-decoration:none;">${supportEmail}</a></td></tr></table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#07111F" style="padding:24px 30px;background:#07111F;" align="center">
              <p style="margin:0;color:#A7AFBB;font-size:12px;line-height:1.7;font-family:Arial,Tahoma,sans-serif;">بوابتك الآمنة للاستشارات والخدمات القانونية في مملكة البحرين.</p>
              <p style="margin:12px 0 0 0;color:#7B8492;font-size:11px;font-family:Arial,Tahoma,sans-serif;">&copy; ${currentYear} محامون البحرين. جميع الحقوق محفوظة.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
