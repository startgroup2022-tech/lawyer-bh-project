import { escapeHtml } from "./postmark";

export type EmailLang = "en" | "ar";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

interface LayoutInput {
  lang: EmailLang;
  preheader: string;
  headline: string;
  intro: string;
  details: Array<[string, string]>;
  cta?: { label: string; url: string };
  footnote?: string;
}

const BRAND = {
  primary: "#006C32",
  accent: "#082B67",
  gold: "#C89A45",
  bgLight: "#F7F8FA",
  bgDark: "#0F1923",
  textPrimary: "#07111F",
  textMuted: "#667085",
  border: "#EAECF0",
};

const timePeriods = [
  {
    value: "09:00-13:00",
    label: { en: "First Period", ar: "الفترة الأولى" },
    range: { en: "9:00 AM - 1:00 PM", ar: "9 صباحاً - 1 ظهراً" },
  },
  {
    value: "13:00-17:00",
    label: { en: "Second Period", ar: "الفترة الثانية" },
    range: { en: "1:00 PM - 5:00 PM", ar: "1 ظهراً - 5 عصراً" },
  },
  {
    value: "09:00-17:00",
    label: { en: "Third Period", ar: "الفترة الثالثة" },
    range: { en: "9:00 AM - 5:00 PM", ar: "9 صباحاً - 5 عصراً" },
  },
] as const;

function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function cleanEmailValue(value: unknown, fallback = "-") {
  const text = toEnglishDigits(String(value ?? "").trim());

  return text || fallback;
}

function cleanName(value: unknown, fallback: string) {
  return cleanEmailValue(value, fallback);
}

function joinName(firstName: string, lastName: string, fallback: string) {
  return cleanEmailValue(`${firstName ?? ""} ${lastName ?? ""}`.trim(), fallback);
}

function normalizeTimePeriodValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace("–", "-")
    .replace("—", "-")
    .replace(/\s+/g, "");
}

function formatTime12HourValue(time: string, isAr: boolean) {
  const cleanTime = String(time ?? "").trim();
  const [hourPart, minutePart = "00"] = cleanTime.split(":");

  const hour24 = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return cleanEmailValue(cleanTime);
  }

  const period = hour24 >= 12 ? (isAr ? "م" : "PM") : isAr ? "ص" : "AM";
  const hour12 = hour24 % 12 || 12;

  return cleanEmailValue(`${hour12}:${String(minute).padStart(2, "0")} ${period}`);
}

function formatAppointmentTime(value: string | null | undefined, isAr: boolean) {
  const normalized = normalizeTimePeriodValue(value);

  if (!normalized) return "-";

  const period = timePeriods.find((item) => item.value === normalized);

  if (period) {
    return `${period.label[isAr ? "ar" : "en"]} — ${
      period.range[isAr ? "ar" : "en"]
    }`;
  }

  const [start, end] = normalized.split("-");

  if (start && end) {
    return `${formatTime12HourValue(start, isAr)} - ${formatTime12HourValue(
      end,
      isAr,
    )}`;
  }

  return cleanEmailValue(value);
}

function withBahrainTimezone(time: string, isAr: boolean) {
  const cleanTime = cleanEmailValue(time);

  if (cleanTime === "-") return cleanTime;

  return isAr ? `${cleanTime} — توقيت البحرين` : `${cleanTime} — Bahrain time`;
}

function isPhoneLikeValue(value: string) {
  const cleanValue = cleanEmailValue(value, "");
  const digitsOnly = cleanValue.replace(/\D/g, "");

  return (
    digitsOnly.length >= 7 &&
    /^[+\d\s().-]+$/.test(cleanValue)
  );
}

function formatConsultationPlace(
  value: string | null | undefined,
  isAr: boolean,
  hasVideoCall: boolean,
) {
  const cleanValue = cleanEmailValue(value, "");

  if (!cleanValue || cleanValue === "-" || isPhoneLikeValue(cleanValue)) {
    return hasVideoCall
      ? isAr
        ? "مكالمة فيديو — الرابط مرفق في البريد"
        : "Video call — link included in this email"
      : isAr
        ? "سيتم التواصل معك لتأكيد طريقة الاستشارة"
        : "We will contact you to confirm the consultation method";
  }

  return cleanValue;
}

function formatSubscriptionType(value: string, isAr: boolean) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  const labels: Record<string, { ar: string; en: string }> = {
    lawyer: { ar: "محامي", en: "Lawyer" },
    consultant: { ar: "مستشار", en: "Consultant" },
    mediator: { ar: "وسيط", en: "Mediator" },
    arbitrator: { ar: "محكم", en: "Arbitrator" },
    expert: { ar: "خبير", en: "Expert" },
    private_executor: { ar: "منفذ خاص", en: "Private Executor" },
    private_notary: { ar: "كاتب عدل خاص", en: "Private Notary" },
    translator: { ar: "مترجم", en: "Translator" },
  };

  return labels[normalized]?.[isAr ? "ar" : "en"] ?? cleanEmailValue(value);
}

function renderLayout(input: LayoutInput): { html: string; text: string } {
  const { lang, preheader, headline, intro, details, cta, footnote } = input;
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const startAlign = isAr ? "right" : "left";
  const endAlign = isAr ? "left" : "right";
  const labelPadding = isAr ? "14px 0 14px 16px" : "14px 16px 14px 0";
  const valuePadding = isAr ? "14px 16px 14px 0" : "14px 0 14px 16px";

  const tagline = isAr
    ? "بوابتك الآمنة للاستشارات والخدمات القانونية في مملكة البحرين."
    : "Your secure gateway to legal advice and services in the Kingdom of Bahrain.";
  const detailsTitle = isAr ? "تفاصيل الطلب" : "Request Details";
  const year = new Date().getFullYear();

  const safeDetails = details
    .map(([k, v]) => [cleanEmailValue(k, ""), cleanEmailValue(v)] as [string, string])
    .filter(([k]) => Boolean(k));

  const detailsRows = safeDetails
    .map(([k, v], i) => {
      const isLast = i === safeDetails.length - 1;
      const borderBottom = isLast ? "none" : `1px solid ${BRAND.border}`;

      return `
            <tr>
              <td align="${startAlign}" style="padding:${labelPadding};color:${BRAND.textMuted};font-size:13px;font-weight:700;font-family:Arial,Helvetica,sans-serif;border-bottom:${borderBottom};vertical-align:top;white-space:nowrap;">${escapeHtml(
        k,
      )}</td>
              <td align="${endAlign}" style="padding:${valuePadding};color:${BRAND.textPrimary};font-size:14px;font-weight:800;font-family:Arial,Helvetica,sans-serif;border-bottom:${borderBottom};vertical-align:top;word-break:break-word;">${escapeHtml(
        v,
      )}</td>
            </tr>`;
    })
    .join("");

  const safePreheader = cleanEmailValue(preheader, "");
  const safeHeadline = cleanEmailValue(headline, "");
  const safeIntro = cleanEmailValue(intro, "");

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}" dir="${dir}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(safeHeadline)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
    table { border-collapse: collapse !important; }
  </style>
  <![endif]-->
</head>
<body dir="${dir}" style="margin:0;padding:0;background:#eef0f3;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;color-scheme:light only;">
  <div style="display:none;font-size:1px;color:#eef0f3;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(
    safePreheader,
  )}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#eef0f3" style="background:#eef0f3;">
    <tr>
      <td align="center" style="padding:30px 14px;">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 18px 46px rgba(7,17,31,0.08);">
          <tr>
            <td bgcolor="#ffffff" style="padding:30px 24px 24px 24px;background:#ffffff;" align="center">
              <img src="cid:logo.png" width="150" alt="Lawyers.bh" style="display:block;border:0;outline:none;text-decoration:none;width:150px;height:auto;max-width:150px;" />
            </td>
          </tr>
          <tr>
            <td bgcolor="${BRAND.primary}" height="4" style="height:4px;font-size:0;line-height:0;background:${BRAND.primary};">&nbsp;</td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" style="padding:34px 32px 30px 32px;background:#ffffff;" align="${startAlign}">
              <h1 style="margin:0 0 12px 0;color:${BRAND.textPrimary};font-size:24px;line-height:1.45;font-weight:800;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(
    safeHeadline,
  )}</h1>
              <p style="margin:0 0 24px 0;color:${BRAND.textMuted};font-size:15px;line-height:1.85;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(
    safeIntro,
  )}</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.bgLight};border:1px solid ${BRAND.border};border-radius:14px;">
                <tr>
                  <td style="padding:18px 22px 6px 22px;">
                    <p style="margin:0;color:${BRAND.accent};font-size:13px;font-weight:800;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(
                      detailsTitle,
                    )}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 22px 8px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${detailsRows}
                    </table>
                  </td>
                </tr>
              </table>

              ${
                cta
                  ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 0;">
                      <tr>
                        <td bgcolor="${BRAND.primary}" style="border-radius:12px;background:${BRAND.primary};">
                          <a href="${escapeHtml(
                            cta.url,
                          )}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(
                      cta.label,
                    )}</a>
                        </td>
                      </tr>
                    </table>`
                  : ""
              }

              ${
                footnote
                  ? `<p style="margin:24px 0 0 0;color:${BRAND.textMuted};font-size:13px;line-height:1.85;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(
                      cleanEmailValue(footnote, ""),
                    )}</p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td bgcolor="${BRAND.primary}" style="padding:18px 24px;background:${BRAND.primary};" align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 10px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
                    <a href="tel:+97317537070" style="color:#ffffff;text-decoration:none;">+973 1753 7070</a>
                  </td>
                  <td style="padding:0 6px;color:rgba(255,255,255,0.55);font-size:13px;">&middot;</td>
                  <td style="padding:0 10px;font-size:13px;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
                    <a href="mailto:info@lawyers.bh" style="color:#ffffff;text-decoration:none;">info@lawyers.bh</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="${BRAND.bgDark}" style="padding:24px 30px;background:${BRAND.bgDark};" align="center">
              <p style="margin:0;color:#a7afbb;font-size:12px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(
    tagline,
  )}</p>
              <p style="margin:12px 0 0 0;color:#7b8492;font-size:11px;font-family:Arial,Helvetica,sans-serif;">
                &copy; ${year} Lawyers.bh. ${isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines: string[] = [safeHeadline, "", safeIntro, ""];
  for (const [k, v] of safeDetails) textLines.push(`${k}: ${v}`);
  if (cta) textLines.push("", `${cleanEmailValue(cta.label)}: ${cleanEmailValue(cta.url)}`);
  if (footnote) textLines.push("", cleanEmailValue(footnote));
  textLines.push("", "—", "Lawyers.bh", "+973 1753 7070", "info@lawyers.bh", "", tagline);

  return { html, text: textLines.join("\n") };
}

export function bookingCustomerConfirmation(data: {
  lang: EmailLang;
  bookingId: string;
  service: string;
  consultationType: string;
  consultationPrice: string;
  date: string;
  time: string;
  name: string;
  meetingLocation: string;
  videoCallUrl?: string;
}): RenderedEmail {
  const {
    lang,
    bookingId,
    service,
    consultationType,
    consultationPrice,
    date,
    time,
    name,
    meetingLocation,
    videoCallUrl,
  } = data;

  const isAr = lang === "ar";
  const customerName = cleanName(name, isAr ? "العميل" : "Client");
  const displayDate = cleanEmailValue(date);
  const displayTime = formatAppointmentTime(time, isAr);
  const appointmentTime = withBahrainTimezone(displayTime, isAr);
  const methodOrLocation = formatConsultationPlace(
    meetingLocation,
    isAr,
    Boolean(videoCallUrl),
  );
  const consultationDetails = `${cleanEmailValue(consultationType)} — ${cleanEmailValue(
    consultationPrice,
  )}`;

  const subject = isAr
    ? `تم استلام طلب موعدك — ${displayDate}`
    : `Your appointment request has been received — ${displayDate}`;

  const headline = isAr
    ? "تم استلام طلب موعدك"
    : "Appointment Request Received";

  const intro = isAr
    ? `مرحباً ${customerName}، تم استلام طلبك عبر منصة محامون البحرين. سيقوم فريقنا بمراجعة البيانات والتواصل معك لتأكيد الموعد أو أي تفاصيل إضافية.`
    : `Hi ${customerName}, your request has been received through Lawyers.bh. Our team will review the details and contact you to confirm the appointment or any additional information.`;

  const details: Array<[string, string]> = [
    [isAr ? "الرقم المرجعي" : "Reference", bookingId],
    [isAr ? "الخدمة" : "Service", service],
    [isAr ? "نوع الاستشارة والسعر" : "Consultation & Price", consultationDetails],
    [isAr ? "التاريخ المطلوب" : "Requested Date", displayDate],
    [isAr ? "وقت الموعد" : "Appointment Time", appointmentTime],
    [isAr ? "طريقة / موقع الاستشارة" : "Method / Location", methodOrLocation],
  ];

  const cta = videoCallUrl
    ? {
        label: isAr ? "رابط مكالمة الفيديو" : "Video Call Link",
        url: videoCallUrl,
      }
    : undefined;

  const footnote = isAr
    ? "يرجى الاحتفاظ بالرقم المرجعي عند التواصل معنا. في حال رغبتك في تعديل أو إلغاء الطلب، تواصل معنا عبر بيانات الاتصال أدناه."
    : "Please keep your reference number when contacting us. If you need to reschedule or cancel, contact us using the details below.";

  const preheader = isAr
    ? `${bookingId} — ${displayDate} — ${displayTime}`
    : `${bookingId} — ${displayDate} — ${displayTime}`;

  const { html, text } = renderLayout({
    lang,
    preheader,
    headline,
    intro,
    details,
    cta,
    footnote,
  });

  return { subject, html, text };
}
export function bookingAdminNotification(data: {
  lang: EmailLang;
  bookingId: string;
  service: string;
  consultationType: string;
  consultationPrice: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  meetingLocation: string;
  videoCallUrl?: string;
}): RenderedEmail {
  const {
    lang,
    bookingId,
    service,
    consultationType,
    consultationPrice,
    date,
    time,
    name,
    phone,
    email,
    message,
    meetingLocation,
    videoCallUrl,
  } = data;

  const isAr = lang === "ar";
  const customerName = cleanName(name, isAr ? "عميل" : "Client");
  const displayDate = cleanEmailValue(date);
  const displayTime = formatAppointmentTime(time, isAr);
  const appointmentTime = withBahrainTimezone(displayTime, isAr);
  const methodOrLocation = formatConsultationPlace(
    meetingLocation,
    isAr,
    Boolean(videoCallUrl),
  );
  const consultationDetails = `${cleanEmailValue(consultationType)} — ${cleanEmailValue(
    consultationPrice,
  )}`;

  const subject = isAr
    ? `طلب موعد جديد يحتاج مراجعة (${cleanEmailValue(bookingId)})`
    : `New appointment request requires review (${cleanEmailValue(bookingId)})`;

  const headline = isAr ? "طلب موعد جديد" : "New Appointment Request";

  const intro = isAr
    ? `يوجد طلب موعد جديد من ${customerName}. يرجى مراجعة بيانات الطلب من لوحة التحكم والتواصل مع العميل عند الحاجة.`
    : `There is a new appointment request from ${customerName}. Please review the request details in the admin dashboard and contact the client if needed.`;

  const details: Array<[string, string]> = [
    [isAr ? "الرقم المرجعي" : "Reference", bookingId],
    [isAr ? "الخدمة" : "Service", service],
    [isAr ? "نوع الاستشارة والسعر" : "Consultation & Price", consultationDetails],
    [isAr ? "التاريخ المطلوب" : "Requested Date", displayDate],
    [isAr ? "وقت الموعد" : "Appointment Time", appointmentTime],
    [isAr ? "طريقة / موقع الاستشارة" : "Method / Location", methodOrLocation],
    [isAr ? "اسم العميل" : "Client Name", customerName],
    [isAr ? "الهاتف" : "Phone", phone],
    [isAr ? "البريد الإلكتروني" : "Email", email],
  ];

  if (message) {
    details.push([isAr ? "رسالة العميل" : "Client Message", message]);
  }

  const cta = videoCallUrl
    ? {
        label: isAr ? "رابط مكالمة الفيديو" : "Video Call Link",
        url: videoCallUrl,
      }
    : undefined;

  const footnote = isAr
    ? "هذه رسالة داخلية لفريق إدارة منصة محامون البحرين."
    : "This is an internal notification for the Lawyers.bh admin team.";

  const preheader = `${cleanEmailValue(bookingId)} — ${customerName} — ${displayDate} — ${displayTime}`;

  const { html, text } = renderLayout({
    lang,
    preheader,
    headline,
    intro,
    details,
    cta,
    footnote,
  });

  return { subject, html, text };
}
export function joinCustomerConfirmation(data: {
  lang: EmailLang;
  subscriptionType: string;
  firstName: string;
  lastName: string;
}): RenderedEmail {
  const { lang, subscriptionType, firstName, lastName } = data;
  const isAr = lang === "ar";
  const applicantName = joinName(firstName, lastName, isAr ? "مقدم الطلب" : "Applicant");
  const subscriptionLabel = formatSubscriptionType(subscriptionType, isAr);

  const subject = isAr
    ? "تم استلام طلب الانضمام إلى محامون البحرين"
    : "Your Lawyers.bh application has been received";

  const headline = isAr ? "تم استلام طلب الانضمام" : "Application Received";

  const intro = isAr
    ? `مرحباً ${cleanName(firstName, applicantName)}، شكراً لتقديم طلب الانضمام إلى منصة محامون البحرين. سنقوم بمراجعة البيانات والمستندات، وسيتم التواصل معك عند الحاجة إلى أي معلومات إضافية.`
    : `Hi ${cleanName(firstName, applicantName)}, thank you for applying to join Lawyers.bh. We will review your details and documents, and contact you if any additional information is required.`;

  const details: Array<[string, string]> = [
    [isAr ? "نوع مقدم الخدمة" : "Provider Type", subscriptionLabel],
    [isAr ? "الاسم" : "Name", applicantName],
    [isAr ? "حالة الطلب" : "Application Status", isAr ? "قيد المراجعة" : "Under review"],
  ];

  const footnote = isAr
    ? "لا داعي للرد على هذا البريد. سيتم إشعارك عند تحديث حالة الطلب."
    : "No reply is required. You will be notified when your application status is updated.";

  const preheader = isAr
    ? `${subscriptionLabel} — قيد المراجعة`
    : `${subscriptionLabel} — under review`;

  const { html, text } = renderLayout({
    lang,
    preheader,
    headline,
    intro,
    details,
    footnote,
  });

  return { subject, html, text };
}
export function joinAdminNotification(data: {
  lang: EmailLang;
  subscriptionType: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  language: string;
}): RenderedEmail {
  const { lang, subscriptionType, firstName, lastName, email, phone, language } = data;
  const isAr = lang === "ar";
  const applicantName = joinName(firstName, lastName, isAr ? "مقدم الطلب" : "Applicant");
  const subscriptionLabel = formatSubscriptionType(subscriptionType, isAr);

  const subject = isAr
    ? `طلب انضمام جديد — ${subscriptionLabel}`
    : `New platform application — ${subscriptionLabel}`;

  const headline = isAr ? "طلب انضمام جديد" : "New Platform Application";

  const intro = isAr
    ? `تم استلام طلب انضمام جديد من ${applicantName}. يرجى مراجعة الطلب من لوحة التحكم.`
    : `A new platform application has been received from ${applicantName}. Please review it from the admin dashboard.`;

  const details: Array<[string, string]> = [
    [isAr ? "نوع مقدم الخدمة" : "Provider Type", subscriptionLabel],
    [isAr ? "الاسم" : "Name", applicantName],
    [isAr ? "البريد الإلكتروني" : "Email", email],
    [isAr ? "الهاتف" : "Phone", phone],
    [isAr ? "اللغة" : "Language", language],
  ];

  const footnote = isAr
    ? "هذه رسالة داخلية لفريق إدارة منصة محامون البحرين."
    : "This is an internal notification for the Lawyers.bh admin team.";

  const preheader = `${applicantName} — ${subscriptionLabel}`;

  const { html, text } = renderLayout({
    lang,
    preheader,
    headline,
    intro,
    details,
    footnote,
  });

  return { subject, html, text };
}
export function agreementSignInvite(data: {
  lang: EmailLang;
  reference: string;
  lawyerName: string;
  clientName: string;
  signUrl: string;
}): RenderedEmail {
  const { lang, reference, lawyerName, clientName, signUrl } = data;
  const isAr = lang === "ar";
  const displayReference = cleanEmailValue(reference);
  const displayLawyerName = cleanName(lawyerName, isAr ? "المحامي" : "Lawyer");
  const displayClientName = cleanName(clientName, isAr ? "الموكل" : "Client");
  const subject = isAr
    ? `طلب توقيع اتفاقية أتعاب المحاماة — ${displayReference}`
    : `Signature requested: Legal Fees Agreement — ${displayReference}`;
  const headline = isAr ? "اتفاقية بانتظار توقيعك" : "An agreement is awaiting your signature";
  const intro = isAr
    ? `مرحباً ${displayClientName}، أعدّ المحامي ${displayLawyerName} اتفاقية أتعاب المحاماة والتمثيل القانوني عبر منصة محامون البحرين. يُرجى مراجعتها وتوقيعها إلكترونياً.`
    : `Hi ${displayClientName}, the lawyer ${displayLawyerName} has prepared a Legal Fees & Representation Agreement on the Lawyers.bh platform. Please review and sign it electronically.`;
  const details: Array<[string, string]> = [
    [isAr ? "الرقم المرجعي" : "Reference", displayReference],
    [isAr ? "المحامي" : "Lawyer", displayLawyerName],
  ];
  const cta = { label: isAr ? "مراجعة وتوقيع الاتفاقية" : "Review & Sign the Agreement", url: signUrl };
  const footnote = isAr
    ? "هذا الرابط خاص بك. إن لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها بأمان."
    : "This link is unique to you. If you weren't expecting this, you can safely ignore it.";
  const preheader = isAr
    ? `${displayReference} — اتفاقية بانتظار توقيعك`
    : `${displayReference} — an agreement is awaiting your signature`;
  const { html, text } = renderLayout({ lang, preheader, headline, intro, details, cta, footnote });
  return { subject, html, text };
}

/** Sent to both parties once the client has signed; the signed PDF is
 *  attached by the caller. */
export function agreementSignedCopy(data: {
  lang: EmailLang;
  reference: string;
  recipientName: string;
  lawyerName: string;
  clientName: string;
  feeSummary: string;
  signedAt: string;
}): RenderedEmail {
  const { lang, reference, recipientName, lawyerName, clientName, feeSummary, signedAt } = data;
  const isAr = lang === "ar";
  const displayReference = cleanEmailValue(reference);
  const displayRecipientName = cleanName(recipientName, isAr ? "المستلم" : "Recipient");
  const displayLawyerName = cleanName(lawyerName, isAr ? "المحامي" : "Lawyer");
  const displayClientName = cleanName(clientName, isAr ? "الموكل" : "Client");
  const displayFeeSummary = cleanEmailValue(feeSummary);
  const displaySignedAt = cleanEmailValue(signedAt);
  const subject = isAr
    ? `نسخة موقّعة من اتفاقية أتعاب المحاماة — ${displayReference}`
    : `Signed copy: Legal Fees Agreement — ${displayReference}`;
  const headline = isAr ? "تم توقيع الاتفاقية" : "The agreement has been signed";
  const intro = isAr
    ? `مرحباً ${displayRecipientName}، تم توقيع اتفاقية أتعاب المحاماة إلكترونياً. تجد نسخة PDF موقّعة مرفقة بهذه الرسالة للحفظ في سجلاتك.`
    : `Hi ${displayRecipientName}, the Legal Fees Agreement has been signed electronically. A signed PDF copy is attached to this email for your records.`;
  const details: Array<[string, string]> = [
    [isAr ? "الرقم المرجعي" : "Reference", displayReference],
    [isAr ? "المحامي (الطرف الأول)" : "Lawyer (First Party)", displayLawyerName],
    [isAr ? "الموكل (الطرف الثاني)" : "Client (Second Party)", displayClientName],
    [isAr ? "الأتعاب" : "Fee", displayFeeSummary],
    [isAr ? "تاريخ التوقيع" : "Signed at", displaySignedAt],
  ];
  const footnote = isAr
    ? "هذه نسخة إلكترونية ملزمة وفق قانون المعاملات الإلكترونية في مملكة البحرين. النص العربي هو المعتمد عند الاختلاف."
    : "This is a binding electronic copy under the Bahrain Electronic Transactions Law. The Arabic text prevails in case of any discrepancy.";
  const preheader = isAr
    ? `${displayReference} — نسخة موقّعة مرفقة`
    : `${displayReference} — signed copy attached`;
  const { html, text } = renderLayout({ lang, preheader, headline, intro, details, footnote });
  return { subject, html, text };
}
