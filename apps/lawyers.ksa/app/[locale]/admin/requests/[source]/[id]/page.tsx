import { db, schema, sqlClient } from "@/lib/db/client";
import { buildCountryTableSet, getActiveCountry } from "@/lib/db/country-tables";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { createHash, randomBytes } from "crypto";
import RequestActionModals from "./RequestActionModals";
import { ArrowLeft } from "lucide-react";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";

type Props = {
  params: Promise<{
    locale: string;
    source: "emergency" | "booking";
    id: string;
  }>;
};

type DetailEntry = {
  label: string;
  value?: unknown;
  dir?: "ltr" | "rtl";
};

type JsonEntry = {
  label: string;
  value?: unknown;
};

function toEnglishDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

function formatEnglishNumbers(value: unknown) {
  return toEnglishDigits(String(value));
}

function formatTime12HourValue(time: string, isAr: boolean) {
  const cleanTime = String(time ?? "").trim();
  const [hourPart, minutePart = "00"] = cleanTime.split(":");

  const hour24 = Number(hourPart);
  const minute = Number(minutePart);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
    return formatEnglishNumbers(cleanTime);
  }

  const period = hour24 >= 12 ? (isAr ? "م" : "PM") : isAr ? "ص" : "AM";
  const hour12 = hour24 % 12 || 12;

  return formatEnglishNumbers(
    `${hour12}:${String(minute).padStart(2, "0")} ${period}`,
  );
}

function formatTimeRange12Hour(value: string | null | undefined, isAr: boolean) {
  const cleanValue = String(value ?? "").trim();

  if (!cleanValue) return "";

  const normalized = cleanValue
    .replace("–", "-")
    .replace("—", "-")
    .replace(/\s+/g, "");

  const [start, end] = normalized.split("-");

  if (!start || !end) return formatTime12HourValue(cleanValue, isAr);

  return `${formatTime12HourValue(start, isAr)} - ${formatTime12HourValue(
    end,
    isAr,
  )}`;
}

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

function normalizeTimePeriodValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace("–", "-")
    .replace("—", "-")
    .replace(/\s+/g, "");
}

function formatAppointmentTimePeriod(
  value: string | null | undefined,
  isAr: boolean,
) {
  const normalized = normalizeTimePeriodValue(value);

  if (!normalized) return "";

  const period = timePeriods.find((item) => item.value === normalized);

  if (!period) {
    return formatTimeRange12Hour(value, isAr);
  }

  const label = period.label[isAr ? "ar" : "en"];
  const range = period.range[isAr ? "ar" : "en"];

  return `${label} — ${range}`;
}

function formatReviewStatus(value: string | null | undefined, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    pending: { ar: "بانتظار التقييم", en: "Pending Review" },
    submitted: { ar: "تم التقييم", en: "Submitted" },
    expired: { ar: "انتهت صلاحية رابط التقييم", en: "Review Link Expired" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatReviewEmailStatus(
  value: string | null | undefined,
  isAr: boolean,
) {
  const labels: Record<string, { ar: string; en: string }> = {
    pending: { ar: "بانتظار الإرسال", en: "Pending" },
    sent: { ar: "تم الإرسال", en: "Sent" },
    skipped: { ar: "لم يتم الإرسال", en: "Skipped" },
    failed: { ar: "فشل الإرسال", en: "Failed" },
  };

  return pickTranslatedValue(value, isAr, labels);
}

const emergencyStatusOptions = [
  { value: "pending", ar: "بانتظار", en: "Pending" },
  { value: "mobilizing", ar: "جاري التحرك", en: "Mobilizing" },
  { value: "arrived", ar: "وصل", en: "Arrived" },
  { value: "completed", ar: "مكتمل", en: "Completed" },
  { value: "cancelled", ar: "ملغي", en: "Cancelled" },
  { value: "disputed", ar: "نزاع", en: "Disputed" },
] as const;

const bookingStatusOptions = [
  { value: "pending_review", ar: "بانتظار المراجعة", en: "Pending Review" },
  { value: "approved", ar: "مقبول", en: "Approved" },
  { value: "rejected", ar: "مرفوض", en: "Rejected" },
  { value: "cancelled", ar: "ملغي", en: "Cancelled" },
  { value: "completed", ar: "مكتمل", en: "Completed" },
] as const;

type BookingReviewEmailInput = {
  locale: string;
  requestId: string;
  token: string;
  tokenHash: string;
  customerEmail: string;
  customerName: string;
  service: string;
  consultationType: string;
  appointmentDate: string;
  appointmentTime: string;
  providerName: string;
};

function getSiteOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return (configured || "https://www.lawyers.bh").replace(/\/+$/, "");
}

function buildBookingReviewUrl(locale: string, requestId: string, token: string) {
  return `${getSiteOrigin()}/${locale}/booking-review/${encodeURIComponent(
    requestId,
  )}?token=${encodeURIComponent(token)}`;
}

function createReviewToken() {
  return randomBytes(32).toString("hex");
}

function hashReviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeEmailHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cleanEmailText(value: unknown, fallback = "-") {
  const text = formatEnglishNumbers(String(value ?? "").trim());

  return text || fallback;
}

function buildEmailDetailRows(
  details: Array<[string, string]>,
  isAr: boolean,
) {
  const startAlign = isAr ? "right" : "left";
  const endAlign = isAr ? "left" : "right";
  const labelPadding = isAr ? "14px 0 14px 16px" : "14px 16px 14px 0";
  const valuePadding = isAr ? "14px 16px 14px 0" : "14px 0 14px 16px";

  return details
    .map(([label, value], index) => {
      const borderBottom =
        index === details.length - 1 ? "none" : "1px solid #EAECF0";

      return `
          <tr>
            <td align="${startAlign}" style="padding:${labelPadding};color:#667085;font-size:13px;font-weight:700;font-family:Arial,Tahoma,sans-serif;border-bottom:${borderBottom};vertical-align:top;white-space:nowrap;">${escapeEmailHtml(
        label,
      )}</td>
            <td align="${endAlign}" style="padding:${valuePadding};color:#07111F;font-size:14px;font-weight:800;font-family:Arial,Tahoma,sans-serif;border-bottom:${borderBottom};vertical-align:top;word-break:break-word;">${escapeEmailHtml(
        value,
      )}</td>
          </tr>`;
    })
    .join("");
}

function getExistingReviewToken(payload: unknown) {
  const current = toPayloadRecord(payload);
  const reviewRequest = toPayloadRecord(current.reviewRequest);
  const token = reviewRequest.token;

  return typeof token === "string" && token.trim() ? token.trim() : "";
}

function bookingReviewEmailSubject(isAr: boolean) {
  return isAr
    ? "قيّم تجربتك مع منصة محامون البحرين"
    : "Rate your Lawyers.bh experience";
}

function bookingReviewEmailHtml(input: BookingReviewEmailInput) {
  const isAr = input.locale === "ar";
  const reviewUrl = buildBookingReviewUrl(
    input.locale,
    input.requestId,
    input.token,
  );

  const dir = isAr ? "rtl" : "ltr";
  const startAlign = isAr ? "right" : "left";
  const title = isAr
    ? "قيّم تجربتك مع محامون البحرين"
    : "Rate your Lawyers.bh experience";
  const preheader = isAr
    ? "شاركنا رأيك بعد إكمال الخدمة القانونية."
    : "Share your feedback after your completed legal service.";
  const greeting = isAr
    ? `مرحباً ${cleanEmailText(input.customerName, "العميل")}،`
    : `Hi ${cleanEmailText(input.customerName, "Client")},`;
  const body = isAr
    ? "تم إكمال طلبك عبر منصة محامون البحرين. نرجو منك تقييم المحامي والخدمة، فملاحظاتك تساعدنا على تحسين جودة التجربة ومتابعة مستوى مقدمي الخدمة."
    : "Your request through Lawyers.bh has been completed. Please rate the lawyer and service. Your feedback helps us improve the experience and monitor provider quality.";
  const button = isAr ? "تقييم المحامي والخدمة" : "Rate the lawyer and service";
  const detailsTitle = isAr ? "تفاصيل الطلب" : "Request Details";
  const footer = isAr
    ? "إذا لم يعمل الزر، انسخ الرابط التالي وافتحه في المتصفح."
    : "If the button does not work, copy and open the link below in your browser.";
  const tagline = isAr
    ? "بوابتك الآمنة للاستشارات والخدمات القانونية في المملكة العربية السعودية."
    : "Your secure gateway to legal advice and services in the Kingdom of Bahrain.";
  const year = new Date().getFullYear();

  const details: Array<[string, string]> = [
    [isAr ? "الرقم المرجعي" : "Reference", input.requestId],
    [isAr ? "الخدمة" : "Service", input.service],
    [isAr ? "نوع الاستشارة" : "Consultation Type", input.consultationType],
    [isAr ? "تاريخ الموعد" : "Appointment Date", input.appointmentDate],
    [
      isAr ? "وقت الموعد" : "Appointment Time",
      formatAppointmentTimePeriod(input.appointmentTime, isAr) ||
        input.appointmentTime,
    ],
    [isAr ? "مقدم الخدمة" : "Service Provider", input.providerName],
  ].map(([label, value]) => [label, cleanEmailText(value)]);

  const detailsRows = buildEmailDetailRows(details, isAr);

  return `<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${dir}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeEmailHtml(title)}</title>
</head>
<body dir="${dir}" style="margin:0;padding:0;background:#EEF0F3;font-family:Arial,Tahoma,sans-serif;color:#07111F;-webkit-font-smoothing:antialiased;color-scheme:light only;">
  <div style="display:none;font-size:1px;color:#EEF0F3;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeEmailHtml(
    preheader,
  )}</div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EEF0F3" style="background:#EEF0F3;">
    <tr>
      <td align="center" style="padding:30px 14px;">
        <table role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E5E7EB;box-shadow:0 18px 46px rgba(7,17,31,0.08);">
          <tr>
            <td bgcolor="#ffffff" style="padding:30px 24px 24px 24px;background:#ffffff;" align="center">
              <div style="font-size:28px;line-height:1;font-weight:900;letter-spacing:.02em;color:#082B67;font-family:Arial,Tahoma,sans-serif;">Lawyers.bh</div>
              <div style="margin-top:8px;color:#006C32;font-size:12px;font-weight:800;font-family:Arial,Tahoma,sans-serif;">Legal Services Platform</div>
            </td>
          </tr>

          <tr>
            <td bgcolor="#006C32" height="4" style="height:4px;font-size:0;line-height:0;background:#006C32;">&nbsp;</td>
          </tr>

          <tr>
            <td bgcolor="#ffffff" style="padding:34px 32px 30px 32px;background:#ffffff;" align="${startAlign}">
              <h1 style="margin:0 0 12px 0;color:#07111F;font-size:24px;line-height:1.45;font-weight:900;font-family:Arial,Tahoma,sans-serif;">${escapeEmailHtml(
    title,
  )}</h1>

              <p style="margin:0 0 10px 0;color:#07111F;font-size:15px;line-height:1.85;font-weight:800;font-family:Arial,Tahoma,sans-serif;">${escapeEmailHtml(
                greeting,
              )}</p>

              <p style="margin:0 0 24px 0;color:#667085;font-size:15px;line-height:1.85;font-family:Arial,Tahoma,sans-serif;">${escapeEmailHtml(
                body,
              )}</p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F7F8FA;border:1px solid #EAECF0;border-radius:14px;">
                <tr>
                  <td style="padding:18px 22px 6px 22px;">
                    <p style="margin:0;color:#082B67;font-size:13px;font-weight:900;font-family:Arial,Tahoma,sans-serif;">${escapeEmailHtml(
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

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 0;">
                <tr>
                  <td bgcolor="#006C32" style="border-radius:12px;background:#006C32;">
                    <a href="${escapeEmailHtml(
                      reviewUrl,
                    )}" target="_blank" style="display:inline-block;padding:14px 34px;font-family:Arial,Tahoma,sans-serif;font-size:14px;font-weight:900;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeEmailHtml(
                      button,
                    )}</a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0 0;color:#667085;font-size:13px;line-height:1.85;font-family:Arial,Tahoma,sans-serif;">${escapeEmailHtml(
                footer,
              )}</p>

              <p style="margin:8px 0 0 0;word-break:break-all;color:#006C32;font-size:12px;line-height:1.8;font-family:Arial,Tahoma,sans-serif;" dir="ltr">${escapeEmailHtml(
                reviewUrl,
              )}</p>
            </td>
          </tr>

          <tr>
            <td bgcolor="#006C32" style="padding:18px 24px;background:#006C32;" align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 10px;font-size:13px;font-family:Arial,Tahoma,sans-serif;color:#ffffff;">
                    <a href="tel:+97317537070" style="color:#ffffff;text-decoration:none;">+973 1753 7070</a>
                  </td>
                  <td style="padding:0 6px;color:rgba(255,255,255,0.55);font-size:13px;">&middot;</td>
                  <td style="padding:0 10px;font-size:13px;font-family:Arial,Tahoma,sans-serif;color:#ffffff;">
                    <a href="mailto:info@lawyers.bh" style="color:#ffffff;text-decoration:none;">info@lawyers.bh</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td bgcolor="#07111F" style="padding:24px 30px;background:#07111F;" align="center">
              <p style="margin:0;color:#A7AFBB;font-size:12px;line-height:1.7;font-family:Arial,Tahoma,sans-serif;">${escapeEmailHtml(
                tagline,
              )}</p>
              <p style="margin:12px 0 0 0;color:#7B8492;font-size:11px;font-family:Arial,Tahoma,sans-serif;">
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
}

function bookingReviewEmailText(input: BookingReviewEmailInput) {
  const isAr = input.locale === "ar";
  const reviewUrl = buildBookingReviewUrl(
    input.locale,
    input.requestId,
    input.token,
  );

  const lines = isAr
    ? [
        `مرحباً ${cleanEmailText(input.customerName, "العميل")}،`,
        "",
        "تم إكمال طلبك عبر منصة محامون البحرين. نرجو منك تقييم المحامي والخدمة.",
        "",
        `الرقم المرجعي: ${cleanEmailText(input.requestId)}`,
        `الخدمة: ${cleanEmailText(input.service)}`,
        `نوع الاستشارة: ${cleanEmailText(input.consultationType)}`,
        `تاريخ الموعد: ${cleanEmailText(input.appointmentDate)}`,
        `وقت الموعد: ${cleanEmailText(
          formatAppointmentTimePeriod(input.appointmentTime, isAr) ||
            input.appointmentTime,
        )}`,
        `مقدم الخدمة: ${cleanEmailText(input.providerName)}`,
        "",
        `رابط التقييم: ${reviewUrl}`,
      ]
    : [
        `Hi ${cleanEmailText(input.customerName, "Client")},`,
        "",
        "Your request through Lawyers.bh has been completed. Please rate the lawyer and service.",
        "",
        `Reference: ${cleanEmailText(input.requestId)}`,
        `Service: ${cleanEmailText(input.service)}`,
        `Consultation Type: ${cleanEmailText(input.consultationType)}`,
        `Appointment Date: ${cleanEmailText(input.appointmentDate)}`,
        `Appointment Time: ${cleanEmailText(
          formatAppointmentTimePeriod(input.appointmentTime, isAr) ||
            input.appointmentTime,
        )}`,
        `Service Provider: ${cleanEmailText(input.providerName)}`,
        "",
        `Review link: ${reviewUrl}`,
      ];

  return lines.join("\n");
}

async function sendBookingReviewEmail(input: BookingReviewEmailInput) {
  const token = process.env.POSTMARK_SERVER_TOKEN || process.env.POSTMARK_API_TOKEN;
  const from =
    process.env.POSTMARK_FROM_EMAIL ||
    process.env.POSTMARK_FROM ||
    "info@lawyers.bh";

  if (!token) {
    console.warn("[booking-review] POSTMARK_SERVER_TOKEN is missing; review email skipped");
    return false;
  }

  if (!isValidEmailAddress(input.customerEmail)) {
    console.warn("[booking-review] invalid customer email; review email skipped", {
      requestId: input.requestId,
      customerEmail: input.customerEmail,
    });
    return false;
  }

  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": token,
    },
    body: JSON.stringify({
      From: from,
      To: input.customerEmail,
      Subject: bookingReviewEmailSubject(input.locale === "ar"),
      HtmlBody: bookingReviewEmailHtml(input),
      TextBody: bookingReviewEmailText(input),
      MessageStream: process.env.POSTMARK_MESSAGE_STREAM || "outbound",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Postmark review email failed: ${response.status} ${body}`);
  }

  return true;
}


async function updateRequestStatus(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const source = String(formData.get("source") ?? "");
  const status = String(formData.get("status") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  const reason = String(formData.get("reason") ?? "").trim();
  const confirmedStatus = formData.get("confirmStatus") === "yes";

  if (!id || !status) return;

  if (source === "emergency") {
    const allowed = emergencyStatusOptions.map((item) => item.value);

    if (!allowed.includes(status as (typeof allowed)[number])) return;

    await db
      .update(schema.emergencyRequests)
      .set({
        serviceStatus: status as (typeof emergencyStatusOptions)[number]["value"],
        updatedAt: new Date(),
      })
      .where(eq(schema.emergencyRequests.id, id));
  }

  if (source === "booking") {
    const [currentRequest] = await db
      .select({
        countryCode: schema.bookingRequests.countryCode,
        adminStatus: schema.bookingRequests.adminStatus,
        requestPayload: schema.bookingRequests.requestPayload,
        selectedLawyerId: schema.bookingRequests.selectedLawyerId,
        lang: schema.bookingRequests.lang,
        service: schema.bookingRequests.service,
        consultationType: schema.bookingRequests.consultationType,
        appointmentDate: schema.bookingRequests.appointmentDate,
        appointmentTime: schema.bookingRequests.appointmentTime,
        selectedOfficeName: schema.bookingRequests.selectedOfficeName,
        selectedLawyerName: schema.bookingRequests.selectedLawyerName,
        assignedToEmail: schema.bookingRequests.assignedToEmail,
        customerName: schema.bookingRequests.customerName,
        customerEmail: schema.bookingRequests.customerEmail,
        customerPhone: schema.bookingRequests.customerPhone,
      })
      .from(schema.bookingRequests)
      .where(eq(schema.bookingRequests.id, id))
      .limit(1);

    if (!currentRequest) return;

    const nextStatus = status as (typeof bookingStatusOptions)[number]["value"];

    const allowed =
      currentRequest.adminStatus === "pending_review"
        ? ["approved", "rejected"]
        : currentRequest.adminStatus === "approved"
          ? ["completed", "cancelled"]
          : [];

    if (!allowed.includes(nextStatus)) return;

    if (!confirmedStatus) return;

    if ((nextStatus === "rejected" || nextStatus === "cancelled") && !reason) {
      return;
    }

    const statusChangedAt = new Date().toISOString();

    let nextPayload: Record<string, unknown> = {
      ...appendAdminActionToPayload(currentRequest.requestPayload, {
        action: "status_change",
        status: nextStatus,
        reason: reason || undefined,
        createdAt: statusChangedAt,
      }),
      ...(reason ? { adminStatusReason: reason } : {}),
      ...(nextStatus === "rejected" ? { adminRejectionReason: reason } : {}),
      ...(nextStatus === "cancelled" ? { adminCancellationReason: reason } : {}),
    };

    let reviewEmailInput: BookingReviewEmailInput | null = null;

    if (nextStatus === "completed") {
      const reviewToken = createReviewToken();
      const reviewTokenHash = hashReviewToken(reviewToken);

      const emailLocale =
        currentRequest.lang === "ar" || currentRequest.lang === "en"
          ? currentRequest.lang
          : locale === "ar"
            ? "ar"
            : "en";

      const providerName =
        currentRequest.selectedLawyerName ||
        currentRequest.selectedOfficeName ||
        currentRequest.assignedToEmail ||
        "";

      const reviewUrl = buildBookingReviewUrl(emailLocale, id, reviewToken);
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const country = await getActiveCountry(currentRequest.countryCode);
      if (!country) return;
      const countryTables = buildCountryTableSet(country);

      await sqlClient`
        INSERT INTO ${sqlClient(countryTables.booking_reviews)} (
          country_code, booking_request_id, lawyer_id, customer_name,
          customer_email, customer_phone, service, consultation_type,
          appointment_date, appointment_time, provider_name, review_token_hash,
          review_url, review_email_status, token_expires_at, status, updated_at
        ) VALUES (
          ${country.code}, ${id}, ${currentRequest.selectedLawyerId || null},
          ${currentRequest.customerName}, ${currentRequest.customerEmail},
          ${currentRequest.customerPhone}, ${currentRequest.service},
          ${currentRequest.consultationType}, ${currentRequest.appointmentDate},
          ${currentRequest.appointmentTime}, ${providerName}, ${reviewTokenHash},
          ${reviewUrl}, ${"pending"}, ${tokenExpiresAt}, ${"pending"}, ${new Date()}
        )
        ON CONFLICT (booking_request_id) DO UPDATE SET
          lawyer_id = EXCLUDED.lawyer_id,
          customer_name = EXCLUDED.customer_name,
          customer_email = EXCLUDED.customer_email,
          customer_phone = EXCLUDED.customer_phone,
          service = EXCLUDED.service,
          consultation_type = EXCLUDED.consultation_type,
          appointment_date = EXCLUDED.appointment_date,
          appointment_time = EXCLUDED.appointment_time,
          provider_name = EXCLUDED.provider_name,
          review_token_hash = EXCLUDED.review_token_hash,
          review_url = EXCLUDED.review_url,
          review_email_status = 'pending',
          review_email_error = NULL,
          token_expires_at = EXCLUDED.token_expires_at,
          status = 'pending',
          updated_at = EXCLUDED.updated_at
      `;

      nextPayload = {
        ...nextPayload,
        reviewRequest: {
          ...toPayloadRecord(nextPayload.reviewRequest),
          storage: "booking_reviews",
          url: reviewUrl,
          emailStatus: "pending",
          requestedAt: statusChangedAt,
          customerEmail: currentRequest.customerEmail,
        },
      };

      reviewEmailInput = {
        locale: emailLocale,
        requestId: id,
        token: reviewToken,
        tokenHash: reviewTokenHash,
        customerEmail: currentRequest.customerEmail,
        customerName: currentRequest.customerName,
        service: currentRequest.service,
        consultationType: currentRequest.consultationType,
        appointmentDate: currentRequest.appointmentDate,
        appointmentTime: currentRequest.appointmentTime,
        providerName,
      };
    }

    await db
      .update(schema.bookingRequests)
      .set({
        adminStatus: nextStatus,
        requestPayload: nextPayload,
        updatedAt: new Date(),
      })
      .where(eq(schema.bookingRequests.id, id));

    if (reviewEmailInput) {
      try {
        const emailWasSent = await sendBookingReviewEmail(reviewEmailInput);
        const now = new Date();

        const sentReviewRequest = {
          ...toPayloadRecord(nextPayload.reviewRequest),
          emailStatus: emailWasSent ? "sent" : "skipped",
          ...(emailWasSent
            ? { emailSentAt: now.toISOString() }
            : { emailSkippedAt: now.toISOString() }),
        };

        delete (sentReviewRequest as Record<string, unknown>).emailError;

        await db
          .update(schema.bookingReviews)
          .set({
            reviewEmailStatus: emailWasSent ? "sent" : "skipped",
            reviewEmailSentAt: emailWasSent ? now : null,
            reviewEmailSkippedAt: emailWasSent ? null : now,
            reviewEmailError: null,
            updatedAt: now,
          })
          .where(eq(schema.bookingReviews.reviewTokenHash, reviewEmailInput.tokenHash));

        await db
          .update(schema.bookingRequests)
          .set({
            requestPayload: {
              ...nextPayload,
              reviewRequest: sentReviewRequest,
            },
            updatedAt: now,
          })
          .where(eq(schema.bookingRequests.id, id));
      } catch (err) {
        console.error("[booking-review] failed to send review email", err);

        const message =
          err instanceof Error ? err.message : "Unknown email error";

        await db
          .update(schema.bookingReviews)
          .set({
            reviewEmailStatus: "failed",
            reviewEmailError: message,
            updatedAt: new Date(),
          })
          .where(eq(schema.bookingReviews.reviewTokenHash, reviewEmailInput.tokenHash));

        await db
          .update(schema.bookingRequests)
          .set({
            requestPayload: {
              ...nextPayload,
              reviewRequest: {
                ...toPayloadRecord(nextPayload.reviewRequest),
                emailStatus: "failed",
                emailError: message,
              },
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.bookingRequests.id, id));
      }
    }
  }

  revalidatePath(`/${locale}/admin/requests`);
  revalidatePath(`/${locale}/admin/requests/${source}/${id}`);
}

async function updateBookingAppointment(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  const appointmentDate = String(formData.get("appointmentDate") ?? "").trim();
  const appointmentTime = String(formData.get("appointmentTime") ?? "").trim();
  const confirmed = formData.get("confirmAppointment") === "yes";

  if (!id || !confirmed || (!appointmentDate && !appointmentTime)) return;

  const [currentRequest] = await db
    .select({
      adminStatus: schema.bookingRequests.adminStatus,
      requestPayload: schema.bookingRequests.requestPayload,
    })
    .from(schema.bookingRequests)
    .where(eq(schema.bookingRequests.id, id))
    .limit(1);

  if (!currentRequest || currentRequest.adminStatus !== "approved") return;

  const updates: {
    appointmentDate?: string;
    appointmentTime?: string;
    requestPayload: Record<string, unknown>;
    updatedAt: Date;
  } = {
    requestPayload: appendAdminActionToPayload(currentRequest.requestPayload, {
      action: "appointment_change",
      appointmentDate: appointmentDate || undefined,
      appointmentTime: appointmentTime || undefined,
      createdAt: new Date().toISOString(),
    }),
    updatedAt: new Date(),
  };

  if (appointmentDate) {
    updates.appointmentDate = appointmentDate;
  }

  if (appointmentTime) {
    updates.appointmentTime = appointmentTime;
  }

  await db
    .update(schema.bookingRequests)
    .set(updates)
    .where(eq(schema.bookingRequests.id, id));

  revalidatePath(`/${locale}/admin/requests`);
  revalidatePath(`/${locale}/admin/requests/booking/${id}`);
}

async function updateBookingProvider(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const locale = String(formData.get("locale") ?? "ar");
  const lawyerId = String(formData.get("lawyerId") ?? "").trim();
  const confirmed = formData.get("confirmProvider") === "yes";

  if (!id || !lawyerId || !confirmed) return;

  const [currentRequest] = await db
    .select({
      adminStatus: schema.bookingRequests.adminStatus,
      assignedToEmail: schema.bookingRequests.assignedToEmail,
      requestPayload: schema.bookingRequests.requestPayload,
    })
    .from(schema.bookingRequests)
    .where(eq(schema.bookingRequests.id, id))
    .limit(1);

  if (
    !currentRequest ||
    ["rejected", "cancelled", "completed"].includes(currentRequest.adminStatus)
  ) {
    return;
  }

  const [lawyer] = await db
    .select({
      id: schema.saudiLawyers.id,
      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,
      email: schema.saudiLawyers.email,
    })
    .from(schema.saudiLawyers)
    .where(eq(schema.saudiLawyers.id, lawyerId))
    .limit(1);

  if (!lawyer) return;

  const selectedLawyerName =
    lawyer.fullNameAr || lawyer.fullNameEn || lawyer.email || lawyer.id;

  const assignedToEmail = lawyer.email || currentRequest.assignedToEmail;

  await db
    .update(schema.bookingRequests)
    .set({
      assignmentMode: "lawyer",
      selectedLawyerId: lawyer.id,
      selectedLawyerName,
      assignedToEmail,
      requestPayload: appendAdminActionToPayload(currentRequest.requestPayload, {
        action: "provider_change",
        lawyerId: lawyer.id,
        selectedLawyerName,
        assignedToEmail,
        createdAt: new Date().toISOString(),
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.bookingRequests.id, id));

  revalidatePath(`/${locale}/admin/requests`);
  revalidatePath(`/${locale}/admin/requests/booking/${id}`);
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) return false;

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return (
      normalized !== "" &&
      normalized !== "—" &&
      normalized !== "null" &&
      normalized !== "undefined" &&
      normalized !== "none" &&
      normalized !== "{}" &&
      normalized !== "[]"
    );
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

function toPayloadRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function appendAdminActionToPayload(
  payload: unknown,
  action: Record<string, unknown>,
): Record<string, unknown> {
  const current = toPayloadRecord(payload);
  const history = Array.isArray(current.adminActionHistory)
    ? current.adminActionHistory
    : [];

  return {
    ...current,
    lastAdminAction: action,
    adminActionHistory: [...history, action].slice(-50),
  };
}

function getPayloadString(payload: unknown, key: string) {
  const current = toPayloadRecord(payload);
  const value = current[key];

  return typeof value === "string" ? value : "";
}

function getPayloadRecord(payload: unknown, key: string) {
  const current = toPayloadRecord(payload);

  return toPayloadRecord(current[key]);
}

function getRecordString(record: Record<string, unknown>, key: string) {
  const value = record[key];

  return typeof value === "string" ? value : "";
}

function getRecordNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatRatingScore(value: unknown, isAr: boolean) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) return "";

  return isAr ? `${formatEnglishNumbers(number)} من 5` : `${formatEnglishNumbers(number)}/5`;
}

function normalizeValue(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function pickTranslatedValue(
  value: string | null | undefined,
  isAr: boolean,
  labels: Record<string, { ar: string; en: string }>,
) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) return "";

  const normalized = normalizeValue(rawValue);
  const item = labels[normalized] || labels[rawValue] || labels[rawValue.toLowerCase()];

  return item?.[isAr ? "ar" : "en"] ?? rawValue;
}

function formatDate(value?: Date | string | null, isAr = true) {
  if (!hasValue(value)) return "";

  return formatEnglishNumbers(
    new Intl.DateTimeFormat(isAr ? "ar-SA-u-nu-latn" : "en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(String(value))),
  );
}

function formatCurrency(value?: string | number | null, isAr = true) {
  if (!hasValue(value)) return "";

  const amount = Number(value);

  if (Number.isNaN(amount)) return "";

  const formattedAmount = new Intl.NumberFormat(isAr ? "ar-SA-u-nu-latn" : "en-GB", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);

  return formatEnglishNumbers(`${formattedAmount} ${isAr ? "ر.س" : "SAR"}`);
}

function formatBookingAmount(
  amountBd: string | number | null | undefined,
  consultationPrice: string | null | undefined,
  isAr: boolean,
) {
  const formattedAmount = formatCurrency(amountBd, isAr);

  if (formattedAmount) return formattedAmount;

  if (!hasValue(consultationPrice)) return "";

  return formatEnglishNumbers(
    String(consultationPrice)
      .replace(/\bSAR\b/gi, isAr ? "ر.س" : "SAR")
      .replace(/د\.?ب/g, isAr ? "ر.س" : "SAR"),
  );
}

function formatJson(value: unknown) {
  if (!hasValue(value)) return "";

  try {
    return formatEnglishNumbers(JSON.stringify(value, null, 2));
  } catch {
    return formatEnglishNumbers(value);
  }
}

function formatCoordinates(location?: {
  lat?: number;
  lng?: number;
} | null) {
  if (!location || location.lat === undefined || location.lng === undefined) {
    return "";
  }

  return formatEnglishNumbers(`${location.lat}, ${location.lng}`);
}

function formatCaseType(value: string, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    "emergency arrest": {
      ar: "توقيف / قبض طارئ",
      en: "Emergency Arrest",
    },
    "emergency search": {
      ar: "تفتيش طارئ",
      en: "Emergency Search",
    },
    "emergency travel ban": {
      ar: "منع سفر طارئ",
      en: "Emergency Travel Ban",
    },
    "emergency evidence": {
      ar: "إثبات حالة / دليل",
      en: "Emergency Evidence",
    },
    "emergency report": {
      ar: "بلاغ طارئ",
      en: "Emergency Report",
    },
    "emergency consultation": {
      ar: "استشارة طارئة",
      en: "Emergency Consultation",
    },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatService(value: string, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    consultation: { ar: "استشارة قانونية", en: "Legal Consultation" },
    "legal consultation": { ar: "استشارة قانونية", en: "Legal Consultation" },
    "legal consultations": { ar: "استشارات قانونية", en: "Legal Consultations" },
    "virtual legal advice & guidance": {
      ar: "التوجيه والإرشاد القانوني الافتراضي",
      en: "Virtual Legal Advice & Guidance",
    },
    "فسخ الزواج": { ar: "فسخ الزواج", en: "Marriage Dissolution" },
    "marriage dissolution": { ar: "فسخ الزواج", en: "Marriage Dissolution" },
    divorce: { ar: "الطلاق", en: "Divorce" },
    family: { ar: "قضايا الأسرة", en: "Family Cases" },
    "family cases": { ar: "قضايا الأسرة", en: "Family Cases" },
    sharia: { ar: "القضايا الشرعية", en: "Sharia Cases" },
    "sharia cases": { ar: "القضايا الشرعية", en: "Sharia Cases" },
    civil: { ar: "القضايا المدنية", en: "Civil Cases" },
    "civil cases": { ar: "القضايا المدنية", en: "Civil Cases" },
    commercial: { ar: "القضايا التجارية", en: "Commercial Cases" },
    "commercial cases": { ar: "القضايا التجارية", en: "Commercial Cases" },
    criminal: { ar: "القضايا الجنائية", en: "Criminal Cases" },
    "criminal cases": { ar: "القضايا الجنائية", en: "Criminal Cases" },
    labor: { ar: "القضايا العمالية", en: "Labor Cases" },
    "labor cases": { ar: "القضايا العمالية", en: "Labor Cases" },
    administrative: { ar: "القضايا الإدارية", en: "Administrative Cases" },
    "administrative cases": { ar: "القضايا الإدارية", en: "Administrative Cases" },
    notary: { ar: "خدمات التوثيق", en: "Notary Services" },
    "notary services": { ar: "خدمات التوثيق", en: "Notary Services" },
    execution: { ar: "خدمات التنفيذ", en: "Execution Services" },
    "execution services": { ar: "خدمات التنفيذ", en: "Execution Services" },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatConsultationType(value: string, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    "virtual legal advice & guidance": {
      ar: "التوجيه والإرشاد القانوني الافتراضي",
      en: "Virtual Legal Advice & Guidance",
    },
    "legal advice": { ar: "استشارة قانونية", en: "Legal Advice" },
    "legal guidance": { ar: "إرشاد قانوني", en: "Legal Guidance" },
    "voice call": { ar: "مكالمة صوتية", en: "Voice Call" },
    "whatsapp consultation": {
      ar: "استشارة عبر واتساب",
      en: "WhatsApp Consultation",
    },
    "video call": { ar: "مكالمة فيديو", en: "Video Call" },
    "office visit": { ar: "زيارة المكتب", en: "Office Visit" },
    "legal service request": {
      ar: "طلب خدمة قانونية",
      en: "Legal Service Request",
    },
    online: { ar: "استشارة عن بُعد", en: "Online Consultation" },
    phone: { ar: "مكالمة صوتية", en: "Voice Call" },
    whatsapp: { ar: "استشارة عبر واتساب", en: "WhatsApp Consultation" },
    voice: { ar: "مكالمة صوتية", en: "Voice Call" },
    video: { ar: "مكالمة فيديو", en: "Video Call" },
    office: { ar: "زيارة المكتب", en: "Office Visit" },
    service_request: {
      ar: "طلب خدمة قانونية",
      en: "Legal Service Request",
    },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatConsultationMethod(value: string | null | undefined, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    phone: { ar: "مكالمة صوتية", en: "Voice Call" },
    voice: { ar: "مكالمة صوتية", en: "Voice Call" },
    "voice call": { ar: "مكالمة صوتية", en: "Voice Call" },
    whatsapp: { ar: "استشارة عبر واتساب", en: "WhatsApp Consultation" },
    "whatsapp consultation": {
      ar: "استشارة عبر واتساب",
      en: "WhatsApp Consultation",
    },
    video: { ar: "مكالمة فيديو", en: "Video Call" },
    "video call": { ar: "مكالمة فيديو", en: "Video Call" },
    office: { ar: "زيارة المكتب", en: "Office Visit" },
    "office visit": { ar: "زيارة المكتب", en: "Office Visit" },
    online: { ar: "استشارة عن بُعد", en: "Online Consultation" },
    service_request: {
      ar: "طلب خدمة قانونية",
      en: "Legal Service Request",
    },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatAssignmentMode(value: string | null | undefined, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    office: { ar: "مكتب", en: "Office" },
    lawyer: { ar: "محامي", en: "Lawyer" },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatPaymentStatus(value: string, isAr: boolean) {
  const normalized = normalizeValue(value);

  const labels: Record<string, { ar: string; en: string; className: string }> = {
    pending: {
      ar: "بانتظار الدفع",
      en: "Pending",
      className: "bg-amber-50 text-amber-700",
    },
    "pending payment": {
      ar: "بانتظار الدفع",
      en: "Pending Payment",
      className: "bg-amber-50 text-amber-700",
    },
    success: {
      ar: "مدفوع",
      en: "Paid",
      className: "bg-emerald-50 text-emerald-700",
    },
    paid: {
      ar: "مدفوع",
      en: "Paid",
      className: "bg-emerald-50 text-emerald-700",
    },
    captured: {
      ar: "مدفوع",
      en: "Paid",
      className: "bg-emerald-50 text-emerald-700",
    },
    failed: {
      ar: "فشل الدفع",
      en: "Failed",
      className: "bg-red-50 text-red-700",
    },
    refunded: {
      ar: "مسترجع",
      en: "Refunded",
      className: "bg-slate-100 text-slate-700",
    },
  };

  const item = labels[normalized];

  return {
    label: item?.[isAr ? "ar" : "en"] ?? value,
    className: item?.className ?? "bg-gray-100 text-text-muted",
  };
}

function formatRequestStatus(value: string, isAr: boolean) {
  const normalized = normalizeValue(value);

  const labels: Record<string, { ar: string; en: string; className: string }> = {
    pending: {
      ar: "بانتظار المعالجة",
      en: "Pending",
      className: "bg-amber-50 text-amber-700",
    },
    mobilizing: {
      ar: "جاري التحرك",
      en: "Mobilizing",
      className: "bg-blue-50 text-blue-700",
    },
    arrived: {
      ar: "تم الوصول",
      en: "Arrived",
      className: "bg-blue-50 text-blue-700",
    },
    completed: {
      ar: "مكتمل",
      en: "Completed",
      className: "bg-emerald-50 text-emerald-700",
    },
    cancelled: {
      ar: "ملغي",
      en: "Cancelled",
      className: "bg-red-50 text-red-700",
    },
    disputed: {
      ar: "متنازع عليه",
      en: "Disputed",
      className: "bg-red-50 text-red-700",
    },
    "pending review": {
      ar: "بانتظار المراجعة",
      en: "Pending Review",
      className: "bg-amber-50 text-amber-700",
    },
    approved: {
      ar: "مقبول",
      en: "Approved",
      className: "bg-emerald-50 text-emerald-700",
    },
    rejected: {
      ar: "مرفوض",
      en: "Rejected",
      className: "bg-red-50 text-red-700",
    },
  };

  const item = labels[normalized];

  return {
    label: item?.[isAr ? "ar" : "en"] ?? value,
    className: item?.className ?? "bg-primary/10 text-primary",
  };
}

function formatVideoProvider(value: string | null | undefined, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    zoom: { ar: "Zoom", en: "Zoom" },
    "google meet": { ar: "Google Meet", en: "Google Meet" },
    googlemeet: { ar: "Google Meet", en: "Google Meet" },
    teams: { ar: "Microsoft Teams", en: "Microsoft Teams" },
    "microsoft teams": { ar: "Microsoft Teams", en: "Microsoft Teams" },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatTapStatus(value: string | null | undefined, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    initiated: { ar: "تم الإنشاء", en: "Initiated" },
    authorized: { ar: "مصرح", en: "Authorized" },
    captured: { ar: "مدفوع", en: "Captured" },
    paid: { ar: "مدفوع", en: "Paid" },
    failed: { ar: "فشل", en: "Failed" },
    declined: { ar: "مرفوض", en: "Declined" },
    cancelled: { ar: "ملغي", en: "Cancelled" },
    abandoned: { ar: "متروك", en: "Abandoned" },
    pending: { ar: "قيد الانتظار", en: "Pending" },
    refunded: { ar: "مسترجع", en: "Refunded" },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatRefundStatus(value: string | null | undefined, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    none: { ar: "", en: "" },
    pending: { ar: "قيد الاسترجاع", en: "Pending" },
    completed: { ar: "مكتمل", en: "Completed" },
    failed: { ar: "فشل", en: "Failed" },
  };

  return pickTranslatedValue(value, isAr, labels);
}

function formatBookingType(service: string, consultationType: string, isAr: boolean) {
  const formattedService = formatService(service, isAr);
  const formattedConsultationType = formatConsultationType(consultationType, isAr);

  return service ? `${formattedService} - ${formattedConsultationType}` : formattedConsultationType;
}

function getBookingStatusActions(currentStatus: string) {
  if (currentStatus === "pending_review") {
    return bookingStatusOptions.filter((option) =>
      ["approved", "rejected"].includes(option.value),
    );
  }

  if (currentStatus === "approved") {
    return bookingStatusOptions.filter((option) =>
      ["completed", "cancelled"].includes(option.value),
    );
  }

  return [];
}

function makeBookingReference(id: string) {
  return formatEnglishNumbers(`BK-${id.slice(0, 8).toUpperCase()}`);
}

function DetailItem({ label, value, dir }: DetailEntry) {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="mb-1 text-xs font-extrabold text-text-muted">{label}</p>
      <p className="break-words text-sm font-bold text-text-primary" dir={dir}>
        {formatEnglishNumbers(value)}
      </p>
    </div>
  );
}

function JsonBlock({ label, value }: JsonEntry) {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <p className="mb-2 text-xs font-extrabold text-text-muted">{label}</p>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs leading-6 text-text-primary">
        {formatJson(value)}
      </pre>
    </div>
  );
}

function InfoSection({
  title,
  items,
  jsonItems = [],
}: {
  title: string;
  items: DetailEntry[];
  jsonItems?: JsonEntry[];
}) {
  const visibleItems = items.filter((item) => hasValue(item.value));
  const visibleJsonItems = jsonItems.filter((item) => hasValue(item.value));

  if (visibleItems.length === 0 && visibleJsonItems.length === 0) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
      <h2 className="mb-4 text-lg font-extrabold text-text-primary">{title}</h2>

      {visibleItems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleItems.map((item) => (
            <DetailItem
              key={`${item.label}-${String(item.value)}`}
              label={item.label}
              value={item.value}
              dir={item.dir}
            />
          ))}
        </div>
      )}

      {visibleJsonItems.length > 0 && (
        <div className={visibleItems.length > 0 ? "mt-4 grid gap-4" : "grid gap-4"}>
          {visibleJsonItems.map((item) => (
            <JsonBlock key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AdminRequestDetailsPage({ params }: Props) {
  const { locale, source, id } = await params;
  setRequestLocale(locale);

  const isAr = locale === "ar";

  if (source !== "emergency" && source !== "booking") {
    notFound();
  }

  if (source === "emergency") {
    const [request] = await db
      .select({
        id: schema.emergencyRequests.id,
        caseRef: schema.emergencyRequests.caseRef,
        consentId: schema.emergencyRequests.consentId,
        caseType: schema.emergencyRequests.caseType,
        description: schema.emergencyRequests.description,
        location: schema.emergencyRequests.location,
        contactName: schema.emergencyRequests.contactName,
        contactPhone: schema.emergencyRequests.contactPhone,
        contactIdNumber: schema.emergencyRequests.contactIdNumber,
        baseFee: schema.emergencyRequests.baseFee,
        paymentStatus: schema.emergencyRequests.paymentStatus,
        paymentRef: schema.emergencyRequests.paymentRef,
        serviceStatus: schema.emergencyRequests.serviceStatus,
        assignedLawyerId: schema.emergencyRequests.assignedLawyerId,
        responseTimestamp: schema.emergencyRequests.responseTimestamp,
        arrivalTimestamp: schema.emergencyRequests.arrivalTimestamp,
        completedTimestamp: schema.emergencyRequests.completedTimestamp,
        ratingStars: schema.emergencyRequests.ratingStars,
        ratingComment: schema.emergencyRequests.ratingComment,
        settledAt: schema.emergencyRequests.settledAt,
        settledBy: schema.emergencyRequests.settledBy,
        internalNotes: schema.emergencyRequests.internalNotes,
        cancellationReason: schema.emergencyRequests.cancellationReason,
        refundStatus: schema.emergencyRequests.refundStatus,
        refundAmountBhd: schema.emergencyRequests.refundAmountBhd,
        refundRef: schema.emergencyRequests.refundRef,
        refundMarkedAt: schema.emergencyRequests.refundMarkedAt,
        refundMarkedBy: schema.emergencyRequests.refundMarkedBy,
        lastAdvocateLocation: schema.emergencyRequests.lastAdvocateLocation,
        dispatchActorLog: schema.emergencyRequests.dispatchActorLog,
        requestLocale: schema.emergencyRequests.locale,
        providerNameAr: schema.saudiLawyers.fullNameAr,
        providerNameEn: schema.saudiLawyers.fullNameEn,
        providerEmail: schema.saudiLawyers.email,
        providerPhone: schema.saudiLawyers.phone,
        providerRegistrationNo: schema.saudiLawyers.registrationNo,
        providerMembershipNo: schema.saudiLawyers.membershipNo,
        createdAt: schema.emergencyRequests.createdAt,
        updatedAt: schema.emergencyRequests.updatedAt,
      })
      .from(schema.emergencyRequests)
      .leftJoin(
        schema.saudiLawyers,
        eq(schema.emergencyRequests.assignedLawyerId, schema.saudiLawyers.id),
      )
      .where(eq(schema.emergencyRequests.id, id))
      .limit(1);

    if (!request) notFound();

    const providerName =
      (isAr ? request.providerNameAr : request.providerNameEn) ||
      request.providerNameAr ||
      request.providerNameEn ||
      "";

    const paymentStatus = formatPaymentStatus(request.paymentStatus, isAr);
    const requestStatus = formatRequestStatus(request.serviceStatus, isAr);

    return (
      <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <a
              href={`/${locale}/admin/requests`}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
              {isAr ? "العودة للطلبات" : "Back to requests"}
            </a>

            <AdminLogoutButton />
          </div>

          <div className="mb-6 rounded-3xl bg-[#006C32] p-7 text-white shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-extrabold sm:text-3xl">
                  {isAr ? "تفاصيل الطلب الطارئ" : "Emergency Request Details"}
                </h1>

                <p className="mt-2 text-sm text-white/65">{request.caseRef}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${paymentStatus.className}`}>
                  {paymentStatus.label}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${requestStatus.className}`}>
                  {requestStatus.label}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
            <section className="space-y-5">
              <InfoSection
                title={isAr ? "بيانات الطلب" : "Request Information"}
                items={[
                  { label: isAr ? "نوع القضية" : "Case Type", value: formatCaseType(request.caseType, isAr) },
                  { label: isAr ? "المبلغ" : "Amount", value: formatCurrency(request.baseFee, isAr), dir: "ltr" },
                  { label: isAr ? "مرجع الدفع" : "Payment Ref", value: request.paymentRef, dir: "ltr" },
                  { label: isAr ? "لغة الطلب" : "Request Language", value: request.requestLocale },
                  { label: isAr ? "تاريخ الإنشاء" : "Created At", value: formatDate(request.createdAt, isAr) },
                  { label: isAr ? "آخر تحديث" : "Updated At", value: formatDate(request.updatedAt, isAr) },
                  { label: isAr ? "الوصف" : "Description", value: request.description },
                ]}
              />

              <InfoSection
                title={isAr ? "بيانات العميل" : "Client Information"}
                items={[
                  { label: isAr ? "اسم العميل" : "Client Name", value: request.contactName },
                  { label: isAr ? "الهاتف" : "Phone", value: request.contactPhone, dir: "ltr" },
                  { label: isAr ? "الرقم الشخصي" : "ID Number", value: request.contactIdNumber, dir: "ltr" },
                ]}
              />

              <InfoSection
                title={isAr ? "موقع الطلب" : "Request Location"}
                items={[
                  { label: isAr ? "العنوان" : "Address", value: request.location?.address },
                  { label: isAr ? "الإحداثيات" : "Coordinates", value: formatCoordinates(request.location), dir: "ltr" },
                  { label: isAr ? "الدقة" : "Accuracy", value: request.location?.accuracy ? `${request.location.accuracy} m` : "" },
                ]}
              />

              <InfoSection
                title={isAr ? "مقدم الخدمة" : "Service Provider"}
                items={[
                  { label: isAr ? "اسم المحامي" : "Lawyer Name", value: providerName },
                  { label: isAr ? "البريد الإلكتروني" : "Email", value: request.providerEmail, dir: "ltr" },
                  { label: isAr ? "الهاتف" : "Phone", value: request.providerPhone, dir: "ltr" },
                  { label: isAr ? "رقم القيد" : "Registration No.", value: request.providerRegistrationNo, dir: "ltr" },
                  { label: isAr ? "رقم العضوية" : "Membership No.", value: request.providerMembershipNo, dir: "ltr" },
                  { label: isAr ? "معرف المحامي" : "Lawyer ID", value: request.assignedLawyerId, dir: "ltr" },
                ]}
              />

              <InfoSection
                title={isAr ? "التوقيتات والتفاصيل الإضافية" : "Timeline & Extra Details"}
                items={[
                  { label: isAr ? "وقت الاستجابة" : "Response Time", value: formatDate(request.responseTimestamp, isAr) },
                  { label: isAr ? "وقت الوصول" : "Arrival Time", value: formatDate(request.arrivalTimestamp, isAr) },
                  { label: isAr ? "وقت الإكمال" : "Completed Time", value: formatDate(request.completedTimestamp, isAr) },
                  { label: isAr ? "وقت التسوية" : "Settled At", value: formatDate(request.settledAt, isAr) },
                  { label: isAr ? "تمت التسوية بواسطة" : "Settled By", value: request.settledBy },
                  { label: isAr ? "التقييم" : "Rating", value: request.ratingStars ? `${formatEnglishNumbers(request.ratingStars)}/5` : "" },
                  { label: isAr ? "تعليق التقييم" : "Rating Comment", value: request.ratingComment },
                  { label: isAr ? "سبب الإلغاء" : "Cancellation Reason", value: request.cancellationReason },
                ]}
              />

              <InfoSection
                title={isAr ? "بيانات الاسترجاع" : "Refund Information"}
                items={[
                  { label: isAr ? "حالة الاسترجاع" : "Refund Status", value: formatRefundStatus(request.refundStatus, isAr) },
                  { label: isAr ? "مبلغ الاسترجاع" : "Refund Amount", value: formatCurrency(request.refundAmountBhd, isAr), dir: "ltr" },
                  { label: isAr ? "مرجع الاسترجاع" : "Refund Ref", value: request.refundRef, dir: "ltr" },
                  { label: isAr ? "وقت تحديد الاسترجاع" : "Refund Marked At", value: formatDate(request.refundMarkedAt, isAr) },
                  { label: isAr ? "تم تحديد الاسترجاع بواسطة" : "Refund Marked By", value: request.refundMarkedBy },
                ]}
              />

              <InfoSection
                title={isAr ? "آخر موقع للمحامي" : "Last Advocate Location"}
                items={[
                  { label: isAr ? "الإحداثيات" : "Coordinates", value: formatCoordinates(request.lastAdvocateLocation), dir: "ltr" },
                  { label: isAr ? "الدقة" : "Accuracy", value: request.lastAdvocateLocation?.accuracy ? `${request.lastAdvocateLocation.accuracy} m` : "" },
                  { label: isAr ? "وقت الإرسال" : "Reported At", value: formatDate(request.lastAdvocateLocation?.reportedAt, isAr) },
                ]}
              />

              <InfoSection
                title={isAr ? "السجلات الداخلية" : "Internal Logs"}
                items={[
                  { label: isAr ? "معرف النظام" : "System ID", value: request.id, dir: "ltr" },
                  { label: isAr ? "معرف الموافقة" : "Consent ID", value: request.consentId, dir: "ltr" },
                ]}
                jsonItems={[
                  { label: isAr ? "الملاحظات الداخلية" : "Internal Notes", value: request.internalNotes },
                  { label: isAr ? "سجل إجراءات التوجيه" : "Dispatch Actor Log", value: request.dispatchActorLog },
                ]}
              />
            </section>

            <aside className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(7,17,31,0.06)] lg:sticky lg:top-6 lg:self-start">
              <h2 className="text-lg font-extrabold text-text-primary">
                {isAr ? "التحكم بحالة الطلب" : "Request Status Control"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-text-muted">
                {isAr
                  ? "يمكن تغيير حالة الطلب فقط. حالة الدفع للعرض ولا يتم تعديلها من هنا."
                  : "Only the request status can be changed. Payment status is view-only."}
              </p>

              <form action={updateRequestStatus} className="mt-5 grid gap-2">
                <input type="hidden" name="id" value={request.id} />
                <input type="hidden" name="source" value="emergency" />
                <input type="hidden" name="locale" value={locale} />

                {emergencyStatusOptions.map((option) => {
                  const isActive = option.value === request.serviceStatus;

                  return (
                    <button
                      key={option.value}
                      type="submit"
                      name="status"
                      value={option.value}
                      disabled={isActive}
                      className={`rounded-2xl px-4 py-3 text-sm font-extrabold transition-colors ${
                        isActive
                          ? "cursor-not-allowed bg-gray-200 text-gray-500"
                          : "bg-primary text-white hover:bg-primary-dark"
                      }`}
                    >
                      {option[isAr ? "ar" : "en"]}
                    </button>
                  );
                })}
              </form>
            </aside>
          </div>
        </div>
      </main>
    );
  }

  const [request] = await db
    .select({
      id: schema.bookingRequests.id,
      lang: schema.bookingRequests.lang,
      service: schema.bookingRequests.service,
      consultationType: schema.bookingRequests.consultationType,
      consultationMethod: schema.bookingRequests.consultationMethod,
      consultationPrice: schema.bookingRequests.consultationPrice,
      amountBd: schema.bookingRequests.amountBd,
      durationMinutes: schema.bookingRequests.durationMinutes,
      videoProvider: schema.bookingRequests.videoProvider,
      appointmentDate: schema.bookingRequests.appointmentDate,
      appointmentTime: schema.bookingRequests.appointmentTime,
      assignmentMode: schema.bookingRequests.assignmentMode,
      selectedOfficeId: schema.bookingRequests.selectedOfficeId,
      selectedOfficeName: schema.bookingRequests.selectedOfficeName,
      selectedLawyerId: schema.bookingRequests.selectedLawyerId,
      selectedLawyerName: schema.bookingRequests.selectedLawyerName,
      assignedToEmail: schema.bookingRequests.assignedToEmail,
      customerName: schema.bookingRequests.customerName,
      customerPhone: schema.bookingRequests.customerPhone,
      customerEmail: schema.bookingRequests.customerEmail,
      customerMessage: schema.bookingRequests.customerMessage,
      paymentStatus: schema.bookingRequests.paymentStatus,
      adminStatus: schema.bookingRequests.adminStatus,
      tapChargeId: schema.bookingRequests.tapChargeId,
      tapStatus: schema.bookingRequests.tapStatus,
      requestPayload: schema.bookingRequests.requestPayload,
      tapPayload: schema.bookingRequests.tapPayload,
      providerNameAr: schema.saudiLawyers.fullNameAr,
      providerNameEn: schema.saudiLawyers.fullNameEn,
      providerEmail: schema.saudiLawyers.email,
      providerPhone: schema.saudiLawyers.phone,
      providerRegistrationNo: schema.saudiLawyers.registrationNo,
      providerMembershipNo: schema.saudiLawyers.membershipNo,

      reviewStatus: schema.bookingReviews.status,
      reviewEmailStatus: schema.bookingReviews.reviewEmailStatus,
      reviewEmailSentAt: schema.bookingReviews.reviewEmailSentAt,
      reviewEmailSkippedAt: schema.bookingReviews.reviewEmailSkippedAt,
      reviewEmailError: schema.bookingReviews.reviewEmailError,
      reviewUrl: schema.bookingReviews.reviewUrl,
      reviewSubmittedAt: schema.bookingReviews.submittedAt,
      lawyerRating: schema.bookingReviews.lawyerRating,
      serviceSpeedRating: schema.bookingReviews.serviceSpeedRating,
      serviceQualityRating: schema.bookingReviews.serviceQualityRating,
      providerCommunicationRating:
        schema.bookingReviews.providerCommunicationRating,
      appointmentCommitmentRating:
        schema.bookingReviews.appointmentCommitmentRating,
      platformEaseRating: schema.bookingReviews.platformEaseRating,
      overallRating: schema.bookingReviews.overallRating,
      lawyerComment: schema.bookingReviews.lawyerComment,
      serviceComment: schema.bookingReviews.serviceComment,
      publicComment: schema.bookingReviews.publicComment,

      createdAt: schema.bookingRequests.createdAt,
      updatedAt: schema.bookingRequests.updatedAt,
    })
    .from(schema.bookingRequests)
    .leftJoin(
      schema.saudiLawyers,
      eq(schema.bookingRequests.selectedLawyerId, schema.saudiLawyers.id),
    )
    .leftJoin(
      schema.bookingReviews,
      eq(schema.bookingReviews.bookingRequestId, schema.bookingRequests.id),
    )
    .where(eq(schema.bookingRequests.id, id))
    .limit(1);

  if (!request) notFound();

  const providerName =
    request.assignmentMode === "office"
      ? request.selectedOfficeName || request.assignedToEmail || ""
      : (isAr ? request.providerNameAr : request.providerNameEn) ||
        request.providerNameAr ||
        request.providerNameEn ||
        request.selectedLawyerName ||
        request.assignedToEmail ||
        "";

  const paymentStatus = formatPaymentStatus(request.paymentStatus, isAr);
  const requestStatus = formatRequestStatus(request.adminStatus, isAr);

  const lawyers = await db
    .select({
      id: schema.saudiLawyers.id,
      fullNameAr: schema.saudiLawyers.fullNameAr,
      fullNameEn: schema.saudiLawyers.fullNameEn,
      email: schema.saudiLawyers.email,
    })
    .from(schema.saudiLawyers)
    .where(eq(schema.saudiLawyers.status, "approved"));

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <a
            href={`/${locale}/admin/requests`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {isAr ? "العودة للطلبات" : "Back to requests"}
          </a>

          <AdminLogoutButton />
        </div>

        <div className="mb-6 rounded-3xl bg-[#006C32] p-7 text-white shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">
                {isAr ? "تفاصيل طلب الحجز" : "Booking Request Details"}
              </h1>

              <p className="mt-2 text-sm text-white/65">{makeBookingReference(request.id)}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${paymentStatus.className}`}>
                {paymentStatus.label}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${requestStatus.className}`}>
                {requestStatus.label}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
          <section className="space-y-5">
            <InfoSection
              title={isAr ? "بيانات الطلب" : "Request Information"}
              items={[
                { label: isAr ? "الخدمة" : "Service", value: formatService(request.service, isAr) },
                { label: isAr ? "نوع الاستشارة" : "Consultation Type", value: formatConsultationType(request.consultationType, isAr) },
                { label: isAr ? "طريقة الاستشارة" : "Consultation Method", value: formatConsultationMethod(request.consultationMethod, isAr) },
                { label: isAr ? "المبلغ" : "Amount", value: formatBookingAmount(request.amountBd, request.consultationPrice, isAr), dir: "ltr" },
                { label: isAr ? "المدة" : "Duration", value: request.durationMinutes > 0 ? `${formatEnglishNumbers(request.durationMinutes)} ${isAr ? "دقيقة" : "minutes"}` : "" },
                { label: isAr ? "مزود الفيديو" : "Video Provider", value: formatVideoProvider(request.videoProvider, isAr) },
                { label: isAr ? "تاريخ الموعد" : "Appointment Date", value: request.appointmentDate },
                { label: isAr ? "وقت الموعد" : "Appointment Time", value: formatAppointmentTimePeriod(request.appointmentTime, isAr), dir: "ltr" },
                { label: isAr ? "لغة الطلب" : "Request Language", value: request.lang },
                { label: isAr ? "سبب الرفض" : "Rejection Reason", value: getPayloadString(request.requestPayload, "adminRejectionReason") },
                { label: isAr ? "سبب الإلغاء" : "Cancellation Reason", value: getPayloadString(request.requestPayload, "adminCancellationReason") },
                { label: isAr ? "تاريخ الإنشاء" : "Created At", value: formatDate(request.createdAt, isAr) },
                { label: isAr ? "آخر تحديث" : "Updated At", value: formatDate(request.updatedAt, isAr) },
              ]}
            />

            <InfoSection
              title={isAr ? "بيانات العميل" : "Client Information"}
              items={[
                { label: isAr ? "اسم العميل" : "Client Name", value: request.customerName },
                { label: isAr ? "الهاتف" : "Phone", value: request.customerPhone, dir: "ltr" },
                { label: isAr ? "البريد الإلكتروني" : "Email", value: request.customerEmail, dir: "ltr" },
                { label: isAr ? "رسالة العميل" : "Customer Message", value: request.customerMessage },
              ]}
            />

            <InfoSection
              title={isAr ? "تقييم العميل للمحامي والخدمة" : "Client Review for Lawyer and Service"}
              items={[
                {
                  label: isAr ? "حالة التقييم" : "Review Status",
                  value: formatReviewStatus(request.reviewStatus, isAr),
                },
                {
                  label: isAr ? "حالة إرسال رابط التقييم" : "Review Email Status",
                  value: formatReviewEmailStatus(request.reviewEmailStatus, isAr),
                },
                {
                  label: isAr ? "تاريخ إرسال رابط التقييم" : "Review Email Sent At",
                  value: formatDate(request.reviewEmailSentAt, isAr),
                },
                {
                  label: isAr ? "خطأ إرسال التقييم" : "Review Email Error",
                  value: request.reviewEmailError,
                },
                {
                  label: isAr ? "تقييم المحامي" : "Lawyer Rating",
                  value: formatRatingScore(request.lawyerRating, isAr),
                },
                {
                  label: isAr ? "سرعة الخدمة" : "Service Speed",
                  value: formatRatingScore(request.serviceSpeedRating, isAr),
                },
                {
                  label: isAr ? "جودة الخدمة" : "Service Quality",
                  value: formatRatingScore(request.serviceQualityRating, isAr),
                },
                {
                  label: isAr ? "تواصل مقدم الخدمة" : "Provider Communication",
                  value: formatRatingScore(request.providerCommunicationRating, isAr),
                },
                {
                  label: isAr ? "الالتزام بالموعد" : "Appointment Commitment",
                  value: formatRatingScore(request.appointmentCommitmentRating, isAr),
                },
                {
                  label: isAr ? "سهولة استخدام المنصة" : "Platform Ease",
                  value: formatRatingScore(request.platformEaseRating, isAr),
                },
                {
                  label: isAr ? "التقييم العام" : "Overall Rating",
                  value: formatRatingScore(request.overallRating, isAr),
                },
                {
                  label: isAr ? "تاريخ التقييم" : "Reviewed At",
                  value: formatDate(request.reviewSubmittedAt, isAr),
                },
                {
                  label: isAr ? "تعليق المحامي" : "Lawyer Comment",
                  value: request.lawyerComment,
                },
                {
                  label: isAr ? "تعليق الخدمة والمنصة" : "Service / Platform Comment",
                  value: request.serviceComment,
                },
                {
                  label: isAr ? "تعليق المحامي ظاهر للعامة؟" : "Public Lawyer Comment?",
                  value:
                    request.publicComment === null || request.publicComment === undefined
                      ? ""
                      : request.publicComment
                        ? isAr
                          ? "نعم"
                          : "Yes"
                        : isAr
                          ? "لا"
                          : "No",
                },
              ]}
            />

            <InfoSection
              title={isAr ? "مقدم الخدمة" : "Service Provider"}
              items={[
                {
                  label:
                    request.assignmentMode === "office"
                      ? isAr
                        ? "اسم المكتب"
                        : "Office Name"
                      : isAr
                        ? "اسم المحامي"
                        : "Lawyer Name",
                  value: providerName,
                },
                { label: isAr ? "نوع الإسناد" : "Assignment Mode", value: formatAssignmentMode(request.assignmentMode, isAr) },
                { label: isAr ? "معرف المكتب" : "Office ID", value: request.selectedOfficeId, dir: "ltr" },
                { label: isAr ? "معرف المحامي" : "Lawyer ID", value: request.selectedLawyerId, dir: "ltr" },
                { label: isAr ? "رقم القيد" : "Registration No.", value: request.providerRegistrationNo, dir: "ltr" },
                { label: isAr ? "رقم العضوية" : "Membership No.", value: request.providerMembershipNo, dir: "ltr" },
                { label: isAr ? "البريد الإلكتروني" : "Email", value: request.providerEmail || request.assignedToEmail, dir: "ltr" },
                { label: isAr ? "البريد المعيّن" : "Assigned Email", value: request.assignedToEmail !== request.providerEmail ? request.assignedToEmail : "", dir: "ltr" },
                { label: isAr ? "الهاتف" : "Phone", value: request.providerPhone, dir: "ltr" },
              ]}
            />

            <InfoSection
              title={isAr ? "بيانات الدفع" : "Payment Information"}
              items={[
                { label: isAr ? "Tap Charge ID" : "Tap Charge ID", value: request.tapChargeId, dir: "ltr" },
                { label: isAr ? "Tap Status" : "Tap Status", value: formatTapStatus(request.tapStatus, isAr), dir: "ltr" },
              ]}
            />

            <InfoSection
              title={isAr ? "السجلات والبيانات التقنية" : "Logs & Technical Data"}
              items={[
                { label: isAr ? "معرف النظام" : "System ID", value: request.id, dir: "ltr" },
              ]}
              jsonItems={[
                { label: isAr ? "بيانات الطلب الأصلية" : "Original Request Payload", value: request.requestPayload },
                { label: isAr ? "بيانات Tap" : "Tap Payload", value: request.tapPayload },
              ]}
            />
          </section>

          <aside className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(7,17,31,0.06)] lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-lg font-extrabold text-text-primary">
              {isAr ? "التحكم بالطلب" : "Request Controls"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              {isAr
                ? "كل إجراء يفتح نافذة تأكيد قبل التنفيذ. بعد الاعتماد لا يمكن إرجاع الطلب إلى بانتظار المراجعة."
                : "Each action opens a confirmation popup before applying changes. After approval, the request cannot be returned to pending review."}
            </p>

            <RequestActionModals
              isAr={isAr}
              locale={locale}
              requestId={request.id}
              currentStatus={request.adminStatus}
              assignmentMode={request.assignmentMode}
              appointmentDate={request.appointmentDate}
              appointmentTime={request.appointmentTime}
              lawyers={lawyers.map((lawyer) => ({
                id: lawyer.id,
                name:
                  (isAr ? lawyer.fullNameAr : lawyer.fullNameEn) ||
                  lawyer.fullNameAr ||
                  lawyer.fullNameEn ||
                  lawyer.email ||
                  lawyer.id,
                email: lawyer.email || "",
              }))}
              updateRequestStatusAction={updateRequestStatus}
              updateBookingAppointmentAction={updateBookingAppointment}
              updateBookingProviderAction={updateBookingProvider}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}
