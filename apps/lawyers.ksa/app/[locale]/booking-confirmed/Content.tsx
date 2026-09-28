"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  AlertTriangle,
  ArrowLeft,
  Download,
  Receipt,
  Printer,
  RefreshCw,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";

type ReceiptData = {
  id: string;
  tapChargeId: string;
  tapStatus: string;
  paymentStatus: string;
  service: string;
  consultationType: string;
  consultationPrice: string;
  amountBd: string;
  appointmentDate: string;
  appointmentTime: string;
  assignedToName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  issuedAt: string;
};

interface Props {
  tapId: string | null;
  status: string | null;
  receipt: ReceiptData | null;
}



function toArabicDigits(value: string) {
  return value.replace(/\d/g, (digit) => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]);
}

function formatReceiptPrice(value: string, isAr: boolean) {
  const text = String(value ?? "").trim();

  if (!isAr) return text;

  const normalized = text
    .replace(/\bSAR\b/gi, " ر.س")
    .replace(/\bBD\b/gi, " ر.س")
    .replace("ريال سعودي", " ر.س")
    .replace(/\s+/g, " ")
    .trim();

  return toArabicDigits(normalized).replace(
    /([٠-٩]+(?:\.[٠-٩]+)?)\s*د\.ب/g,
    "$1\u00A0ر.س",
  );
}

function formatReceiptAmount(value: string, isAr: boolean) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return isAr ? `${toArabicDigits(value)} ر.س` : `${value} SAR`;
  }

  return isAr
    ? `${toArabicDigits(amount.toFixed(2))} ر.س`
    : `${amount.toFixed(2)} SAR`;
}

function formatConsultationType(value: string, isAr: boolean) {
  if (!isAr) return value;

  const normalized = String(value ?? "").trim().toLowerCase();

  const map: Record<string, string> = {
    "virtual legal advice & guidance": "التوجيه والإرشاد القانوني الافتراضي",
    "voice call": "مكالمة صوتية",
    "whatsapp consultation": "استشارة عبر واتساب",
    "video call": "مكالمة فيديو",
    "office visit": "زيارة المكتب",
    "legal service request": "طلب خدمة قانونية",
    online: "استشارة عبر الإنترنت",
    phone: "مكالمة صوتية",
    whatsapp: "استشارة عبر واتساب",
    video: "مكالمة فيديو",
    office: "زيارة المكتب",
    service_request: "طلب خدمة قانونية",
  };

  return map[normalized] ?? value;
}

function formatConsultationWithPrice(receipt: ReceiptData, isAr: boolean) {
  const type = formatConsultationType(receipt.consultationType, isAr);
  const price = formatReceiptPrice(receipt.consultationPrice, isAr);

  if (!price) return type;

  return isAr ? `${type} \u00A0( ${price} )` : `${type} (${price})`;
}

function getReceiptValueDir(value: string, isAr: boolean) {
  if (!isAr) return "ltr";

  const text = String(value ?? "").trim();

  if (!text) return "rtl";

  const hasLatin = /[A-Za-z]/.test(text);
  const hasEmail = text.includes("@");
  const isTechnical =
    /^[\s\d٠-٩۰-۹+@._:/\-()]+$/.test(text) ||
    /^chg_/i.test(text);

  if (hasLatin || hasEmail || isTechnical) {
    return "ltr";
  }

  return "rtl";
}

function getReceiptValueClass(value: string, isAr: boolean) {
  return getReceiptValueDir(value, isAr) === "ltr"
    ? "value value-ltr"
    : "value value-rtl";
}

function formatPaymentStatus(value: string, isAr: boolean) {
  const normalized = String(value ?? "").trim().toUpperCase();

  if (!isAr) return normalized || value;

  const map: Record<string, string> = {
    CAPTURED: "مدفوع",
    PAID: "مدفوع",
    INITIATED: "قيد المعالجة",
    PENDING: "قيد الانتظار",
    PENDING_PAYMENT: "بانتظار الدفع",
    FAILED: "فشل الدفع",
    DECLINED: "مرفوض",
    CANCELLED: "ملغي",
    CANCELED: "ملغي",
    ABANDONED: "غير مكتمل",
    VOID: "ملغي",
    VERIFY_FAILED: "تعذر التحقق",
  };

  return map[normalized] ?? value;
}

function formatAmount(value: string, isAr: boolean) {
  return formatReceiptAmount(value, isAr);
}

function formatIssuedAt(value: string, isAr: boolean) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function ReceiptRow({
  label,
  value,
  isAr,
}: {
  label: string;
  value: string;
  isAr: boolean;
}) {
  const dir = getReceiptValueDir(value, isAr);

  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <span className="text-xs font-bold text-text-muted">{label}</span>

      <span
        dir={dir}
        className={`max-w-[80%] text-xs font-black text-[#07111F] break-words ${
          dir === "ltr" ? "text-left font-sans" : "text-left"
        }`}
      >
        {value || "-"}
      </span>
    </div>
  );
}

export default function BookingConfirmed({ tapId, status, receipt }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const receiptRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [retryPaymentError, setRetryPaymentError] = useState("");

  // Only a genuinely captured charge counts as paid.
  const success = status === "CAPTURED";
  const canRetryPayment = !success && Boolean(receipt?.id);

  const handleRetryPayment = async () => {
    if (!receipt?.id || retryingPayment) return;

    setRetryingPayment(true);
    setRetryPaymentError("");

    try {
      const res = await fetch("/api/tap/retry-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: receipt.id,
          lang: locale,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        transactionUrl?: string;
      };

      if (!res.ok || !data.ok || !data.transactionUrl) {
        throw new Error(data.error ?? "Could not create retry payment link");
      }

      window.location.href = data.transactionUrl;
    } catch (err) {
      setRetryPaymentError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر إنشاء رابط إعادة الدفع"
            : "Could not create retry payment link",
      );
    } finally {
      setRetryingPayment(false);
    }
  };


type JsPdfWithArabic = import("jspdf").jsPDF & {
  processArabic?: (text: string) => string;
  setR2L?: (value: boolean) => void;
};

async function fileToBase64(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.split(",")[1] ?? "");
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeReceiptHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildReceiptHtml(receipt: ReceiptData, isAr: boolean) {
  const rows: Array<[string, string]> = isAr
    ? [
        ["رقم الإيصال", receipt.id],
        ["مرجع Tap", receipt.tapChargeId],
        ["حالة الدفع", formatPaymentStatus(receipt.tapStatus, isAr)],
        ["الخدمة", receipt.service],
        ["نوع الاستشارة", formatConsultationWithPrice(receipt, isAr)],
        ["التاريخ", receipt.appointmentDate],
        ["الوقت", receipt.appointmentTime],
        ["المخصص له", receipt.assignedToName],
        ["اسم العميل", receipt.customerName],
        ["الهاتف", receipt.customerPhone],
        ["البريد الإلكتروني", receipt.customerEmail],
        ["تاريخ الإصدار", formatIssuedAt(receipt.issuedAt, isAr)],
      ]
    : [
        ["Receipt No.", receipt.id],
        ["Tap Reference", receipt.tapChargeId],
        ["Payment Status", formatPaymentStatus(receipt.tapStatus, isAr)],
        ["Service", receipt.service],
        ["Consultation", formatConsultationWithPrice(receipt, isAr)],
        ["Date", receipt.appointmentDate],
        ["Time", receipt.appointmentTime],
        ["Assigned To", receipt.assignedToName],
        ["Customer Name", receipt.customerName],
        ["Phone", receipt.customerPhone],
        ["Email", receipt.customerEmail],
        ["Issued At", formatIssuedAt(receipt.issuedAt, isAr)],
      ];

const rowsHtml = rows
  .map(([label, value]) => {
    const dir = getReceiptValueDir(value, isAr);
    const valueClass = getReceiptValueClass(value, isAr);

    return `
      <div class="row">
        <div class="label">${escapeReceiptHtml(label)}</div>
        <div class="${valueClass}" dir="${dir}">${escapeReceiptHtml(value || "-")}</div>
      </div>
    `;
  })
  .join("");

  return `
<!doctype html>
<html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
<head>
  <meta charset="utf-8" />
  <style>
    @font-face {
      font-family: "Cairo";
      src: url("/fonts/Cairo-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: #ffffff;
      font-family: "Cairo", Arial, Tahoma, sans-serif;
      color: #07111F;
      direction: ${isAr ? "rtl" : "ltr"};
    }

   #receipt-pdf-card {
  width: 820px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 22px;
  overflow: hidden;
}

   .header {
  background: linear-gradient(135deg, #005126 0%, #006c32 55%, #005126 100%);
  color: #ffffff;
  padding: 32px 38px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 32px;
}

    .brand {
      font-size: 15px;
      opacity: 0.72;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .title {
  font-size: 32px;
  line-height: 1.8;
  font-weight: 700;
  margin: 0;
  word-spacing: ${isAr ? "8px" : "2px"};
  letter-spacing: 0;
}

    .icon {
      width: 58px;
      height: 58px;
      border-radius: 18px;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      flex: 0 0 auto;
    }

    .content {
      padding: 30px;
    }

    .paid {
      background: #ecfdf5;
      border-radius: 18px;
      padding: 20px;
      text-align: center;
      margin-bottom: 22px;
    }

    .paid-label {
    word-spacing: ${isAr ? "8px" : "2px"};
      color: #047857;
      font-size: 15px;
      font-weight: 800;
      margin-bottom: 8px;
    }

    .amount {
      color: #047857;
      font-size: 34px;
      line-height: 1.2;
      font-weight: 900;
    }

    .details {
      background: #f8fafc;
      border-radius: 18px;
      padding: 4px 24px;
    }

    .row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 46px;
  border-bottom: 1px solid #e5e7eb;
  padding: 17px 0;
}

    .row:last-child {
      border-bottom: none;
    }

    .label {
  color: #5c544d;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1.9;
  word-spacing: ${isAr ? "5px" : "1px"};
  letter-spacing: 0;
}

.value {
  color: #07111F;
  font-size: 14px;
  font-weight: 700;
  max-width: 500px;
  line-height: 1.9;
  letter-spacing: 0;
  overflow-wrap: anywhere;
  unicode-bidi: isolate;
}

.value-rtl {
  direction: rtl;
  text-align: left;
  word-spacing: 2px;
}

.value-ltr {
  direction: ltr;
  text-align: left;
  word-spacing: normal;
  font-family: Arial, "Cairo", Tahoma, sans-serif;
}

    .note {
  margin-top: 24px;
  text-align: center;
  color: #5c544d;
  font-size: 13px;
  font-weight: 600;
  line-height: 2;
  word-spacing: ${isAr ? "5px" : "1px"};
  letter-spacing: 0;
}

    .footer {
      margin-top: 8px;
      text-align: center;
      color: #777;
      font-size: 12px;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div id="receipt-pdf-card">
    <div class="header">
      <div>
        <div class="brand">Lawyers.bh</div>
        <h1 class="title">${isAr ? "إيصال دفع" : "Payment Receipt"}</h1>
      </div>
      <div class="icon">✓</div>
    </div>

    <div class="content">
      <div class="paid">
        <div class="paid-label">${isAr ? "مدفوع بنجاح" : "Paid Successfully"}</div>
        <div class="amount">${escapeReceiptHtml(formatAmount(receipt.amountBd, isAr))}</div>
      </div>

      <div class="details">
        ${rowsHtml}
      </div>

      <div class="note">
        ${
          isAr
            ? "هذا الإيصال صادر إلكترونياً من منصة محامون البحرين."
            : "This receipt was electronically issued by Lawyers.bh."
        }
      </div>

      <div class="footer">
        +973 1753 7070 | info@lawyers.bh
      </div>
    </div>
  </div>
</body>
</html>
`;
}

const downloadReceiptPdf = async () => {
  if (!receipt) return;

  setDownloading(true);

  let iframe: HTMLIFrameElement | null = null;

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "880px";
    iframe.style.height = "1300px";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;

    if (!doc) {
      throw new Error("Could not create receipt iframe");
    }

    doc.open();
    doc.write(buildReceiptHtml(receipt, isAr));
    doc.close();

    await new Promise<void>((resolve) => {
      iframe!.onload = () => resolve();
      window.setTimeout(resolve, 500);
    });

    if (doc.fonts?.ready) {
      await doc.fonts.ready;
    }

    const receiptElement = doc.getElementById("receipt-pdf-card");

    if (!receiptElement) {
      throw new Error("Receipt element not found");
    }

    const canvas = await html2canvas(receiptElement, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });

    const imageData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const margin = 10;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;

    if (imageHeight <= pageHeight - margin * 2) {
      pdf.addImage(imageData, "PNG", margin, margin, imageWidth, imageHeight);
    } else {
      const scaledHeight = pageHeight - margin * 2;
      const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
      const x = (pageWidth - scaledWidth) / 2;

      pdf.addImage(imageData, "PNG", x, margin, scaledWidth, scaledHeight);
    }

    pdf.save(`lawyers-bh-receipt-${receipt.id.slice(0, 8)}.pdf`);
  } catch (err) {
    console.error("[receipt] PDF download failed", err);

    alert(
      isAr
        ? "تعذر تحميل الإيصال. حاول مرة أخرى."
        : "Could not download the receipt. Please try again.",
    );
  } finally {
    if (iframe?.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }

    setDownloading(false);
  }
};

  return (
    <div className="py-24 lg:py-32">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mx-auto max-w-3xl px-1 text-center"
      >
        {success ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>

            <h1 className="mb-2 text-2xl font-extrabold text-text-primary">
              {isAr ? "تم تأكيد الدفع" : "Payment Confirmed"}
            </h1>

            <p className="mb-3 text-text-muted">
              {isAr
                ? "شكراً لك! سيتم إرسال تفاصيل موعدك إلى بريدك الإلكتروني خلال دقائق."
                : "Thank you — your booking details are on the way to your inbox."}
            </p>

            {receipt && (
              <div className="mb-6 mt-7 text-start">
<div
  id="receipt-print-area"
  ref={receiptRef}
  data-receipt-pdf
  dir={isAr ? "rtl" : "ltr"}
  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
>
                  <div className="border-b border-gray-100 bg-primary px-5 py-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="mt-1 text-xl font-black">
                          {isAr ? "إيصال دفع" : "Payment Receipt"}
                        </h2>
                      </div>

                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                        <Receipt className="h-6 w-6" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-center">
                      <p className="text-xs font-bold text-emerald-700">
                        {isAr ? "مدفوع بنجاح" : "Paid Successfully"}
                      </p>
                      <p className="mt-1 text-2xl font-black text-emerald-700">
                        {formatAmount(receipt.amountBd, isAr)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 px-2">
                      <ReceiptRow
                        label={isAr ? "رقم الإيصال" : "Receipt No."}
                        value={receipt.id}
                        isAr={isAr}
                      />
                      <ReceiptRow
                        label={isAr ? "مرجع Tap" : "Tap Reference"}
                        value={receipt.tapChargeId}
                        isAr={isAr}
                      />
                      <ReceiptRow
  label={isAr ? "حالة الدفع" : "Payment Status"}
  value={formatPaymentStatus(receipt.tapStatus, isAr)}
  isAr={isAr}
/>
                      <ReceiptRow
                        label={isAr ? "الخدمة" : "Service"}
                        value={receipt.service}
                        isAr={isAr}
                      />
                      <ReceiptRow
  label={isAr ? "نوع الاستشارة" : "Consultation"}
  value={formatConsultationWithPrice(receipt, isAr)}
  isAr={isAr}
/>
                      <ReceiptRow
                        label={isAr ? "التاريخ" : "Date"}
                        value={receipt.appointmentDate}
                        isAr={isAr}
                      />
                      <ReceiptRow
                        label={isAr ? "الوقت" : "Time"}
                        value={receipt.appointmentTime}
                        isAr={isAr}
                      />
                      <ReceiptRow
                        label={isAr ? "المخصص له" : "Assigned To"}
                        value={receipt.assignedToName}
                        isAr={isAr}
                      />
                      <ReceiptRow
                        label={isAr ? "اسم العميل" : "Customer Name"}
                        value={receipt.customerName}
                        isAr={isAr}
                      />
                      <ReceiptRow
                        label={isAr ? "الهاتف" : "Phone"}
                        value={receipt.customerPhone}

                        isAr={isAr}
                      />
                      <ReceiptRow
                        label={isAr ? "البريد الإلكتروني" : "Email"}
                        value={receipt.customerEmail}
                        isAr={isAr}
                      />
                      <ReceiptRow
                        label={isAr ? "تاريخ الإصدار" : "Issued At"}
                        value={formatIssuedAt(receipt.issuedAt, isAr)}
                        isAr={isAr}
                      />
                    </div>

                    <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-text-muted">
                      {isAr
                        ? "هذا الإيصال صادر إلكترونياً من منصة محامون البحرين."
                        : "This receipt was electronically issued by Lawyers.bh."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={downloadReceiptPdf}
                    disabled={downloading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {downloading
                      ? isAr
                        ? "جاري التحميل..."
                        : "Downloading..."
                      : isAr
                        ? "تحميل الإيصال PDF"
                        : "Download PDF"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
  window.setTimeout(() => window.print(), 100);
}}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-text-primary transition-colors hover:border-primary/30 hover:text-primary"
                  >
                    <Printer className="h-4 w-4" />
                    {isAr ? "طباعة / حفظ" : "Print / Save"}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>

            <h1 className="mb-2 text-2xl font-extrabold text-text-primary">
              {isAr ? "لم يكتمل الدفع" : "Payment not completed"}
            </h1>

            <p className="mb-3 text-text-muted">
              {isAr
                ? "يبدو أن المعاملة لم تتم. يمكنك إعادة المحاولة أو التواصل معنا."
                : "It looks like the payment didn't go through. You can retry or contact us."}
            </p>

            {status && (
              <p className="mb-2 text-xs text-text-muted/80">
                {isAr ? "الحالة" : "Status"}:{" "}
                <span className="font-mono">{status}</span>
              </p>
            )}

            {tapId && (
              <p className="mb-6 text-xs text-text-muted/80">
                {isAr ? "مرجع العملية" : "Transaction reference"}:{" "}
                <span dir="ltr" className="font-mono">
                  {tapId}
                </span>
              </p>
            )}

            {canRetryPayment && (
              <div className="mx-auto mb-5 max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-4 text-start">
                <h2 className="text-sm font-black text-amber-900">
                  {isAr ? "يمكنك إعادة الدفع لنفس الطلب" : "You can retry payment for the same booking"}
                </h2>
                <p className="mt-1 text-xs font-semibold leading-6 text-amber-800/80">
                  {isAr
                    ? "سننشئ رابط دفع جديد ونحدّث الطلب تلقائياً بعد نجاح الدفع."
                    : "We will create a new payment link and update the booking automatically after successful payment."}
                </p>

                {retryPaymentError && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {retryPaymentError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRetryPayment}
                  disabled={retryingPayment}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-black text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${retryingPayment ? "animate-spin" : ""}`} />
                  {retryingPayment
                    ? isAr
                      ? "جاري إنشاء رابط الدفع..."
                      : "Creating payment link..."
                    : isAr
                      ? "إعادة الدفع"
                      : "Retry Payment"}
                </button>
              </div>
            )}
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-primary-dark"
          >
            <ArrowLeft size={16} className="rtl:rotate-180" />
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </Link>
        </div>
      </motion.div>

      <style jsx global>{`
  @media print {
    @page {
      size: A4;
      margin: 12mm;
    }

    html,
    body {
      background: #ffffff !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
    }

    body * {
      visibility: hidden !important;
    }

    #receipt-print-area,
    #receipt-print-area * {
      visibility: visible !important;
    }

    #receipt-print-area {
      position: absolute !important;
      inset: 0 auto auto 0 !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      box-shadow: none !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 0 !important;
      background: #ffffff !important;
    }

    header,
    footer,
    nav,
    iframe,
    script,
    #yourgpt_root,
    [id*="yourgpt"],
    [class*="yourgpt"],
    [id*="ygpt"],
    [class*="ygpt"],
    .ygpts-widgetBtn {
      display: none !important;
      visibility: hidden !important;
    }
  }
`}</style>
    </div>
  );
}
