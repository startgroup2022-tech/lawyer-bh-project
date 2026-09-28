"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  Hash,
  Loader2,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";

type Source = "booking" | "emergency";

type ProviderRequest = {
  id: string;
  reference: string;
  source: Source;

  serviceType: string | null;
  consultationType?: string | null;
  consultationMethod?: string | null;
  consultationPrice?: string | null;
  durationMinutes?: number | null;
  videoProvider?: string | null;

  appointmentDate?: string | null;
  appointmentTime?: string | null;

  assignmentMode?: string | null;
  selectedOfficeName?: string | null;
  selectedLawyerName?: string | null;
  assignedToEmail?: string | null;

  clientName: string | null;
  clientPhone: string | null;
  clientEmail?: string | null;
  clientIdNumber?: string | null;
  clientMessage?: string | null;

  locationAddress?: string | null;
  locationCoordinates?: string | null;

  status: string | null;
  paymentStatus?: string | null;
  tapStatus?: string | null;
  paymentRef?: string | null;
  amount: string | number | null;

  createdAt: string;
  updatedAt?: string | null;
  responseTimestamp?: string | null;
  arrivalTimestamp?: string | null;
  completedTimestamp?: string | null;

  providerName?: string | null;
  providerEmail?: string | null;
  providerPhone?: string | null;
  providerRegistrationNo?: string | null;
};

type ApiResponse = {
  ok?: boolean;
  request?: ProviderRequest;
  error?: string;
};

const statusLabels: Record<string, { ar: string; en: string; className: string }> = {
  pending: {
    ar: "بانتظار",
    en: "Pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  pending_review: {
    ar: "بانتظار المراجعة",
    en: "Pending Review",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    ar: "مقبول",
    en: "Approved",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  accepted: {
    ar: "مقبول",
    en: "Accepted",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  mobilizing: {
    ar: "جاري التحرك",
    en: "Mobilizing",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  arrived: {
    ar: "تم الوصول",
    en: "Arrived",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  completed: {
    ar: "مكتمل",
    en: "Completed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  cancelled: {
    ar: "ملغي",
    en: "Cancelled",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  rejected: {
    ar: "مرفوض",
    en: "Rejected",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  disputed: {
    ar: "نزاع",
    en: "Disputed",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  paid: {
    ar: "مدفوع",
    en: "Paid",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  captured: {
    ar: "مدفوع",
    en: "Captured",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  pending_payment: {
    ar: "بانتظار الدفع",
    en: "Pending Payment",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  failed: {
    ar: "فشل الدفع",
    en: "Failed",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  refunded: {
    ar: "مسترجع",
    en: "Refunded",
    className: "border-slate-200 bg-slate-50 text-slate-700",
  },
};

function getStatusLabel(value: string | null | undefined, isAr: boolean) {
  const normalized = String(value ?? "").trim().toLowerCase();
  const item = statusLabels[normalized];

  return {
    label: item?.[isAr ? "ar" : "en"] ?? value ?? "-",
    className: item?.className ?? "border-gray-200 bg-gray-50 text-text-muted",
  };
}

function formatDate(value: string | Date | null | undefined, isAr: boolean) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Riyadh",
  }).format(date);
}

function formatRequestDate(date: string | null | undefined, time: string | null | undefined) {
  if (!date && !time) return "-";
  if (!date) return time || "-";
  if (!time) return date;
  return `${date} - ${time}`;
}

function formatAmount(value: string | number | null | undefined, isAr: boolean) {
  if (value === null || value === undefined || value === "") return "-";

  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return isAr ? `${amount.toFixed(2)} ر.س` : `${amount.toFixed(2)} SAR`;
}

function makeWhatsappUrl(phone: string | null | undefined) {
  const clean = String(phone ?? "").replace(/[^0-9]/g, "");
  if (!clean) return "";

  const normalized = clean.startsWith("966") ? clean : `966${clean}`;
  return `https://wa.me/${normalized}`;
}

function formatSource(source: Source, isAr: boolean) {
  return source === "booking"
    ? isAr
      ? "حجز استشارة"
      : "Booking"
    : isAr
      ? "طلب طارئ"
      : "Emergency";
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function canApprove(request: ProviderRequest) {
  const status = normalizeStatus(request.status);

  if (request.source === "booking") {
    return status === "pending" || status === "pending_review";
  }

  return status === "pending" || status === "accepted";
}

function canComplete(request: ProviderRequest) {
  const status = normalizeStatus(request.status);

  if (request.source === "booking") {
    return status === "approved";
  }

  return status === "mobilizing" || status === "arrived" || status === "accepted";
}

export default function Content({
  source,
  requestId,
}: {
  source: Source;
  requestId: string;
}) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const [request, setRequest] = useState<ProviderRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<"approve" | "complete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadRequest = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await fetch(`/api/provider/requests/${source}/${requestId}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || !data.ok || !data.request) {
        throw new Error(data.error || "Could not load request");
      }

      setRequest(data.request);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر تحميل تفاصيل الطلب"
            : "Could not load request details",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [source, requestId, isAr]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  async function runAction(action: "approve" | "complete") {
    if (!request || actionLoading) return;

    const confirmed = window.confirm(
      action === "approve"
        ? isAr
          ? "هل أنت متأكد من الموافقة على هذا الطلب؟"
          : "Are you sure you want to approve this request?"
        : isAr
          ? "هل أنت متأكد من تحويل الطلب إلى مكتمل؟"
          : "Are you sure you want to mark this request as completed?",
    );

    if (!confirmed) return;

    setActionLoading(action);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/provider/requests/${source}/${requestId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not update request");
      }

      setSuccess(
        action === "approve"
          ? isAr
            ? "تمت الموافقة على الطلب بنجاح"
            : "Request approved successfully"
          : isAr
            ? "تم تحويل الطلب إلى مكتمل بنجاح"
            : "Request marked as completed successfully",
      );

      await loadRequest(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isAr
            ? "تعذر تحديث حالة الطلب"
            : "Could not update request status",
      );
    } finally {
      setActionLoading(null);
    }
  }

  const title = source === "booking"
    ? isAr
      ? "تفاصيل طلب الحجز"
      : "Booking Request Details"
    : isAr
      ? "تفاصيل الطلب الطارئ"
      : "Emergency Request Details";

  const status = useMemo(() => getStatusLabel(request?.status, isAr), [request?.status, isAr]);
  const paymentStatus = useMemo(
    () => getStatusLabel(request?.paymentStatus || request?.tapStatus, isAr),
    [request?.paymentStatus, request?.tapStatus, isAr],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
        <div className="mx-auto max-w-6xl rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-text-muted">
            {isAr ? "جاري تحميل تفاصيل الطلب..." : "Loading request details..."}
          </p>
        </div>
      </main>
    );
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-100 bg-white p-10 text-center shadow-sm">
          <XCircle className="mx-auto mb-3 h-12 w-12 text-red-600" />
          <h1 className="text-xl font-extrabold text-text-primary">
            {isAr ? "تعذر عرض الطلب" : "Could not show request"}
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {error || (isAr ? "الطلب غير موجود أو غير مرتبط بحسابك." : "The request was not found or is not assigned to your account.")}
          </p>
          <a
            href={`/${locale}/provider-dashboard`}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-extrabold text-white hover:bg-primary-dark"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {isAr ? "العودة للطلبات" : "Back to requests"}
          </a>
        </div>
      </main>
    );
  }

  const whatsappUrl = makeWhatsappUrl(request.clientPhone);

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <a
            href={`/${locale}/provider-dashboard`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {isAr ? "العودة للطلبات" : "Back to requests"}
          </a>

          <button
            type="button"
            onClick={() => loadRequest(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-muted shadow-sm transition hover:border-primary/30 hover:text-primary disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {isAr ? "تحديث" : "Refresh"}
          </button>
        </div>

        <div className="mb-6 overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-primary-dark via-primary to-primary-dark p-7 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                  <ShieldCheck className="h-4 w-4" />
                  {formatSource(request.source, isAr)}
                </div>
                <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
                <p className="mt-2 text-sm font-bold text-white/70" dir="ltr">
                  {request.reference || request.id}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${paymentStatus.className}`}>
                  {paymentStatus.label}
                </span>
                <span className={`rounded-full border px-3 py-1 text-xs font-extrabold ${status.className}`}>
                  {status.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
          <section className="space-y-5">
            <InfoSection
              title={isAr ? "بيانات الطلب" : "Request Information"}
              icon={FileText}
              items={[
                { label: isAr ? "رقم الطلب" : "Reference", value: request.reference || request.id, dir: "ltr" },
                { label: isAr ? "نوع الطلب" : "Request Type", value: formatSource(request.source, isAr) },
                { label: isAr ? "الخدمة / القضية" : "Service / Case", value: request.serviceType },
                { label: isAr ? "نوع الاستشارة" : "Consultation Type", value: request.consultationType },
                { label: isAr ? "طريقة الاستشارة" : "Consultation Method", value: request.consultationMethod },
                { label: isAr ? "سعر الاستشارة" : "Consultation Price", value: request.consultationPrice },
                { label: isAr ? "المدة" : "Duration", value: request.durationMinutes ? `${request.durationMinutes} ${isAr ? "دقيقة" : "minutes"}` : "" },
                { label: isAr ? "مزود الفيديو" : "Video Provider", value: request.videoProvider },
                { label: isAr ? "الموعد" : "Appointment", value: formatRequestDate(request.appointmentDate, request.appointmentTime), dir: "ltr" },
                { label: isAr ? "تاريخ الإنشاء" : "Created At", value: formatDate(request.createdAt, isAr) },
                { label: isAr ? "آخر تحديث" : "Updated At", value: formatDate(request.updatedAt, isAr) },
              ]}
            />

            <InfoSection
              title={isAr ? "بيانات العميل" : "Client Information"}
              icon={User}
              items={[
                { label: isAr ? "اسم العميل" : "Client Name", value: request.clientName },
                { label: isAr ? "الهاتف" : "Phone", value: request.clientPhone, dir: "ltr" },
                { label: isAr ? "البريد الإلكتروني" : "Email", value: request.clientEmail, dir: "ltr" },
                { label: isAr ? "الرقم الشخصي" : "ID Number", value: request.clientIdNumber, dir: "ltr" },
                { label: isAr ? "رسالة العميل" : "Client Message", value: request.clientMessage },
              ]}
            />

            {request.source === "emergency" && (
              <InfoSection
                title={isAr ? "موقع الطلب" : "Request Location"}
                icon={Hash}
                items={[
                  { label: isAr ? "العنوان" : "Address", value: request.locationAddress },
                  { label: isAr ? "الإحداثيات" : "Coordinates", value: request.locationCoordinates, dir: "ltr" },
                ]}
              />
            )}

            <InfoSection
              title={isAr ? "بيانات الدفع" : "Payment Information"}
              icon={CreditCard}
              items={[
                { label: isAr ? "حالة الدفع" : "Payment Status", value: paymentStatus.label },
                { label: isAr ? "Tap Status" : "Tap Status", value: request.tapStatus, dir: "ltr" },
                { label: isAr ? "مرجع الدفع" : "Payment Ref", value: request.paymentRef, dir: "ltr" },
                { label: isAr ? "المبلغ" : "Amount", value: formatAmount(request.amount, isAr), dir: "ltr" },
              ]}
            />

            <InfoSection
              title={isAr ? "مقدم الخدمة" : "Service Provider"}
              icon={ShieldCheck}
              items={[
                { label: isAr ? "اسم مقدم الخدمة" : "Provider Name", value: request.providerName || request.selectedLawyerName || request.selectedOfficeName },
                { label: isAr ? "نوع الإسناد" : "Assignment Mode", value: request.assignmentMode },
                { label: isAr ? "البريد" : "Email", value: request.providerEmail || request.assignedToEmail, dir: "ltr" },
                { label: isAr ? "الهاتف" : "Phone", value: request.providerPhone, dir: "ltr" },
                { label: isAr ? "رقم القيد" : "Registration No.", value: request.providerRegistrationNo, dir: "ltr" },
              ]}
            />

            <InfoSection
              title={isAr ? "التوقيتات" : "Timeline"}
              icon={Clock}
              items={[
                { label: isAr ? "وقت الموافقة / الاستجابة" : "Approved / Response Time", value: formatDate(request.responseTimestamp, isAr) },
                { label: isAr ? "وقت الوصول" : "Arrival Time", value: formatDate(request.arrivalTimestamp, isAr) },
                { label: isAr ? "وقت الإكمال" : "Completed Time", value: formatDate(request.completedTimestamp, isAr) },
              ]}
            />
          </section>

          <aside className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(7,17,31,0.06)] lg:sticky lg:top-6 lg:self-start">
            <h2 className="text-lg font-extrabold text-text-primary">
              {isAr ? "إجراءات الطلب" : "Request Actions"}
            </h2>

            <p className="mt-2 text-sm leading-6 text-text-muted">
              {isAr
                ? "يمكنك الموافقة على الطلب ثم تحويله إلى مكتمل بعد الانتهاء من الخدمة."
                : "You can approve the request, then mark it as completed after the service is done."}
            </p>

            <div className="mt-5 grid gap-3">
              {canApprove(request) && (
                <button
                  type="button"
                  onClick={() => runAction("approve")}
                  disabled={!!actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {isAr ? "الموافقة على الطلب" : "Approve Request"}
                </button>
              )}

              {canComplete(request) && (
                <button
                  type="button"
                  onClick={() => runAction("complete")}
                  disabled={!!actionLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-extrabold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading === "complete" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  {isAr ? "إكمال الطلب" : "Complete Request"}
                </button>
              )}

              {!canApprove(request) && !canComplete(request) && (
                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm font-bold leading-6 text-text-muted">
                  {normalizeStatus(request.status) === "completed"
                    ? isAr
                      ? "هذا الطلب مكتمل ولا توجد إجراءات متاحة."
                      : "This request is completed and has no available actions."
                    : isAr
                      ? "لا توجد إجراءات متاحة للحالة الحالية."
                      : "No actions are available for the current status."}
                </div>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-extrabold text-text-primary transition hover:border-primary/30 hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                  {isAr ? "تواصل واتساب" : "WhatsApp Client"}
                </a>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-800">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                <span>
                  {isAr
                    ? "الأزرار تظهر حسب حالة الطلب الحالية فقط."
                    : "Buttons appear based on the current request status only."}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: typeof FileText;
  items: Array<{
    label: string;
    value: unknown;
    dir?: "ltr" | "rtl";
  }>;
}) {
  const visibleItems = items.filter((item) => String(item.value ?? "").trim());

  if (visibleItems.length === 0) return null;

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/[0.07] text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-lg font-extrabold text-text-primary">{title}</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <DetailItem
            key={item.label}
            label={item.label}
            value={item.value}
            dir={item.dir}
          />
        ))}
      </div>
    </section>
  );
}

function DetailItem({
  label,
  value,
  dir,
}: {
  label: string;
  value: unknown;
  dir?: "ltr" | "rtl";
}) {
  const text = String(value ?? "").trim() || "-";

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs font-extrabold text-text-muted">{label}</p>
      <p
        dir={dir}
        className={`mt-1 break-words text-sm font-bold text-text-primary ${dir === "ltr" ? "font-sans" : ""}`}
      >
        {text}
      </p>
    </div>
  );
}
