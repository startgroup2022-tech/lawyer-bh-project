export type LawyerProfileCompletionEmailInput = {
  lawyerName?: string | null;
  profileCompletionUrl: string;
  siteUrl?: string | null;
  supportEmail?: string | null;
  supportPhoneDisplay?: string | null;
  supportPhoneHref?: string | null;
  logoUrl?: string | null;
  /**
   * Optional: pass only the missing items if you already calculate them.
   * If empty/not provided, the email shows the general completion checklist.
   */
  missingItems?: string[];
};

const DEFAULT_SITE_URL = "https://www.lawyers.bh";
const DEFAULT_SUPPORT_EMAIL = "info@lawyers.bh";
const DEFAULT_SUPPORT_PHONE_DISPLAY = "+973 17537070";
const DEFAULT_SUPPORT_PHONE_HREF = "+97317537070";

const DEFAULT_COMPLETION_ITEMS = [
  "نوع مقدم الخدمة والتخصصات ومجالات الخدمة",
  "الاسم، البريد الإلكتروني، رقم الهاتف / الواتساب، واللغة",
  "بيانات الرخصة، رقم الآيبان، وساعات العمل",
  "الصورة الشخصية، ملف الرخصة، شهادة الآيبان، والتوقيع إن وجد",
];

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

function getCompletionItems(input: LawyerProfileCompletionEmailInput) {
  if (Array.isArray(input.missingItems)) {
    const missingItems = input.missingItems
      .map((item) => cleanEmailText(item, ""))
      .filter(Boolean);

    return missingItems.length > 0
      ? missingItems
      : ["لا توجد بيانات ناقصة حالياً حسب البيانات المدخلة."];
  }

  return DEFAULT_COMPLETION_ITEMS.map((item) => cleanEmailText(item)).filter(
    Boolean,
  );
}

export function lawyerProfileCompletionEmailSubject() {
  return "دعوة لاستكمال الملف الشخصي على منصة محامون البحرين";
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
  const items = getCompletionItems(input);
  const hasCalculatedMissingItems = Array.isArray(input.missingItems);
  const listTitle = hasCalculatedMissingItems
    ? input.missingItems && input.missingItems.length > 0
      ? "البيانات الناقصة في ملفكم:"
      : "حالة الملف الشخصي:"
    : "قد تحتاج إلى استكمال بعض البيانات التالية:";

  return [
    `الأستاذ/ة ${lawyerName} المحترم/ة،`,
    "",
    "تحية طيبة وبعد،",
    "",
    "يسرّنا دعوتكم لاستكمال ملفكم الشخصي على منصة محامون البحرين، وذلك لتفعيل ظهوركم ضمن دليل المحامين ومقدمي الخدمات القانونية، وتمكين العملاء من الوصول إلى خدماتكم بكل سهولة وموثوقية.",
    "",
    "يرجى الدخول من خلال الرابط التالي واستكمال البيانات المطلوبة:",
    input.profileCompletionUrl,
    "",
    listTitle,
    ...items.map((item) => `- ${item}`),
    "",
    "بعد إكمال البيانات، سيتم مراجعة الملف من قبل فريق المنصة للتأكد من جاهزيته قبل النشر.",
    "",
    "لأي استفسار أو مساعدة:",
    supportEmail,
    supportPhoneDisplay,
    "",
    "مع خالص التقدير،",
    "فريق منصة محامون السعودية",
    "saudi lawyers",
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
  const items = getCompletionItems(input);
  const hasCalculatedMissingItems = Array.isArray(input.missingItems);
  const checklistTitle = hasCalculatedMissingItems
    ? input.missingItems && input.missingItems.length > 0
      ? "البيانات الناقصة في ملفكم"
      : "حالة الملف الشخصي"
    : "قد تحتاج إلى استكمال بعض البيانات التالية";
  const rowsHtml = items
    .map((item, index) => {
      const isLast = index === items.length - 1;
      return `<tr><td style="padding:10px 0;color:#07111F;font-size:14px;line-height:1.8;font-weight:700;font-family:Arial,Tahoma,sans-serif;${isLast ? "" : "border-bottom:1px solid #EAECF0;"}">${escapeEmailHtml(item)}</td></tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>دعوة لاستكمال الملف الشخصي - محامون البحرين</title>
</head>
<body dir="rtl" style="margin:0;padding:0;background:#EEF0F3;font-family:Arial,Tahoma,sans-serif;color:#07111F;-webkit-font-smoothing:antialiased;color-scheme:light only;">
  <div style="display:none;font-size:1px;color:#EEF0F3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">يرجى استكمال ملفكم الشخصي لتفعيل ظهوركم على منصة محامون البحرين.</div>

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
          <tr><td bgcolor="#006C32" height="4" style="height:4px;font-size:0;line-height:0;background:#006C32;">&nbsp;</td></tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:34px 32px 30px 32px;background:#ffffff;" align="right">
              <h1 style="margin:0 0 12px 0;color:#07111F;font-size:24px;line-height:1.45;font-weight:900;font-family:Arial,Tahoma,sans-serif;">دعوة لاستكمال الملف الشخصي</h1>
              <p style="margin:0 0 10px 0;color:#07111F;font-size:15px;line-height:1.9;font-weight:800;font-family:Arial,Tahoma,sans-serif;">الأستاذ/ة ${lawyerName} المحترم/ة،</p>
              <p style="margin:0 0 20px 0;color:#667085;font-size:15px;line-height:1.9;font-family:Arial,Tahoma,sans-serif;">يسرّنا دعوتكم لاستكمال ملفكم الشخصي على منصة <strong style="color:#07111F;">محامون البحرين</strong>، وذلك لتفعيل ظهوركم ضمن دليل المحامين ومقدمي الخدمات القانونية، وتمكين العملاء من الوصول إلى خدماتكم بكل سهولة وموثوقية.</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F7F8FA;border:1px solid #EAECF0;border-radius:14px;">
                <tr><td style="padding:18px 22px 8px 22px;"><p style="margin:0;color:#082B67;font-size:13px;font-weight:900;font-family:Arial,Tahoma,sans-serif;">${checklistTitle}</p></td></tr>
                <tr>
                  <td style="padding:0 22px 18px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${rowsHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 0;">
                <tr><td bgcolor="#006C32" style="border-radius:12px;background:#006C32;"><a href="${profileCompletionUrl}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:Arial,Tahoma,sans-serif;font-size:14px;font-weight:900;color:#ffffff;text-decoration:none;border-radius:12px;">استكمال الملف الشخصي</a></td></tr>
              </table>

              <p style="margin:24px 0 0 0;color:#667085;font-size:13px;line-height:1.85;font-family:Arial,Tahoma,sans-serif;">بعد إكمال البيانات، سيتم مراجعة الملف من قبل فريق المنصة للتأكد من جاهزيته قبل النشر.</p>
              <p style="margin:14px 0 0 0;color:#667085;font-size:13px;line-height:1.85;font-family:Arial,Tahoma,sans-serif;">إذا لم يعمل الزر، انسخ الرابط التالي وافتحه في المتصفح:</p>
              <p style="margin:8px 0 0 0;word-break:break-all;color:#006C32;font-size:12px;line-height:1.8;font-family:Arial,Tahoma,sans-serif;direction:ltr;text-align:left;" dir="ltr">${profileCompletionUrl}</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#006C32" style="padding:18px 24px;background:#006C32;" align="center">
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
