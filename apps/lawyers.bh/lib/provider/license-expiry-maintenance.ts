import { escapeHtml, type SendEmailInput } from "@/lib/postmark";

export type LicenseReminderKind = "30_days" | "7_days";

export type LicenseDateClassification = "expired" | LicenseReminderKind | null;

export function bahrainDateFromInstant(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bahrain",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dateToUtcDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const millis = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(millis) ? Math.floor(millis / 86_400_000) : null;
}

export function classifyLicenseDate(
  runDate: string,
  expiryDate: string | null,
): LicenseDateClassification {
  if (!expiryDate) return null;
  const runDay = dateToUtcDay(runDate);
  const expiryDay = dateToUtcDay(expiryDate);
  if (runDay === null || expiryDay === null) return null;

  const daysRemaining = expiryDay - runDay;
  if (daysRemaining <= 0) return "expired";
  if (daysRemaining === 30) return "30_days";
  if (daysRemaining === 7) return "7_days";
  return null;
}

export type LicenseExpiryReminderInput = {
  fullNameAr: string;
  fullNameEn: string;
  locale: "ar" | "en";
  expiryDate: string;
  daysRemaining: 30 | 7;
};

export function buildLicenseExpiryReminder(
  input: LicenseExpiryReminderInput,
): SendEmailInput {
  const isArabic = input.locale === "ar";
  const name = isArabic
    ? input.fullNameAr || input.fullNameEn
    : input.fullNameEn || input.fullNameAr;
  const safeName = escapeHtml(name);

  if (isArabic) {
    const subject = `تنبيه: تبقى ${input.daysRemaining} يومًا على انتهاء رخصتك | محامون البحرين`;
    const text = [
      `مرحبًا ${name}،`,
      "",
      `ستنتهي رخصتك بتاريخ ${input.expiryDate}. يرجى تزويدنا بالرخصة المجددة قبل هذا التاريخ.`,
      "في يوم انتهاء الرخصة سيتم تعطيل حسابك وإخفاؤه من الدليل إلى أن تتم مراجعة الرخصة الجديدة وإعادة تفعيل الحساب.",
    ].join("\n");
    const html = [
      '<div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8">',
      `<p>مرحبًا ${safeName}،</p>`,
      `<p>ستنتهي رخصتك بتاريخ <strong>${input.expiryDate}</strong>. يرجى تزويدنا بالرخصة المجددة قبل هذا التاريخ.</p>`,
      "<p>في يوم انتهاء الرخصة سيتم تعطيل حسابك وإخفاؤه من الدليل إلى أن تتم مراجعة الرخصة الجديدة وإعادة تفعيل الحساب.</p>",
      "</div>",
    ].join("");
    return { subject, text, html };
  }

  const subject = `Reminder: ${input.daysRemaining} days until your license expires | Lawyers.bh`;
  const text = [
    `Hello ${name},`,
    "",
    `Your license expires on ${input.expiryDate}. Please provide the renewed license before this date.`,
    "On the expiry date, your account will be deactivated and removed from the public directory until the renewed license is reviewed and the account is reactivated.",
  ].join("\n");
  const html = [
    '<div dir="ltr" style="font-family: Arial, sans-serif; line-height: 1.8">',
    `<p>Hello ${safeName},</p>`,
    `<p>Your license expires on <strong>${input.expiryDate}</strong>. Please provide the renewed license before this date.</p>`,
    "<p>On the expiry date, your account will be deactivated and removed from the public directory until the renewed license is reviewed and the account is reactivated.</p>",
    "</div>",
  ].join("");
  return { subject, text, html };
}
