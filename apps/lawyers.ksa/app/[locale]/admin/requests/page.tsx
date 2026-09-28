import { db, schema } from "@/lib/db/client";
import { and, desc, eq } from "drizzle-orm";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Search } from "lucide-react";
import AdminLogoutButton from "@/components/admin/AdminLogoutButton";
import { requireAdminPermission } from "@/lib/auth/admin-access";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

type UnifiedRequest = {
  id: string;
  reference: string;
  source: "emergency" | "booking";
  type: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  providerName: string;
  paymentStatus: string;
  requestStatus: string;
  createdAt: Date;
};

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "red" | "amber" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : tone === "red"
        ? "border-red-100 bg-red-50 text-red-700"
        : tone === "amber"
          ? "border-amber-100 bg-amber-50 text-amber-700"
          : tone === "blue"
            ? "border-blue-100 bg-blue-50 text-blue-700"
            : "border-[#E6EAF0] bg-white text-[#082B67]";

  return (
    <div className={`rounded-3xl border p-4 shadow-[0_10px_28px_rgba(7,17,31,0.035)] ${toneClass}`}>
      <p className="text-xs font-extrabold opacity-70">{label}</p>
      <p className="mt-1 text-3xl font-black leading-none">{value}</p>
    </div>
  );
}

function normalizeFilterText(value: string) {
  return value.trim().toLowerCase();
}

function formatDate(value: Date | string, isAr: boolean) {
  return new Intl.DateTimeFormat(isAr ? "ar-SA" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCaseType(value: string, isAr: boolean) {
  const labels: Record<string, { ar: string; en: string }> = {
    emergency_arrest: {
      ar: "توقيف / قبض طارئ",
      en: "Emergency Arrest",
    },
    emergency_search: {
      ar: "تفتيش طارئ",
      en: "Emergency Search",
    },
    emergency_travel_ban: {
      ar: "منع سفر طارئ",
      en: "Emergency Travel Ban",
    },
    emergency_evidence: {
      ar: "إثبات حالة / دليل",
      en: "Emergency Evidence",
    },
    emergency_report: {
      ar: "بلاغ طارئ",
      en: "Emergency Report",
    },
    emergency_consultation: {
      ar: "استشارة طارئة",
      en: "Emergency Consultation",
    },
  };

  return labels[value]?.[isAr ? "ar" : "en"] ?? value;
}

function formatBookingType(service: string, consultationType: string, isAr: boolean) {
  const consultationLabels: Record<string, { ar: string; en: string }> = {
    "virtual legal advice & guidance": {
      ar: "التوجيه والإرشاد القانوني الافتراضي",
      en: "Virtual Legal Advice & Guidance",
    },
    "voice call": {
      ar: "مكالمة صوتية",
      en: "Voice Call",
    },
    "whatsapp consultation": {
      ar: "استشارة عبر واتساب",
      en: "WhatsApp Consultation",
    },
    "video call": {
      ar: "مكالمة فيديو",
      en: "Video Call",
    },
    "office visit": {
      ar: "زيارة المكتب",
      en: "Office Visit",
    },
    online: {
      ar: "استشارة عبر الإنترنت",
      en: "Online Consultation",
    },
    phone: {
      ar: "مكالمة صوتية",
      en: "Voice Call",
    },
    whatsapp: {
      ar: "استشارة عبر واتساب",
      en: "WhatsApp Consultation",
    },
    video: {
      ar: "مكالمة فيديو",
      en: "Video Call",
    },
    office: {
      ar: "زيارة المكتب",
      en: "Office Visit",
    },
    service_request: {
      ar: "طلب خدمة قانونية",
      en: "Legal Service Request",
    },
  };

  const normalizedConsultation = consultationType.trim().toLowerCase();
  const formattedConsultation =
    consultationLabels[normalizedConsultation]?.[isAr ? "ar" : "en"] ||
    consultationType;

  return service ? `${service} - ${formattedConsultation}` : formattedConsultation;
}

function formatPaymentStatus(value: string, isAr: boolean) {
  const normalized = value.trim().toLowerCase();

  const labels: Record<string, { ar: string; en: string; className: string }> = {
    pending: {
      ar: "بانتظار الدفع",
      en: "Pending",
      className: "bg-amber-50 text-amber-700",
    },
    pending_payment: {
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

function formatRequestStatus(value: string, source: UnifiedRequest["source"], isAr: boolean) {
  const normalized = value.trim().toLowerCase();

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
    pending_review: {
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

  const fallback =
    source === "booking"
      ? isAr
        ? "طلب حجز"
        : "Booking Request"
      : isAr
        ? "طلب طارئ"
        : "Emergency Request";

  const item = labels[normalized];

  return {
    label: item?.[isAr ? "ar" : "en"] ?? (value || fallback),
    className: item?.className ?? "bg-primary/10 text-primary",
  };
}

function formatSource(source: UnifiedRequest["source"], isAr: boolean) {
  if (source === "booking") {
    return isAr ? "حجز استشارة" : "Booking";
  }

  return isAr ? "طلب طارئ" : "Emergency";
}

function makeBookingReference(id: string) {
  return `BK-${id.slice(0, 8).toUpperCase()}`;
}

function getProviderName(params: {
  isAr: boolean;
  assignmentMode?: string | null;
  selectedOfficeName?: string | null;
  selectedLawyerName?: string | null;
  providerNameAr?: string | null;
  providerNameEn?: string | null;
  fallbackEmail?: string | null;
}) {
  const {
    isAr,
    assignmentMode,
    selectedOfficeName,
    selectedLawyerName,
    providerNameAr,
    providerNameEn,
    fallbackEmail,
  } = params;

  if (assignmentMode === "office") {
    return selectedOfficeName || fallbackEmail || "—";
  }

  return (
    (isAr ? providerNameAr : providerNameEn) ||
    providerNameAr ||
    providerNameEn ||
    selectedLawyerName ||
    fallbackEmail ||
    "—"
  );
}

export default async function AdminRequestsPage({ params }: Props) {
  const { locale } = await params;
  if (!(await requireAdminPermission("manage_requests"))) redirect(`/${locale}/admin`);
  setRequestLocale(locale);

  const isAr = locale === "ar";

  const [emergencyRequests, bookingRequests] = await Promise.all([
    db
      .select({
        id: schema.emergencyRequests.id,
        caseRef: schema.emergencyRequests.caseRef,
        caseType: schema.emergencyRequests.caseType,
        contactName: schema.emergencyRequests.contactName,
        contactPhone: schema.emergencyRequests.contactPhone,
        paymentStatus: schema.emergencyRequests.paymentStatus,
        serviceStatus: schema.emergencyRequests.serviceStatus,
        providerNameAr: schema.saudiLawyers.fullNameAr,
        providerNameEn: schema.saudiLawyers.fullNameEn,
        createdAt: schema.emergencyRequests.createdAt,
      })
      .from(schema.emergencyRequests)
      .leftJoin(
        schema.saudiLawyers,
        and(
          eq(
            schema.emergencyRequests.assignedLawyerId,
            schema.saudiLawyers.id,
          ),
          eq(
            schema.emergencyRequests.countryCode,
            schema.saudiLawyers.countryCode,
          ),
        ),
      )
      .orderBy(desc(schema.emergencyRequests.createdAt)),

    db
      .select({
        id: schema.bookingRequests.id,
        service: schema.bookingRequests.service,
        consultationType: schema.bookingRequests.consultationType,
        assignmentMode: schema.bookingRequests.assignmentMode,
        selectedOfficeName: schema.bookingRequests.selectedOfficeName,
        selectedLawyerName: schema.bookingRequests.selectedLawyerName,
        assignedToEmail: schema.bookingRequests.assignedToEmail,
        customerName: schema.bookingRequests.customerName,
        customerPhone: schema.bookingRequests.customerPhone,
        customerEmail: schema.bookingRequests.customerEmail,
        paymentStatus: schema.bookingRequests.paymentStatus,
        adminStatus: schema.bookingRequests.adminStatus,
        providerNameAr: schema.saudiLawyers.fullNameAr,
        providerNameEn: schema.saudiLawyers.fullNameEn,
        createdAt: schema.bookingRequests.createdAt,
      })
      .from(schema.bookingRequests)
      .leftJoin(
        schema.saudiLawyers,
        and(
          eq(
            schema.bookingRequests.selectedLawyerId,
            schema.saudiLawyers.id,
          ),
          eq(
            schema.bookingRequests.countryCode,
            schema.saudiLawyers.countryCode,
          ),
        ),
      )
      .orderBy(desc(schema.bookingRequests.createdAt)),
  ]);

  const requests: UnifiedRequest[] = [
    ...emergencyRequests.map((request) => ({
      id: request.id,
      reference: request.caseRef,
      source: "emergency" as const,
      type: formatCaseType(request.caseType, isAr),
      clientName: request.contactName,
      clientPhone: request.contactPhone,
      clientEmail: "—",
      providerName:
        (isAr ? request.providerNameAr : request.providerNameEn) ||
        request.providerNameAr ||
        request.providerNameEn ||
        "—",
      paymentStatus: request.paymentStatus,
      requestStatus: request.serviceStatus,
      createdAt: request.createdAt,
    })),

    ...bookingRequests.map((request) => ({
      id: request.id,
      reference: makeBookingReference(request.id),
      source: "booking" as const,
      type: formatBookingType(request.service, request.consultationType, isAr),
      clientName: request.customerName,
      clientPhone: request.customerPhone,
      clientEmail: request.customerEmail,
      providerName: getProviderName({
        isAr,
        assignmentMode: request.assignmentMode,
        selectedOfficeName: request.selectedOfficeName,
        selectedLawyerName: request.selectedLawyerName,
        providerNameAr: request.providerNameAr,
        providerNameEn: request.providerNameEn,
        fallbackEmail: request.assignedToEmail,
      }),
      paymentStatus: request.paymentStatus,
      requestStatus: request.adminStatus,
      createdAt: request.createdAt,
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const paidStatuses = new Set(["paid", "success", "captured"]);
  const requestCounts = {
    all: requests.length,
    booking: requests.filter((request) => request.source === "booking").length,
    emergency: requests.filter((request) => request.source === "emergency").length,
    paid: requests.filter((request) =>
      paidStatuses.has(normalizeFilterText(request.paymentStatus)),
    ).length,
    pending: requests.filter((request) =>
      normalizeFilterText(request.requestStatus).includes("pending"),
    ).length,
    completed: requests.filter((request) =>
      normalizeFilterText(request.requestStatus).includes("completed"),
    ).length,
  };

  return (
    <main className="min-h-screen bg-[#F7F8FA] px-5 py-10">
      <div className="mx-auto max-w-[1350px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-extrabold text-text-primary shadow-sm transition-colors hover:border-primary/30 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
            {isAr ? "رجوع للوحة التحكم" : "Back to Dashboard"}
          </Link>

          <AdminLogoutButton />
        </div>

        <div className="mb-6 rounded-3xl bg-[#006C32] p-7 text-white shadow-xl">
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            {isAr ? "طلبات العملاء" : "Client Requests"}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/65">
            {isAr
              ? "عرض جميع طلبات الطوارئ وحجوزات الاستشارات. يتم التحكم بالحالة من صفحة تفاصيل الطلب."
              : "View all emergency requests and consultation bookings. Status control is available from the request details page."}
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard label={isAr ? "الإجمالي" : "Total"} value={requestCounts.all} />
          <StatCard label={isAr ? "الحجوزات" : "Bookings"} value={requestCounts.booking} tone="blue" />
          <StatCard label={isAr ? "الطوارئ" : "Emergency"} value={requestCounts.emergency} tone="red" />
          <StatCard label={isAr ? "مدفوع" : "Paid"} value={requestCounts.paid} tone="green" />
          <StatCard label={isAr ? "بانتظار" : "Pending"} value={requestCounts.pending} tone="amber" />
          <StatCard label={isAr ? "مكتمل" : "Completed"} value={requestCounts.completed} tone="green" />
        </div>

        <div className="mb-4 flex flex-wrap gap-2" data-admin-request-filters>
          {[
            { key: "all", ar: "الكل", en: "All" },
            { key: "booking", ar: "الحجوزات", en: "Bookings" },
            { key: "emergency", ar: "الطوارئ", en: "Emergency" },
            { key: "paid", ar: "مدفوع", en: "Paid" },
            { key: "pending", ar: "بانتظار", en: "Pending" },
            { key: "completed", ar: "مكتمل", en: "Completed" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              data-admin-filter={item.key}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                item.key === "all"
                  ? "border-primary bg-primary text-white"
                  : "border-gray-200 bg-white text-text-muted hover:text-text-primary"
              }`}
            >
              {isAr ? item.ar : item.en}
            </button>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="search"
              data-admin-request-search
              placeholder={
                isAr
                  ? "بحث برقم الطلب، العميل، الهاتف، مقدم الخدمة، نوع القضية..."
                  : "Search reference, client, phone, provider, service..."
              }
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pe-4 ps-10 text-sm font-bold text-text-primary outline-none transition focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-[0_18px_50px_rgba(7,17,31,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-gray-50 text-text-muted">
                <tr>
                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "رقم الطلب" : "Reference"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "نوع الطلب" : "Request Type"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "الخدمة / القضية" : "Service / Case"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "بيانات العميل" : "Client Details"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "مقدم الخدمة" : "Service Provider"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "الدفع" : "Payment"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "الحالة" : "Status"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "التاريخ" : "Date"}
                  </th>

                  <th className="px-4 py-4 text-start font-extrabold">
                    {isAr ? "الإجراء" : "Action"}
                  </th>
                </tr>
              </thead>

              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-10 text-center text-text-muted"
                    >
                      {isAr ? "لا توجد طلبات حالياً" : "No requests found"}
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => {
                    const paymentStatus = formatPaymentStatus(
                      request.paymentStatus,
                      isAr,
                    );

                    const requestStatus = formatRequestStatus(
                      request.requestStatus,
                      request.source,
                      isAr,
                    );

                    return (
                      <tr
                        key={`${request.source}-${request.id}`}
                        data-admin-request-row
                        data-source={request.source}
                        data-payment={normalizeFilterText(request.paymentStatus)}
                        data-status={normalizeFilterText(request.requestStatus)}
                        data-search={[
                          request.reference,
                          request.source,
                          request.type,
                          request.clientName,
                          request.clientPhone,
                          request.clientEmail,
                          request.providerName,
                          request.paymentStatus,
                          request.requestStatus,
                          formatDate(request.createdAt, isAr),
                        ]
                          .join(" ")
                          .toLowerCase()}
                        className="border-t border-gray-100 align-top"
                      >
                        <td className="px-4 py-4 font-bold text-text-primary">
                          {request.reference}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              request.source === "booking"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {formatSource(request.source, isAr)}
                          </span>
                        </td>

                        <td className="max-w-[240px] px-4 py-4 text-text-muted">
                          <span className="line-clamp-3">{request.type}</span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-bold text-text-primary">
                            {request.clientName}
                          </div>

                          <div className="mt-1 text-xs text-text-muted" dir="ltr">
                            {request.clientPhone}
                          </div>

                          <div className="mt-1 max-w-[220px] truncate text-xs text-text-muted" dir="ltr">
                            {request.clientEmail}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="max-w-[230px] truncate font-bold text-text-primary">
                            {request.providerName}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${paymentStatus.className}`}
                          >
                            {paymentStatus.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${requestStatus.className}`}
                          >
                            {requestStatus.label}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-text-muted">
                          {formatDate(request.createdAt, isAr)}
                        </td>

                        <td className="px-4 py-4">
                          <a
                            href={`/${locale}/admin/requests/${request.source}/${request.id}`}
                            className="inline-flex rounded-full bg-primary px-4 py-2 text-xs font-extrabold text-white transition-colors hover:bg-primary-dark"
                          >
                            {isAr ? "تفاصيل الطلب" : "Details"}
                          </a>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>


        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const root = document.currentScript?.closest('main');
  if (!root) return;

  const filterButtons = Array.from(root.querySelectorAll('[data-admin-filter]'));
  const searchInput = root.querySelector('[data-admin-request-search]');
  const rows = Array.from(root.querySelectorAll('[data-admin-request-row]'));
  let activeFilter = 'all';

  function setActiveButton() {
    filterButtons.forEach((button) => {
      const isActive = button.getAttribute('data-admin-filter') === activeFilter;
      button.className = isActive
        ? 'rounded-full border border-primary bg-primary px-4 py-2 text-sm font-bold text-white transition'
        : 'rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-text-muted transition hover:text-text-primary';
    });
  }

  function matchesFilter(row) {
    const source = row.getAttribute('data-source') || '';
    const payment = row.getAttribute('data-payment') || '';
    const status = row.getAttribute('data-status') || '';

    if (activeFilter === 'all') return true;
    if (activeFilter === 'booking' || activeFilter === 'emergency') return source === activeFilter;
    if (activeFilter === 'paid') return ['paid', 'success', 'captured'].includes(payment);
    if (activeFilter === 'pending') return status.includes('pending') || payment.includes('pending');
    if (activeFilter === 'completed') return status.includes('completed');

    return true;
  }

  function applyFilters() {
    const query = String(searchInput?.value || '').trim().toLowerCase();

    rows.forEach((row) => {
      const text = row.getAttribute('data-search') || '';
      const visible = matchesFilter(row) && (!query || text.includes(query));
      row.style.display = visible ? '' : 'none';
    });
  }

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.getAttribute('data-admin-filter') || 'all';
      setActiveButton();
      applyFilters();
    });
  });

  searchInput?.addEventListener('input', applyFilters);
})();
            `.trim(),
          }}
        />
      </div>
    </main>
  );
}
